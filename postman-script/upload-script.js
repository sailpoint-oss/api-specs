const args = process.argv;
const https = require('https');
var fs = require('fs');

async function getCollections() {
  const options = {
    method: 'GET',
    hostname: 'api.getpostman.com',
    path: '/collections/?workspace=80af54be-a333-4712-af5e-41aa9eccbdd0',
    headers: {
      'X-API-Key': args[2],
      'Content-Type': 'text/plain'
    },
    maxRedirects: 20
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const response = JSON.parse(body.toString());
        resolve(response);
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    req.end();
  });
}

async function deleteCollection(id) {
    const options = {
      method: 'DELETE',
      hostname: 'api.getpostman.com',
      path: '/collections/' + id,
      headers: {
        'X-API-Key': args[2],
        'Content-Type': 'text/plain'
      },
      maxRedirects: 20
    };
  
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks = [];
  
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
  
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const response = JSON.parse(body.toString());
          resolve(response);
        });
  
        res.on('error', (error) => {
          reject(error);
        });
      });
  
      req.end();
    });
  }


  
async function uploadCollection() {
    const options = {
      method: 'POST',
      hostname: 'api.getpostman.com',
      path: '/collections/?workspace=80af54be-a333-4712-af5e-41aa9eccbdd0',
      headers: {
        'X-API-Key': args[2],
        'Content-Type': 'application/json'
      },
      maxRedirects: 20
    };
  
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks = [];
  
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
  
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const response = JSON.parse(body.toString());
          resolve(response);
        });
  
        res.on('error', (error) => {
          reject(error);
        });
      });
      let json = JSON.parse(fs.readFileSync('postman/collections/sailpoint-api-' + args[3].toLowerCase() + '.json', 'utf8'))
      req.write(JSON.stringify({"collection": json}))
      req.end();
    });
  }


async function main() {
  try {
    const response = await getCollections();
    for (let collection of response.collections) {
        if (collection.name.includes(args[3]) && collection.id == "b108a9b1-e5ec-4a83-b4f5-02fd7126bbfc") {
            console.log(collection);
            const response = await deleteCollection(collection.id);
            console.log(response);
        }
    }
    const upload = await uploadCollection();
    console.log(upload);
    fs.writeFileSync('postman/links/' + args[3].toLowerCase() + '-link.txt','https://god.gw.postman.com/run-collection/' + upload.collection.uid + '?action=collection%2Ffork&collection-url=entityId%3D' + upload.collection.uid + '%26entityType%3Dcollection%26workspaceId%3D80af54be-a333-4712-af5e-41aa9eccbdd0')
  } catch (error) {
    console.error(error);
  }
}

main();