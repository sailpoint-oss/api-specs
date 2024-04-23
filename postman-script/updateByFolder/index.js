const fs = require('fs')
const args = process.argv;
const pmConvert = require('./PostmanCovertions')
const pmAPI = require('./postmanAPI')
let privateRemoteCollectionId = '23226990-e27d8a83-24d7-4de8-9c33-419fe65aaa9c'  //must be in normal ID format
let mainPublicCollectionId = '23836355-220ca56f-ba1b-4ff2-ad1e-7e0a6bfb6cb4' //must be in UUID format
let localCollection = {}//JSON.parse(fs.readFileSync(`C:\\git\\api-specs\\postman\\collections\\sailpoint-api-v3.json`).toString())
let changesMade = false;

// You can use the following collection to test changes on the v3 collections -- it is in the same working workspace under a copy of the original.
//v3: '9557f27b-5b8c-4de7-90e2-073c1f79c484',
//v3Uid: '23226990-9557f27b-5b8c-4de7-90e2-073c1f79c484',

const postmanCollections = {

    v3: 'daf693e6-7856-4c62-8c11-4102e6729766',
    v3Uid: '23226990-daf693e6-7856-4c62-8c11-4102e6729766',
    v3Public: '23226990-3721beea-5615-44b4-9459-e858a0ca7aed',
    v3Location: 'postman/collections/sailpoint-api-v3.json',
    v3SpecLocation: 'dereferenced/deref-sailpoint-api.v3.json',
    beta: 'e0c499ee-a0ea-4d02-a8a5-d8dce475c79f',
    betaUid: '23226990-e0c499ee-a0ea-4d02-a8a5-d8dce475c79f',
    betaPublic: '23226990-3b87172a-cd55-40a2-9ace-1560a1158a4e',
    betaLocation: 'postman/collections/sailpoint-api-beta.json',
    betaSpecLocation: 'dereferenced/deref-sailpoint-api.beta.json',
    nerm: '91b47f89-5fc4-4111-b9c6-382cf29d1475',
    nermUid: '23226990-91b47f89-5fc4-4111-b9c6-382cf29d1475',
    nermPublic: '23226990-20d718e3-b9b3-43ad-850c-637b00864ae2',
    nermLocation: 'postman/collections/sailpoint-api-nerm.json'

}


const release = async () => {


    privateRemoteCollectionId = postmanCollections[args[2].toLowerCase()]
    privateRemoteCollectionIdUid = postmanCollections[args[2].toLowerCase() + 'Uid']
    mainPublicCollectionId = postmanCollections[args[2].toLowerCase() + 'Public']
    localCollection = JSON.parse(fs.readFileSync(postmanCollections[args[2].toLowerCase() + 'Location'], 'utf8'))
    //SpecCollection = JSON.parse(fs.readFileSync(postmanCollections[args[2].toLowerCase() + 'SpecLocation'], 'utf8'))


    let remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)




    // This step just cleans up the variables so they match what is returned in postman
    for (let variable of localCollection.variable) {
        if (variable.type) {
            delete variable.type
        }
    }

    // check if the top level collection has changed, If so, update it... This will delete all folders unfortunately.
    // skipping this for now as it's just too dangerous and we can manually update in these cases

    if (1===2) {

        if (checkIfDifferent(removeIdFields(localCollection.event), removeIdFields(remoteCollection.collection.event))
        || checkIfDifferent( removeIdFields(localCollection.info.description.content), removeIdFields(remoteCollection.collection.info.description))
        || checkIfDifferent( removeIdFields(localCollection.info.name), removeIdFields(remoteCollection.collection.info.name))
        || checkIfDifferent(removeIdFields(localCollection.variable), removeIdFields(remoteCollection.collection.variable))
        || checkIfDifferent( removeIdFields(localCollection.auth), removeIdFields(remoteCollection.collection.auth))) {
            const localEmptyCollection = { ...localCollection }
            localEmptyCollection.item = []
            //delete all folders. Do this one at a time so it doesn't timeout
            for (let item of remoteCollection.collection.item) {
                await new pmAPI.Folder(privateRemoteCollectionId).delete(item.id)
                changesMade = true
            }
            // now update the collection with the changes. All folders will be added later in code
            let updatedCollection = await new pmAPI.Collection(privateRemoteCollectionId).update({collection : localEmptyCollection})
            remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)
        }
    }


    // add any missing folders
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder == null) {
            await updateEntireFolder(item)
        } else {
            if (checkIfDifferent(folder.description, item.description)) {
                console.log(`updating folder ${folder.name}`)
                await new pmAPI.Folder(privateRemoteCollectionId).update(folder.id, { description: item.description })
                changesMade = true
                console.log(`updated folder ${folder.name}`)
            }
        }


    }

    // delete any folders that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        let localFolder = getMatchingFolder(folder, localCollection.item)
        if (localFolder == null) {
            await new pmAPI.Folder(privateRemoteCollectionId).delete(folder.id)
            changesMade = true
        }
    }

    // delete any requests that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        let localFolder = getMatchingFolder(folder, localCollection.item)
        for (let items of folder.item) {
            let remoteRequest = getMatchingRequest(items, localFolder.item)
            if (remoteRequest == null) {
                await new pmAPI.Request(privateRemoteCollectionId).delete(items.id)
                changesMade = true
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

    // push changes to the forked collections
    if (changesMade) {
        const msg = 'Merging to public collection'
        console.log('\n' + msg + '...')
        await new pmAPI.Collection(privateRemoteCollectionIdUid).merge(mainPublicCollectionId)
        .then(() => { 
            console.log(msg, '-> OK\n') }
            )
        .catch((error) => {
          console.log(msg, '-> FAIL')
          throw new Error(`Failed to merge to public collection: ${error}`)
        })
    } else {
        console.log('No changes made')
    }


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
        let val1 = findJSONObjects(obj1[key]);
        let val2 = findJSONObjects(obj2[key]);
        if (shouldIgnore(key)) {
            continue;
        }
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !isDeepEqual(val1, val2) ||
            (!areObjects && !areValuesEqual(val1, val2))
        ) {
            console.log(`found difference in ${key} value1: ${val1} value2: ${val2}`)
            return false;
        }
    }

    return true;
}

function shouldIgnore(key) {
    return false
}

function findJSONObjects(obj) {
    const jsonObjects = {};

    if (typeof obj === 'string') {
        try {
            // Attempt to parse the string as JSON
            const parsed = JSON.parse(obj);

            // Check if the parsed result is an object (and not a number, string, etc.)
            if (parsed !== null && typeof parsed === 'object') {
                return parsed;
            }
        } catch (e) {
            return obj;
        }
    }

    return obj;
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
        let newFolder = await new pmAPI.Folder(privateRemoteCollectionId).create(item)
        await updateEntireFolder(item.item, newFolder.data.id)
    } else {
        for (let items of item) {
            let responses = []
            for (let response of items.response) {
                responses.push(pmConvert.responseFromLocal(response, {}))
            }
            let postmanRequestBody = pmConvert.requestFromLocal(items, responses)
            console.log(`creating request ${postmanRequestBody.name} with id: ${postmanRequestBody.id}`)
            let newRequest = await new pmAPI.Request(privateRemoteCollectionId).create(postmanRequestBody, folderId)
            changesMade = true
            console.log(newRequest.data.name)
        }
    }
}


async function updateRequestsInFolder(item, folderId, remoteItem) {
    for (let items of item) {
        let remoteRequest = getMatchingRequest(items, remoteItem.item)
        let postmanRequestBody = buildRequestBody(items)
        let remotePostmanBody = buildRequestBody(remoteRequest)
        if (remoteRequest !== null) {
            // remove responses from request that are no longer there
            for (let response of remotePostmanBody.responses) {
                let localResponse = getMatchingResponse(response, postmanRequestBody.responses)
                if (localResponse == null) {
                    console.log(`response no longer exists, deleting response ${response.name}`)
                    let newRequestDelete = await new pmAPI.Response(privateRemoteCollectionId).delete(response.id)
                    changesMade = true
                    //console.log(`deleted response ${newRequestDelete.data.id}`)
                }
            }


            // check all responses in request
            for (let response of postmanRequestBody.responses) {
                let remoteResponse = getMatchingResponse(response, remotePostmanBody.responses)
                if (checkIfDifferent(response, remoteResponse)) {
                    if (remoteResponse) {
                        let newRequestDelete = await new pmAPI.Response(privateRemoteCollectionId).update(response, remoteResponse.id)
                        console.log(`change found, updated response ${newRequestDelete.data.id} in request ${response.name}`)
                        changesMade = true
                    } else {
                        let newRequest = await new pmAPI.Response(privateRemoteCollectionId).create(response, remoteRequest.id)
                        console.log(`response doesn't exist in ${response.name}, created response ${newRequest.data.name}`)
                        changesMade = true
                    }
                } else {
                    //console.log(`no changes to request ${remoteRequest.name} response ${response.name}`)
                }
            }
            delete remotePostmanBody.responses
            delete postmanRequestBody.responses
        } else {
            console.log(`request is null`)
        }


        
        
        // now check if the request has any changes in it
        if (checkIfDifferent(postmanRequestBody, remotePostmanBody)) {
            postmanRequestBody = buildRequestBody(items)
            if (remoteRequest) {
                console.log(`updating request ${remoteRequest.name}`)
                postmanRequestBody.folder = folderId
                postmanRequestBody.collection = privateRemoteCollectionId
                let newRequestDelete = await new pmAPI.Request(privateRemoteCollectionId).update(remoteRequest.id, postmanRequestBody)
                changesMade = true
                console.log(`updated request ${newRequestDelete.data.id}`)
            } else {
                let newRequest = await new pmAPI.Request(privateRemoteCollectionId).create(postmanRequestBody, folderId)
                changesMade = true
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