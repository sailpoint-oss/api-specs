const fs = require('fs')
const pmConvert = require('./PostmanCovertions')
const pmAPI = require('./postmanAPI')
let publicRemoteCollectionId = '23836355-6224d51a-d924-4c39-a58f-6970735aac8e'
let publicRemoteCollectionNonUId = '6224d51a-d924-4c39-a58f-6970735aac8e'
let mainPublicCollectionId = '23836355-220ca56f-ba1b-4ff2-ad1e-7e0a6bfb6cb4'
let localCollection = JSON.parse(fs.readFileSync(`C:\\git\\api-specs\\postman\\collections\\sailpoint-api-v3.json`).toString())




const release = async () => {

    let remoteCollection = await refreshRemoteCollection(publicRemoteCollectionId)




    // This step just cleans up the variables so they match what is returned in postman
    for (let variable of localCollection.variable) {
        if (variable.type) {
            delete variable.type
        }
    }

    // check if the top level collection has changed, If so, update it... This will delete all folders unfortunately.
    if (checkIfDifferent(localCollection.event, remoteCollection.collection.event)
        || checkIfDifferent( localCollection.info.description.content, remoteCollection.collection.info.description)
        || checkIfDifferent( localCollection.info.name, remoteCollection.collection.info.name)
        || checkIfDifferent(localCollection.variable, remoteCollection.collection.variable)
        || checkIfDifferent( localCollection.auth, remoteCollection.collection.auth)) {
            const localEmptyCollection = { ...localCollection }
            localEmptyCollection.item = []
            //delete all folders. Do this one at a time so it doesn't timeout
            for (let item of remoteCollection.collection.item) {
                await new pmAPI.Folder(publicRemoteCollectionId).delete(item.id)
            }
            // now update the collection with the changes. All folders will be added later in code
            let updatedCollection = await new pmAPI.Collection(publicRemoteCollectionId).update({collection : localEmptyCollection})
            remoteCollection = await refreshRemoteCollection(publicRemoteCollectionId)
        }

    // add any missing folders
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (checkIfDifferent(folder.description, item.description)) {
            console.log(`updating folder ${folder.name}`)
            await new pmAPI.Folder(publicRemoteCollectionId).update(folder.id, { description: item.description })
            console.log(`updated folder ${folder.name}`)
        }
        if (folder == null) {
            await updateEntireFolder(item)
        }
    }

    // delete any folders that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        let localFolder = getMatchingFolder(folder, localCollection.item)
        if (localFolder == null) {
            await new pmAPI.Folder(publicRemoteCollectionId).delete(folder.id)
        }
    }

    // delete any requests that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        let localFolder = getMatchingFolder(folder, localCollection.item)
        for (let items of folder.item) {
            let remoteRequest = getMatchingRequest(items, localFolder.item)
            if (remoteRequest == null) {
                await new pmAPI.Request(publicRemoteCollectionId).delete(items.id)
            }
        }
    }

    // update any requests that have changed
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder !== null) {
            await updateRequestsInFolder(item.item, folder.id, folder)
        }
    }

    // push changes to the forked collection
    await new pmAPI.Collection(publicRemoteCollectionId).merge(mainPublicCollectionId)
    .then(() => { console.log(msg, '-> OK\n') })
    .catch((error) => {
      console.log(msg, '-> FAIL')
      handlePostmanAPIError(error)
    })

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
        if (request.name === localRequest.name && request.request.method === localRequest.request.method && localRequest.request.url.host + '/' + localRequest.request.url.path.join('/') === request.request.url.host + '/' + request.request.url.path.join('/')) {
            return request
        }
    }
    return null
}

function getMatchingResponse(localResponse, remoteResponses) {
    for (let response of remoteResponses) {
        if (response.name === localResponse.name && response.responseCode.code === localResponse.responseCode.code) {
            return response
        }
    }
    return null
}

function buildRequestBody(items) {
    if (items === null) {
        return null
    }

    let responses = []
    for (let response of items.response) {
        responses.push(pmConvert.responseFromLocal(response, {}))
    }
    let postmanRequestBody = pmConvert.requestFromLocal(items, responses)
    return postmanRequestBody
}

function checkIfDifferent(source, dest) {
    syncKeys(source, dest)
    if (isDeepEqual(source, dest)) {
        return false
    }
    return true
}

function removeIdFields(obj) {
    if (typeof obj !== 'object') {
        return
    }
    if (obj === null) {
        return
    }
    // Check if the current object has the 'id' property
    if (obj.hasOwnProperty('id')) {
        delete obj.id;
    }

    // Recursively call removeIdFields on each property if it's an object
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeIdFields(obj[key]);
        }
    }
}

function isNullorEmpty(obj) {
    if (obj === null || obj === '' || obj === undefined) {
        return true
    }
    return false

}


function syncKeys(obj1, obj2) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
        return;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    for (let key of keys1) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        if (val2 === undefined) {
            continue;
        } else if (key === 'id') {
            obj1[key] = val2;
        }
        const areObjects = isObject(val1) && isObject(val2);
        if (areObjects) {
            syncKeys(val1, val2)
        }
        
    }

    return true;
}


function isDeepEqual(obj1, obj2) {
    if (areValuesEqual(obj1, obj2)) {
        return true
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let key of keys1) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !isDeepEqual(val1, val2) ||
            (!areObjects && !areValuesEqual(val1, val2))
        ) {
            return false;
        }
    }

    return true;
}

function areValuesEqual(val1, val2) {
    if (isNullorEmpty(val1) && isNullorEmpty(val2)) {
        return true;
    }
    if (val1 === val2) {
        return true
    }
    return false
}

function isObject(object) {
    return object != null && typeof object === 'object';
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

        // remove responses from request that are no longer there
        for (let response of remotePostmanBody.responses) {
            let localResponse = getMatchingResponse(response, postmanRequestBody.responses)
            if (localResponse == null) {
                console.log(`deleting response ${response.name}`)
                let newRequestDelete = await new pmAPI.Response(publicRemoteCollectionId).delete(response.id)
                console.log(`deleted response ${newRequestDelete.data.id}`)
            }
        }


        // check all responses in request
        for (let response of postmanRequestBody.responses) {
            let remoteResponse = getMatchingResponse(response, remotePostmanBody.responses)
            if (checkIfDifferent(response, remoteResponse)) {
                if (remoteResponse) {
                    console.log(`updating response ${remoteResponse.name}`)
                    let newRequestDelete = await new pmAPI.Response(publicRemoteCollectionId).update(response, remoteResponse.id)
                    console.log(`updated response ${newRequestDelete.data.id}`)
                } else {
                    let newRequest = await new pmAPI.Response(publicRemoteCollectionId).create(response, remoteRequest.id)
                    console.log(`creating request ${newRequest.data.name}`)
                }
            } else {
                console.log(`no changes to request ${remoteRequest.name}`)
            }
        }

        delete postmanRequestBody.responses
        delete remotePostmanBody.responses
        // now check if the request has any changes in it
        if (checkIfDifferent(postmanRequestBody, remotePostmanBody)) {
            postmanRequestBody = buildRequestBody(items)
            if (remoteRequest) {
                console.log(`updating request ${remoteRequest.name}`)
                postmanRequestBody.folder = folderId
                postmanRequestBody.collection = publicRemoteCollectionNonUId
                let newRequestDelete = await new pmAPI.Request(publicRemoteCollectionId).update(remoteRequest.id, postmanRequestBody)
                console.log(`updated request ${newRequestDelete.data.id}`)
            } else {
                let newRequest = await new pmAPI.Request(publicRemoteCollectionId).create(postmanRequestBody, folderId)
                console.log(`creating request ${newRequest.data.name}`)
            }
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