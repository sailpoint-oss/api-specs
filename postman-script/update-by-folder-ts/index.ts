import fs from 'fs';
const args = process.argv;
let privateRemoteCollectionId = '23226990-e27d8a83-24d7-4de8-9c33-419fe65aaa9c'  //must be in normal ID format
let mainPublicCollectionId = '23836355-220ca56f-ba1b-4ff2-ad1e-7e0a6bfb6cb4' //must be in UUID format
let privateRemoteCollectionIdUid = ''
let changesMade = false;
import { requestFromLocal, responseFromLocal } from './conversions/postmanConversions';
import { Collection, Folder, Request, Response } from './postmanAPI';
import {PostmanCollection, PostmanCollectionResponse, PostmanFolder, PostmanRequestItem, PostmanResponse, isPostmanFolder, isPostmanRequestItem} from './models/postman-collection'
import { convertedResponse } from './conversions/converted-response-model';
import { checkIfDifferent } from './conversions/util';
// You can use the following collection to test changes on the v3 collections -- it is in the same working workspace under a copy of the original.
//v3: '9557f27b-5b8c-4de7-90e2-073c1f79c484',
//v3Uid: '23226990-9557f27b-5b8c-4de7-90e2-073c1f79c484',
const postmanCollections = {

    v3Public: '23226990-3721beea-5615-44b4-9459-e858a0ca7aed',
    v3Location: '../../postman/collections/sailpoint-api-v3.json',
    betaPublic: '23226990-3b87172a-cd55-40a2-9ace-1560a1158a4e',
    betaLocation: '../../postman/collections/sailpoint-api-beta.json',
    nermPublic: '23226990-20d718e3-b9b3-43ad-850c-637b00864ae2',
    nermLocation: '../../postman/collections/sailpoint-api-nerm.json'

}

mainPublicCollectionId = postmanCollections[args[2].toLowerCase() + 'Public']
const localCollection: PostmanCollection = JSON.parse(fs.readFileSync(postmanCollections[args[2].toLowerCase() + 'Location'], 'utf8'))

let folderAPI: Folder
let responseAPI: Response
let requestAPI: Request

const release = async () => {

    console.log(`searching for any collections with fork label = ${args[2].toLowerCase() + ' automation fork'}`)
    const allCollections = await new Collection(mainPublicCollectionId).getAllCollections()
    for (const collection of allCollections.collections) {
        if (collection.fork) {
            if (collection.fork.label == args[2].toLowerCase() + ' automation fork') {
                const deletedCollection = await new Collection(collection.id).delete()
                console.log(`deleted collection ${collection.id}`)
            }
        }
    }

    const forkedCollection = await new Collection(mainPublicCollectionId).fork('2bc7f521-83cd-48c7-8abc-a40537c6d392', args[2].toLowerCase() + ' automation fork')
    privateRemoteCollectionId = forkedCollection.collection.id
    privateRemoteCollectionIdUid = forkedCollection.collection.uid

    folderAPI = new Folder(privateRemoteCollectionId)
    responseAPI = new Response(privateRemoteCollectionId)
    requestAPI = new Request(privateRemoteCollectionId)

    try {
        const remoteCollection = await new Collection(privateRemoteCollectionId).get()


    // This step just cleans up the variables so they match what is returned in postman
    for (let variable of localCollection.variable) {
        if (variable.type) {
            delete variable.type
        }
    }

    // check if the top level collection has changed, If so, update it... This will delete all folders unfortunately.
    // skipping this for now as it's just too dangerous and we can manually update in these cases

    // if (1===2) {

    //     if (checkIfDifferent(removeIdFields(localCollection.event), removeIdFields(remoteCollection.collection.event))
    //     || checkIfDifferent( removeIdFields(localCollection.info.description.content), removeIdFields(remoteCollection.collection.info.description))
    //     || checkIfDifferent( removeIdFields(localCollection.info.name), removeIdFields(remoteCollection.collection.info.name))
    //     || checkIfDifferent(removeIdFields(localCollection.variable), removeIdFields(remoteCollection.collection.variable))
    //     || checkIfDifferent( removeIdFields(localCollection.auth), removeIdFields(remoteCollection.collection.auth))) {
    //         const localEmptyCollection = { ...localCollection }
    //         localEmptyCollection.item = []
    //         //delete all folders. Do this one at a time so it doesn't timeout
    //         for (let item of remoteCollection.collection.item) {
    //             await folderAPI.delete(item.id)
    //             changesMade = true
    //         }
    //         // now update the collection with the changes. All folders will be added later in code
    //         let updatedCollection = await collectionAPI.update({collection : localEmptyCollection})
    //         remoteCollection = await new Collection(privateRemoteCollectionId).get()
    //     }
    // }


    // add any missing folders
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder == null) {
            await updateEntireFolder(item, undefined)
        } else {
            if (checkIfDifferent(folder.description, item.description)) {
                console.log(`updating folder ${folder.name}`)
                await folderAPI.update(folder.id, { description: item.description })
                changesMade = true
                console.log(`updated folder ${folder.name}`)
            }
        }


    }

    // delete any folders that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        let localFolder = getMatchingFolder(folder, localCollection.item)
        if (localFolder == null) {
            await folderAPI.delete(folder.id)
            changesMade = true
        }
    }

    // delete any requests that are no longer in the collection
    for (let folder of remoteCollection.collection.item) {
        //console.log(`checking folder ${folder.name}`)
        // if (folder.name == 'SOD Policy') {
        //     console.log('found it')
        // }
        let localFolder = getMatchingFolder(folder, localCollection.item)
        if (localFolder && folder.item && isPostmanRequestItem(folder.item)) {
            for (let items of folder.item) {
                let remoteRequest = getMatchingRequest(items, localFolder.item)
                if (remoteRequest == null) {
                    await requestAPI.delete(items.id)
                    changesMade = true
                }
            }
        }

    }

    // update any requests that have changed
    for (let item of localCollection.item) {
        let folder = getMatchingFolder(item, remoteCollection.collection.item)
        if (folder !== null && isPostmanRequestItem(item.item)) {
            await updateRequestsInFolder(item.item, folder.id, folder)
        }
    }

    // push changes to the forked collections
    if (changesMade) {
        console.log('Merging to public collection')
        const response = await new Collection(privateRemoteCollectionIdUid).merge(mainPublicCollectionId)
    } else {
        console.log('No changes made')
    }
    const deletedCollection = await new Collection(privateRemoteCollectionId).delete()
    console.log('deleted temporary collection')
    } catch (error) {
        console.log('error running script')
        throw new Error(error)
    }
    
}



function getMatchingFolder(localFolder: PostmanFolder, remoteFolders: PostmanFolder[]) {
    for (let folder of remoteFolders) {
        if (folder.name === localFolder.name) {
            return folder
        }
    }
    return null
}

function getMatchingRequest(localRequest: PostmanRequestItem, remoteRequests: PostmanRequestItem[] | PostmanFolder): PostmanRequestItem {
    if (isPostmanRequestItem(remoteRequests)) {
        for (let request of remoteRequests) {
            if (request.name === localRequest.name && request.request.method === localRequest.request.method && localRequest.request.url.host + '/' + localRequest.request.url.path.join('/') === request.request.url.host + '/' + request.request.url.path.join('/')) {
                return request
            }
        }
    }

    return null
}

function getMatchingResponse(localResponse: convertedResponse, remoteResponses: convertedResponse[]) {
    for (let response of remoteResponses) {
        if (response.name === localResponse.name && response.responseCode.code === localResponse.responseCode.code) {
            return response
        }
    }
    return null
}

function buildRequestBody(items: PostmanRequestItem) {
    if (items === null) {
        return null
    }

    let responses = []
    for (let response of items.response) {
        responses.push(responseFromLocal(response, {}))
    }
    let postmanRequestBody = requestFromLocal(items, responses)
    return postmanRequestBody
}



async function updateEntireFolder(item: PostmanRequestItem[] | PostmanFolder, folderId: string) {
    if (isPostmanFolder(item) && !folderId) {
        let newFolder = await folderAPI.create(item)
        await updateEntireFolder(item.item, newFolder.data.id)
    } else if (isPostmanRequestItem(item)) {
        for (let postmanRequest of item) {
            let responses: convertedResponse[] = []
            for (let response of postmanRequest.response) {
                responses.push(responseFromLocal(response, {}))
            }
            let postmanRequestBody = requestFromLocal(postmanRequest, responses)
            console.log(`creating request ${postmanRequestBody.name} with id: ${postmanRequestBody.id}`)
            let newRequest = await requestAPI.create(postmanRequestBody, folderId)
            changesMade = true
            console.log(newRequest.data.name)
        }
    }
}


async function updateRequestsInFolder(item: PostmanRequestItem[], folderId: string, remoteItem: PostmanFolder) {
    for (let request of item) {
            let remoteRequest = getMatchingRequest(request, remoteItem.item)
            // if (remoteRequest.name == 'Create a branding item') {
            //     console.log('found it')
            // }
            let postmanRequestBody = buildRequestBody(request)
            let remotePostmanBody = buildRequestBody(remoteRequest)
            if (remoteRequest !== null) {
                // remove responses from request that are no longer there
                for (let response of remotePostmanBody.responses) {
                    let localResponse = getMatchingResponse(response, postmanRequestBody.responses)
                    if (localResponse == null) {
                        console.log(`response no longer exists, deleting response ${response.name}`)
                        let newRequestDelete = await responseAPI.delete(response.id)
                        changesMade = true
                        //console.log(`deleted response ${newRequestDelete.data.id}`)
                    }
                }
    
    
                // check all responses in request
                for (let response of postmanRequestBody.responses) {
                    let remoteResponse = getMatchingResponse(response, remotePostmanBody.responses)
                    if (checkIfDifferent(response, remoteResponse)) {
                        if (remoteResponse) {
                            let newRequestDelete = await responseAPI.update(response, remoteResponse.id)
                            console.log(`change found, updated response ${newRequestDelete.data.id} in request ${response.name}`)
                            changesMade = true
                        } else {
                            let newRequest = await responseAPI.create(response, remoteRequest.id)
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
                postmanRequestBody = buildRequestBody(request)
                if (remoteRequest) {
                    console.log(`updating request ${remoteRequest.name}`)
                    postmanRequestBody.folder = folderId
                    postmanRequestBody.collection = privateRemoteCollectionId
                    let newRequestDelete = await requestAPI.update(remoteRequest.id, postmanRequestBody)
                    changesMade = true
                    console.log(`updated request ${newRequestDelete.data.id}`)
                } else {
                    let newRequest = await requestAPI.create(postmanRequestBody, folderId)
                    changesMade = true
                    console.log(`creating request ${newRequest.data.name}`)
                }
            } else {
                console.log(`no changes to request ${remoteRequest.name}`)
            }
        }
        
    
}



release()