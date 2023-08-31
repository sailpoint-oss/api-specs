const fs = require('fs');

// Function to recursively delete "auth" key from an object
const deleteAuthKey = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
        deleteAuthKey(obj[key]); // Recursive call for nested objects
        }
        if (key === 'auth') {
        delete obj[key];
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
    jsonObject.variable = JSON.parse(fs.readFileSync('postman-script/variable.json', 'utf8'));
    

    // Write the modified JSON content back to the file
    fs.writeFile(args[2], JSON.stringify(jsonObject, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error writing the file:', writeErr);
      } else {
        console.log('Auth keys deleted and file updated successfully.');
      }
    });
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});