const fs = require('fs')
const pmConvert = require('./PostmanCovertions')
const pmAPI = require('./postmanAPI')
let publicRemoteCollectionId = '23836355-6224d51a-d924-4c39-a58f-6970735aac8e'
let localCollection = JSON.parse(fs.readFileSync(`C:\\git\\api-specs\\postman\\collections\\sailpoint-api-v3.json`).toString())




const release = async () => {

    let remoteCollection = await refreshRemoteCollection(publicRemoteCollectionId)




    // This function just cleans up the variables so they match what is returned in postman
    for (let variable of localCollection.variable) {
        if (variable.type) {
            delete variable.type
        }
    }

    // check if the top level collection has changed, If so, update it... This will delete all folders unfortunately.
    if (checkIfDifferent(remoteCollection.collection.event, localCollection.event)
        || checkIfDifferent(remoteCollection.collection.info.description, localCollection.info.description.content)
        || checkIfDifferent(remoteCollection.collection.info.name, localCollection.info.name)
        || checkIfDifferent(remoteCollection.collection.variable, localCollection.variable)
        || checkIfDifferent(remoteCollection.collection.auth, localCollection.auth)) {
            const localEmptyCollection = { ...localCollection }
            localEmptyCollection.item = []
            //delete all folders. Do this one at a time so it doesn't timeout
            for (let item of remoteCollection.collection.item) {
                await new pmAPI.Folder(publicRemoteCollectionId).delete(item.id)
            }
            // now update the collection with the changes. All folders will be later in code
            let updatedCollection = await new pmAPI.Collection(publicRemoteCollectionId).update({collection : localEmptyCollection})
            remoteCollection = await refreshRemoteCollection(publicRemoteCollectionId)
        }

    // add any missing folders
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder == null) {
            await updateEntireFolder(item)
        }
    }

    // update any requests that have changed
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder !== null) {
            await updateRequestsInFolder(item.item, folder.id, folder)
        }
    }

    console.log(remoteCollection)

}

function getMatchingFolder(localFolder, remoteFolders) {
    for (let folder of remoteFolders) {
        if (folder.name === localFolder.name) {
            return folder
        }
    }
    return null
}

function getMatchingRequest(localRequest, remoteRequests) {
    for (let request of remoteRequests) {
        if (request.name === localRequest.name) {
            return request
        }
    }
    return null
}

function buildRequestBody(items) {

    let responses = []
    for (let response of items.response) {
        responses.push(pmConvert.responseFromLocal(response, {}))
    }
    let postmanRequestBody = pmConvert.requestFromLocal(items, responses)
    return postmanRequestBody
}

function checkIfDifferent(source, dest) {
    if (JSON.stringify(source) === JSON.stringify(dest)) {
        return false
    }
    return true
}


async function updateEntireFolder(item, folderId) {
    if (item.item && !folderId) {
        let newFolder = await new pmAPI.Folder(publicRemoteCollectionId).create(item)
        await updateEntireFolder(item.item, newFolder.data.id)
    } else {
        for (let items of item) {
            let responses = []
            for (let response of items.response) {
                responses.push(pmConvert.responseFromLocal(response, {}))
            }
            let postmanRequestBody = pmConvert.requestFromLocal(items, responses)
            let newRequest = await new pmAPI.Request(publicRemoteCollectionId).create(postmanRequestBody, folderId)
            console.log(newRequest.data.name)
        }
    }
}


async function updateRequestsInFolder(item, folderId, remoteItem) {
    for (let items of item) {
        let remoteRequest = getMatchingRequest(items, remoteItem.item)
        let postmanRequestBody = buildRequestBody(items)
        let remotePostmanBody = buildRequestBody(remoteRequest)
        if (checkIfDifferent(postmanRequestBody, remotePostmanBody)) {
            let newRequestDelete = await new pmAPI.Request(publicRemoteCollectionId).delete(remoteRequest.id)
            console.log(`deleting request ${newRequestDelete.data.id}`)
            let newRequest = await new pmAPI.Request(publicRemoteCollectionId).create(postmanRequestBody, folderId)
            console.log(`creating request ${newRequest.data.name}`)
        } else {
            console.log(`no changes to request ${remoteRequest.name}`)
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