import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const args = process.argv;
const https = require('https');
var fs = require('fs');
require('dotenv').config()

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

async function getCollections() {
    const options = {
      method: 'GET',
      hostname: 'api.getpostman.com',
      path: '/collections/?workspace=80af54be-a333-4712-af5e-41aa9eccbdd0',
      headers: {
        'X-API-Key': process.env.POSTMAN_API_KEY
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
        'X-API-Key': process.env.POSTMAN_API_KEY,
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
      let json = JSON.parse(fs.readFileSync('../../postman/collections/sailpoint-api-' + args[2].toLowerCase() + '.json', 'utf8'))
      req.write(JSON.stringify({ "collection": json }))
      req.end();
    });
  }


  async function main() {
    try {
      const response = <any>await getCollections();
      if (!response.collections) {
        console.log(response)
        throw new Error("Postman API threw an error");
      }
      const upload = <any>await uploadCollection();
      if (!upload.collection) {
        console.log(upload)
        throw new Error("Postman API threw an error");
      }
      console.log(upload);
      let newLink = 'https://god.gw.postman.com/run-collection/' + upload.collection.uid + '?action=collection%2Ffork&collection-url=entityId%3D' + upload.collection.uid + '%26entityType%3Dcollection%26workspaceId%3D80af54be-a333-4712-af5e-41aa9eccbdd0'
      for (let collection of response.collections) {
        if (collection.name.toLowerCase().includes(args[2].toLowerCase())) {
          console.log(collection);
          const response = await deleteCollection(collection.id);
          console.log(response);
        }
      }
      await insertOrUpdateItem({ id: args[2] + 'CollectionUrl', Item: newLink })

      console.log(newLink)
    } catch (error) {
      console.error(error);
    }
  }

  main()