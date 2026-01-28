const fs = require('fs');

// Function to recursively delete "auth" key from an object and filter out non-2xx responses
const deleteAuthKey = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      deleteAuthKey(obj[key]); // Recursive call for nested objects
    
      // Keep only responses with status codes in the 200-299 range
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
        obj[key] = true
      }
    }
  }
};

const args = process.argv;

// Read the JSON file
fs.readFile(args[2], 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  try {
    // Parse the JSON content
    const jsonObject = JSON.parse(data);



    // Delete all occurrences of the key "auth"
    deleteAuthKey(jsonObject);
    jsonObject.auth = JSON.parse(fs.readFileSync('postman-script/base-auth.json', 'utf8'));
    jsonObject.event = JSON.parse(fs.readFileSync('postman-script/pre-script.json', 'utf8'));
    if (args[2].includes("beta")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-beta.json', 'utf8'));
    } else if (args[2].includes("nerm-v2025")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-nerm-v2025.json', 'utf8'));
    } else if (args[2].includes("nerm")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-nerm.json', 'utf8'));
    } else if (args[2].includes("v3")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-v3.json', 'utf8'));
    } else if (args[2].includes("v2024")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-v2024.json', 'utf8'));
    } else if (args[2].includes("v2025")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-v2025.json', 'utf8'));
    } else if (args[2].includes("v2026")) {
      jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable-v2026.json', 'utf8'));
    } 


    
    // Write the modified JSON content back to the file
    // Use the line below if you need it to be in a format that can be uploaded to postman
    //fs.writeFile(args[2], JSON.stringify({"collection": jsonObject}, null, 2), (writeErr) => {
    fs.writeFile(args[2], JSON.stringify(jsonObject, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error writing the file:', writeErr);
      } else {
        console.log('Auth keys deleted, non-2xx responses removed, and file updated successfully.');
      }
    });
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});