#!/usr/bin/env node

/**
 * Script to build Postman collections from cloud-api-client-common repository
 * This allows testing changes made in cloud-api-client-common before they're merged
 * 
 * Usage: node scripts/build-from-common.js [version]
 * 
 * Examples:
 *   node scripts/build-from-common.js beta
 *   node scripts/build-from-common.js v3
 *   node scripts/build-from-common.js oauth
 *   node scripts/build-from-common.js all (default)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COMMON_REPO_PATH = 'cloud-api-client-common/api-specs/src/main/yaml';
const TEMP_SPECS_DIR = 'scripts/temp-specs';
const TEMP_COLLECTIONS_DIR = 'scripts/temp-collections';

const VERSIONS = [
  { name: 'v3', source: 'sailpoint-api.v3.yaml', output: 'sailpoint-api-v3-test.json', variable: 'variable-v3.json' },
  { name: 'beta', source: 'sailpoint-api.beta.yaml', output: 'sailpoint-api-beta-test.json', variable: 'variable-beta.json' },
  { name: 'v2024', source: 'sailpoint-api.v2024.yaml', output: 'sailpoint-api-v2024-test.json', variable: 'variable-v2024.json' },
  { name: 'v2025', source: 'sailpoint-api.v2025.yaml', output: 'sailpoint-api-v2025-test.json', variable: 'variable-v2025.json' },
  { name: 'v2026', source: 'sailpoint-api.v2026.yaml', output: 'sailpoint-api-v2026-test.json', variable: 'variable-v2026.json' },
  { name: 'oauth', source: 'sailpoint-oauth.yaml', output: 'sailpoint-api-oauth-test.json', variable: 'variable-auth.json' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Cleaned directory: ${dir}`);
  }
}

function exec(command, description) {
  console.log(`\n>>> ${description}`);
  console.log(`    ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed: ${description}`);
    throw error;
  }
}

function checkDependencies() {
  console.log('Checking dependencies...');
  try {
    execSync('redocly --version', { stdio: 'pipe' });
    console.log('✓ redocly is installed');
  } catch {
    console.error('✗ redocly is not installed. Run: npm install -g @redocly/cli');
    process.exit(1);
  }

  try {
    execSync('openapi2postmanv2 --version', { stdio: 'pipe' });
    console.log('✓ openapi-to-postmanv2 is installed');
  } catch {
    console.error('✗ openapi-to-postmanv2 is not installed. Run: npm install -g openapi-to-postmanv2');
    process.exit(1);
  }

  if (!fs.existsSync(COMMON_REPO_PATH)) {
    console.error(`✗ cloud-api-client-common not found at: ${COMMON_REPO_PATH}`);
    console.error('  Make sure the repository is cloned in the expected location');
    process.exit(1);
  }
  console.log('✓ cloud-api-client-common repository found');
}

function dereferenceSpec(version) {
  const sourceSpec = path.join(COMMON_REPO_PATH, version.source);
  const outputYaml = path.join(TEMP_SPECS_DIR, `deref-${version.name}.yaml`);
  const outputJson = path.join(TEMP_SPECS_DIR, `deref-${version.name}.json`);

  if (!fs.existsSync(sourceSpec)) {
    console.log(`Skipping ${version.name}: source file not found at ${sourceSpec}`);
    return null;
  }

  console.log(`\n=== Processing ${version.name.toUpperCase()} ===`);
  
  exec(
    `redocly bundle ${sourceSpec} --ext yaml -o ${outputYaml}`,
    `Dereferencing ${version.name} spec to YAML`
  );
  
  exec(
    `redocly bundle ${sourceSpec} --ext json -o ${outputJson}`,
    `Dereferencing ${version.name} spec to JSON`
  );

  return { yaml: outputYaml, json: outputJson };
}

function buildPostmanCollection(version, dereferencedSpec) {
  const outputCollection = path.join(TEMP_COLLECTIONS_DIR, version.output);

  exec(
    `openapi2postmanv2 -s ${dereferencedSpec.yaml} -o ${outputCollection} -p -c postman-script/openapi2postman-config.json`,
    `Building Postman collection for ${version.name}`
  );

  return outputCollection;
}

function modifyCollection(collectionPath, version) {
  console.log(`\nModifying collection: ${collectionPath}`);
  
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  
  // Remove all auth keys and filter responses (same as modify-collection.js)
  const deleteAuthKey = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        deleteAuthKey(obj[key]);
        
        if (key === 'response' && Array.isArray(obj[key])) {
          obj[key] = obj[key].filter(response => {
            return response.code >= 200 && response.code < 300;
          });
        }
      }
      if (key === 'auth') {
        delete obj[key];
      }
      if (key === 'disabled') {
        if (obj[key] === false) {
          obj[key] = true;
        }
      }
    }
  };

  deleteAuthKey(collection);
  
  // Add auth, events, and variables
  collection.auth = JSON.parse(fs.readFileSync('postman-script/base-auth.json', 'utf8'));
  collection.event = JSON.parse(fs.readFileSync('postman-script/pre-script.json', 'utf8'));
  
  const variableFile = `postman-script/${version.variable}`;
  if (fs.existsSync(variableFile)) {
    collection.variable = JSON.parse(fs.readFileSync(variableFile, 'utf8'));
  }

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  console.log(`✓ Collection modified successfully`);
}

function main() {
  const args = process.argv.slice(2);
  const requestedVersion = args[0] || 'all';

  console.log('============================================');
  console.log('Build Postman Collections from Common Repo');
  console.log('============================================\n');

  checkDependencies();

  // Clean and create temp directories
  cleanDir(TEMP_SPECS_DIR);
  cleanDir(TEMP_COLLECTIONS_DIR);
  ensureDir(TEMP_SPECS_DIR);
  ensureDir(TEMP_COLLECTIONS_DIR);

  // Determine which versions to build
  let versionsToBuild = VERSIONS;
  if (requestedVersion !== 'all') {
    versionsToBuild = VERSIONS.filter(v => v.name === requestedVersion);
    if (versionsToBuild.length === 0) {
      console.error(`Invalid version: ${requestedVersion}`);
      console.error(`Valid versions: ${VERSIONS.map(v => v.name).join(', ')}, all`);
      process.exit(1);
    }
  }

  console.log(`Building collections for: ${versionsToBuild.map(v => v.name).join(', ')}\n`);

  // Process each version
  const results = [];
  for (const version of versionsToBuild) {
    try {
      const dereferencedSpec = dereferenceSpec(version);
      if (!dereferencedSpec) continue;

      const collectionPath = buildPostmanCollection(version, dereferencedSpec);
      modifyCollection(collectionPath, version);

      results.push({
        version: version.name,
        collection: collectionPath,
        spec: dereferencedSpec.yaml
      });
    } catch (error) {
      console.error(`\n✗ Failed to build ${version.name}: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n============================================');
  console.log('Build Summary');
  console.log('============================================\n');

  if (results.length === 0) {
    console.log('No collections were built successfully.');
  } else {
    console.log('Successfully built collections:');
    results.forEach(result => {
      console.log(`\n${result.version}:`);
      console.log(`  Collection: ${result.collection}`);
      console.log(`  Spec: ${result.spec}`);
    });

    console.log('\n\nTo import into Postman:');
    results.forEach(result => {
      console.log(`  - Import ${result.collection}`);
    });

    console.log('\n\nTo clean up temporary files:');
    console.log(`  rm -rf ${TEMP_SPECS_DIR} ${TEMP_COLLECTIONS_DIR}`);
  }
}

main();
