import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const args = process.argv;
const https = require('https');
var fs = require('fs');
require('dotenv').config()

const workspaceId = '80af54be-a333-4712-af5e-41aa9eccbdd0';

// The developer site reads the collection link from "<key>CollectionUrl" in DynamoDB.
// The sailpoint-identity-security collection keeps its old "isc" key so the site does not break.
const collectionUrlKeys: { [collection: string]: string } = { 'sailpoint-identity-security': 'isc' };

// Collections are postman/collections/sailpoint-api-<name>.json unless listed here.
const collectionFiles: { [collection: string]: string } = { 'sailpoint-identity-security': 'sailpoint-identity-security-api' };

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);


async function insertOrUpdateItem(item: any): Promise<void> {
    try {
        await ddbDocClient.send(new PutCommand({
            TableName: 'developer-sailpoint-site-CMSTable-1VPYH050XQ59F',
            Item: item
        }));
        console.log('Item inserted or updated successfully');
    } catch (error) {
        console.error(error);
    }
}

async function postmanRequest(method: string, path: string, body?: any) {
    const options = {
      method: method,
      hostname: 'api.getpostman.com',
      path: path,
      headers: {
        'X-API-Key': process.env.POSTMAN_API_KEY,
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
      if (body) {
        req.write(JSON.stringify(body))
      }
      req.end();
    });
  }

  async function getCollections() {
    return postmanRequest('GET', '/collections/?workspace=' + workspaceId);
  }

  async function deleteCollection(id) {
    return postmanRequest('DELETE', '/collections/' + id);
  }

  async function uploadCollection(collectionJson: any) {
    return postmanRequest('POST', '/collections/?workspace=' + workspaceId, { "collection": collectionJson });
  }


  async function main() {
    try {
      const collectionFile = collectionFiles[args[2]] || 'sailpoint-api-' + args[2].toLowerCase();
      const collectionJson = JSON.parse(fs.readFileSync('../../postman/collections/' + collectionFile + '.json', 'utf8'));
      const collectionName = collectionJson.info.name;

      const response = <any>await getCollections();
      if (!response.collections) {
        console.log(response)
        throw new Error("Postman API threw an error");
      }
      const upload = <any>await uploadCollection(collectionJson);
      if (!upload.collection) {
        console.log(upload)
        throw new Error("Postman API threw an error");
      }
      console.log(upload);

      let newLink = 'https://god.gw.postman.com/run-collection/' + upload.collection.uid + '?action=collection%2Ffork&collection-url=entityId%3D' + upload.collection.uid + '%26entityType%3Dcollection%26workspaceId%3D' + workspaceId

      await insertOrUpdateItem({ id: (collectionUrlKeys[args[2]] || args[2]) + 'CollectionUrl', Item: newLink })

      for (let collection of response.collections) {
        if (collection.name.toLowerCase() === collectionName.toLowerCase() && collection.uid !== upload.collection.uid) {
          console.log(collection);
          const response = await deleteCollection(collection.uid);
          console.log(response);
        }
      }


      console.log(newLink)
    } catch (error) {
      console.error(error);
    }
  }

  main()
