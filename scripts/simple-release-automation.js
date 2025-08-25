#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SimpleReleaseAutomation {
  constructor() {
    this.dereferencedDir = 'dereferenced';
    this.lastReleaseFile = '.last-release-hash';
  }

  getDereferencedFiles() {
    if (!fs.existsSync(this.dereferencedDir)) {
      return [];
    }
    
    const files = [];
    const items = fs.readdirSync(this.dereferencedDir);
    
    for (const item of items) {
      const fullPath = path.join(this.dereferencedDir, item);
      if (fs.statSync(fullPath).isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  getFileStats() {
    const files = this.getDereferencedFiles();
    const stats = {
      total: files.length,
      yaml: 0,
      json: 0,
      other: 0,
      totalSize: 0
    };
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const fileStats = fs.statSync(file);
      
      stats.totalSize += fileStats.size;
      
      if (ext === '.yaml' || ext === '.yml') {
        stats.yaml++;
      } else if (ext === '.json') {
        stats.json++;
      } else {
        stats.other++;
      }
    });
    
    return stats;
  }

  calculateDirectoryHash() {
    const files = this.getDereferencedFiles();
    if (files.length === 0) {
      return null;
    }
    
    // Create a hash based on file contents and modification times
    let hash = '';
    for (const file of files.sort()) {
      const stats = fs.statSync(file);
      const content = fs.readFileSync(file, 'utf8');
      hash += `${file}:${stats.mtime.getTime()}:${content.length}`;
    }
    
    // Simple hash function
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result = ((result << 5) - result + hash.charCodeAt(i)) & 0xffffffff;
    }
    return result.toString(16);
  }

  hasChanges() {
    const currentHash = this.calculateDirectoryHash();
    if (!currentHash) {
      return false;
    }
    
    let lastHash = null;
    if (fs.existsSync(this.lastReleaseFile)) {
      lastHash = fs.readFileSync(this.lastReleaseFile, 'utf8').trim();
    }
    
    // If no previous hash exists, assume there are changes (first run)
    if (!lastHash) {
      console.log('📝 No previous hash found, assuming changes exist');
      return true;
    }
    
    return currentHash !== lastHash;
  }

  saveCurrentHash() {
    const currentHash = this.calculateDirectoryHash();
    if (currentHash) {
      fs.writeFileSync(this.lastReleaseFile, currentHash);
    }
  }

  getReleaseVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day}-${hour}${minute}`;
  }

  generateReleaseNotes() {
    const files = this.getDereferencedFiles();
    const stats = this.getFileStats();
    const releaseVersion = this.getReleaseVersion();
    
    let notes = `Release Date: ${new Date().toISOString()}\n\n`;
    notes += `This release includes updated dereferenced API specifications.\n\n`;
    
    if (files.length > 0) {
      notes += `## Updated Specifications\n\n`;
      
      // Group files by type
      const yamlFiles = files.filter(f => f.endsWith('.yaml')).sort();
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      
      if (yamlFiles.length > 0) {
        notes += `### YAML Specifications\n\n`;
        yamlFiles.forEach(file => {
          const filename = path.basename(file);
          notes += `- \`${filename}\`\n`;
        });
        notes += `\n`;
      }
      
      if (jsonFiles.length > 0) {
        notes += `### JSON Specifications\n\n`;
        jsonFiles.forEach(file => {
          const filename = path.basename(file);
          notes += `- \`${filename}\`\n`;
        });
        notes += `\n`;
      }
      
      notes += `## File Statistics\n\n`;
      notes += `- **Total files**: ${stats.total}\n`;
      notes += `- **YAML files**: ${stats.yaml}\n`;
      notes += `- **JSON files**: ${stats.json}\n`;
      notes += `- **Other files**: ${stats.other}\n`;
      notes += `- **Total size**: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;
      
      notes += `## Download\n\n`;
      notes += `All dereferenced specifications are available as individual files in this release.\n\n`;
      
      notes += `### Individual Files\n\n`;
      notes += `#### YAML Files\n\n`;
      files.filter(f => f.endsWith('.yaml')).forEach(file => {
        const filename = path.basename(file);
        notes += `- [${filename}](https://github.com/sailpoint-oss/api-specs/releases/download/v${releaseVersion}/${filename})\n`;
      });
      notes += `#### JSON Files\n\n`;
      files.filter(f => f.endsWith('.json')).forEach(file => {
        const filename = path.basename(file);
        notes += `- [${filename}](https://github.com/sailpoint-oss/api-specs/releases/download/v${releaseVersion}/${filename})\n`;
      });
      
    } else {
      notes += `No dereferenced specifications found.\n`;
    }
    
    return notes;
  }

  async createRelease() {
    const releaseVersion = this.getReleaseVersion();
    const releaseNotes = this.generateReleaseNotes();
    const files = this.getDereferencedFiles();
    
    console.log(`🚀 Creating release ${releaseVersion}...`);
    
    // Save release notes to file
    const releaseNotesFile = `RELEASE_NOTES_${releaseVersion}.md`;
    fs.writeFileSync(releaseNotesFile, releaseNotes);
    
    try {
      // Create git tag
      execSync(`git tag -a v${releaseVersion} -m "Release ${releaseVersion}"`, { stdio: 'inherit' });
      
      // Push tag
      execSync('git push origin --tags', { stdio: 'inherit' });
      
      // Create GitHub release using gh CLI (if available)
      try {
        // Build the gh command with all files as assets
        let ghCommand = `gh release create v${releaseVersion} --title "API Specifications Release ${releaseVersion}" --notes-file ${releaseNotesFile}`;
        
        // Add each file as an asset
        for (const file of files) {
          ghCommand += ` "${file}"`;
        }
        
        console.log('📤 Creating GitHub release with assets...');
        execSync(ghCommand, { stdio: 'inherit' });
        console.log('✅ GitHub release created successfully with all assets');
        
        // Log uploaded files
            console.log('📁 Uploaded files:');
    const stats = this.getFileStats();
    files.forEach(file => {
      const filename = path.basename(file);
      const fileStats = fs.statSync(file);
      const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
      console.log(`   - ${filename} (${sizeMB} MB)`);
    });
    console.log(`📊 Total: ${stats.total} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
        
      } catch (ghError) {
        console.log('⚠️  GitHub CLI not available or failed. Manual release creation may be needed.');
        console.log(`Release notes saved to: ${releaseNotesFile}`);
        console.log('📁 Files to upload manually:');
        const stats = this.getFileStats();
        files.forEach(file => {
          const filename = path.basename(file);
          const fileStats = fs.statSync(file);
          const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
          console.log(`   - ${file} (${sizeMB} MB)`);
        });
        console.log(`📊 Total: ${stats.total} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      }
      
      // Clean up release notes file
      fs.unlinkSync(releaseNotesFile);
      
      // Save current hash
      this.saveCurrentHash();
      
      return true;
    } catch (error) {
      console.error('❌ Error creating release:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🚀 Starting Simple API Specifications Release Automation\n');
    
    // Check if dereferenced directory exists
    if (!fs.existsSync(this.dereferencedDir)) {
      console.log('⚠️  Dereferenced directory not found. No release needed.');
      return;
    }
    
    // Log current state
    const files = this.getDereferencedFiles();
    console.log(`📁 Found ${files.length} files in dereferenced directory`);
    
    if (files.length > 0) {
      console.log('📄 Files found:');
      for (const file of files) {
        const filename = path.basename(file);
        console.log(`   - ${filename}`);
      }
    }
    
    // Check for changes
    if (!this.hasChanges()) {
      console.log('✅ No changes detected in dereferenced specifications. No release needed.');
      return;
    }
    
    console.log('📝 Changes detected in dereferenced specifications. Creating release...');
    
    // Create release
    const success = await this.createRelease();
    if (success) {
      console.log('\n🎉 Release created successfully!');
    } else {
      console.error('\n❌ Release creation failed.');
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const automation = new SimpleReleaseAutomation();
  automation.run().catch(error => {
    console.error('❌ Release automation failed:', error);
    process.exit(1);
  });
}

module.exports = SimpleReleaseAutomation;
