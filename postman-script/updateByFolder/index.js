const fs = require('fs')
const pmConvert = require('./PostmanCovertions')
const pmAPI = require('./postmanAPI')
let privateRemoteCollectionId = '23836355-c5640083-7523-4ad7-9f92-b23e079cbb7b'
let publicRemoteCollectionId = '23836355-6224d51a-d924-4c39-a58f-6970735aac8e'
let localCollection = JSON.parse(fs.readFileSync(`C:\\git\\api-specs\\postman\\collections\\sailpoint-api-v3.json`).toString())




const release = async () => {


    let remoteCollection = await refreshRemoteCollection(publicRemoteCollectionId)
    for (let item of remoteCollection.collection.item) {
        new pmAPI.Folder(publicRemoteCollectionId).delete(item.id)
    }

    for (let item of localCollection.item) {
        await updateItem(item)
    }

    console.log(remoteCollection)

}


async function updateItem(item, folderId) {
    if (item.item && !folderId) {
        let newFolder = await new pmAPI.Folder(publicRemoteCollectionId).create(item)
        await updateItem(item.item, newFolder.data.id)
    } else {
        for (let items of item) {
            let postmanRequestBody = pmConvert.requestFromLocal(items)
            let newRequest = await new pmAPI.Request(publicRemoteCollectionId).create(postmanRequestBody, folderId)
            for (let response of items.response) {
                let postmanResponseBody = pmConvert.responseFromLocal(response, {})
                let newResponse = await new pmAPI.Response(publicRemoteCollectionId).create(postmanResponseBody, newRequest.data.id)
                console.log(newResponse)
            }
        }

    }
}

async function refreshRemoteCollection (remoteCollectionID) {
    const msg = 'Refreshing remote collection'
    console.log('\n' + msg + '...\n')
    const remoteCollection = await new pmAPI.Collection(remoteCollectionID).get()
      .catch((error) => {
        console.log(msg, '-> FAIL')
        handlePostmanAPIError(error)
      })
    return remoteCollection
  }

release()