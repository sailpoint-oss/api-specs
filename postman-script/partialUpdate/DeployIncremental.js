// Deploy collection inncrementally
// ---------------------------------------------------------------
// Cycle through the collection objects and deploy them one by one
// ---------------------------------------------------------------
// Folders -> Requests -> Responses
// ---------------------------------------------------------------
// An updated object has a different id.
// If the id matches, then the object is unchanged.
// If the id does not match, then the object is new.
// In the end delete all objects that are not in the updated collection.
// Sort the objects and update the parent order property.
// ---------------------------------------------------------------
// Except for folders which would force the update of the entire collection.
// ---------------------------------------------------------------

const pmConvert = require('./PostmanCovertions')
const pmAPI = require('./postmanAPI')
var crypto = require('crypto');
const { GenID } = require('./Utils')

const deployIncremental = async (privateRemoteCollectionId, localCollection, publicRemoteCollectionId) => {
  let remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)

  console.log('Incremental deployment of collection ', localCollection.info.name)

  // const collectioHeadHasChanged =
  await upadteCollectionHead(remoteCollection, localCollection)

  remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)

  // const foldersHaveChanged =
  await mergeFolders(remoteCollection, localCollection)

  remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)

  // const requestsHaveChanged =
  await mergeRequests(remoteCollection, localCollection)

  remoteCollection = await refreshRemoteCollection(privateRemoteCollectionId)

  // const responsesHaveChanged =
  await mergeResponses(remoteCollection, localCollection)

  // should we always merge into the public collection?
  // There is teh case that if an error happens in the merge phase
  // the private collection is fully updated
  // and in the next run the public collection will NOT be updated
  // because there are no changes in the private collection

  // if (!(collectioHeadHasChanged || foldersHaveChanged || requestsHaveChanged || responsesHaveChanged)) {
  //   console.log('Incremental deployment of collection ', localCollection.info.name, ' completed\n\n')
  //   return
  // }
  const msg = 'Merging to public collection'
  console.log('\n' + msg + '...')
  await new pmAPI.Collection(privateRemoteCollectionId).merge(publicRemoteCollectionId)
    .then(() => { console.log(msg, '-> OK\n') })
    .catch((error) => {
      console.log(msg, '-> FAIL')
      handlePostmanAPIError(error)
    })
  console.log('Incremental deployment of collection ', localCollection.info.name, ' completed\n\n')
}

async function upadteCollectionHead (remoteCollection, localCollection) {
  // the colelction head shoul dbe updated if there are changes in
  // Authorization
  // Pre-request Script
  // Tests
  // Variables

  const localEmptyCollection = { ...localCollection }
  localEmptyCollection.item = []

  // Check changes in info
  const hasChangesInfo = checkInfoChanges(remoteCollection, localCollection)

  // Check if there are changes in the Authorization
  const hasChangesAuth = checkObjectChanges(remoteCollection.collection.auth, localEmptyCollection.auth)

  // Check if there are changes in the Scripts (pre-request and tests)
  const hasChangesPreRequestScript = checkScriptChanges('prerequest', remoteCollection, localEmptyCollection)

  const hasChangesTestScript = checkScriptChanges('test', remoteCollection, localEmptyCollection)

  // Check if there are changes in the Variables
  const hasChangesVariables = checkVariableChanges(remoteCollection, localEmptyCollection)

  const hasFolderSortChanges = checkFolderSortChanges(remoteCollection, localCollection)

  const hasChanges = (
    hasFolderSortChanges ||
    hasChangesInfo ||
    hasChangesAuth ||
    hasChangesPreRequestScript ||
    hasChangesTestScript ||
    hasChangesVariables
  )

  if (hasChanges) {
    const msg = 'Updating collection head'
    console.log('\n' + msg + '...')
    await new pmAPI.Collection(remoteCollection.collection.info.uid)
      .update({ collection: localEmptyCollection })
      .then(() => { console.log(msg, '-> OK\n') })
      .catch((error) => {
        console.log(msg, '-> FAIL')
        handlePostmanAPIError(error)
      })
  }
  return hasChanges
}

const checkFolderSortChanges = (remoteCollection, localCollection) => {
  const remoteFolders = remoteCollection.collection.item
    .map(folder => ({ id: folder.id }))
  const localFolders = localCollection.item
    .filter(folder => !folder.folder)
    .map(folder => ({ id: folder.id }))

  const remoteFoldersHash = GenID(JSON.stringify(remoteFolders))
  const localFoldersHash = GenID(JSON.stringify(localFolders))

  return remoteFoldersHash !== localFoldersHash
}

const checkInfoChanges = (remoteCollection, localEmptyCollection) => {
  // collection info does not have a specific id
  // so we need to generate a hash and compare them
  // The hash is only beig generated for name, description and schema

  const { name, description, schema } = remoteCollection.collection.info
  const remoteInfo = { name, description, schema }

  const { name: localName, description: localDescription, schema: localSchema } = localEmptyCollection.info
  const localInfo = { name: localName, description: localDescription, schema: localSchema }

  const remoteInfoHash = calculateHash(JSON.stringify(remoteInfo))
  const localInfoHash = calculateHash(JSON.stringify(localInfo))

  return remoteInfoHash !== localInfoHash
}

const checkObjectChanges = (remoteCollectionObject, localCollectionObject) => {
  if (!remoteCollectionObject && !localCollectionObject) {
    return false
  }
  if (!remoteCollectionObject || !localCollectionObject) {
    return true
  }

  // certain object like auth do  not have an id,
  // so we need to generate on and compare them
  const remoteCollectionAuthID = GenID(JSON.stringify(remoteCollectionObject))
  const localCollectionAuthID = GenID(JSON.stringify(localCollectionObject))
  return remoteCollectionAuthID !== localCollectionAuthID
}

const checkScriptChanges = (scriptType, remoteCollection, localCollection) => {
  // RB 2020-10-20: The collection may be empty or have no events at all
  let remoteScript = null
  let localScript = null
  if (remoteCollection.collection.event) {
    remoteScript = remoteCollection.collection.event.find(event => event.listen === scriptType)
  }

  if (localCollection.event) {
    localScript = localCollection.event.find(event => event.listen === scriptType)
  }

  // const remoteScript = remoteCollection.collection.event.find(event => event.listen === scriptType)
  // const localScript = localCollection.event.find(event => event.listen === scriptType)

  if (!remoteScript && !localScript) {
    return false
  }
  if (!remoteScript || !localScript) {
    return true
  }
  // files can be big, so we hash them
  const remoteHash = calculateHash(remoteScript.script.exec[0])
  const localHash = calculateHash(localScript.script.exec[0])

  return remoteHash !== localHash
}

const checkVariableChanges = (remoteCollection, localCollection) => {
  const remoteVariables = remoteCollection.collection.variable
  const localVariables = localCollection.variable.map(variable => ({ key: variable.key, value: variable.value }))

  // check if null
  if (!remoteVariables && !localVariables) {
    return false
  }
  if (!remoteVariables || !localVariables) {
    return true
  }

  // although the local collection does have a deterministic id
  // the remote variable looses that value when it is updated
  // so we need to generate an id for the remote variable

  const remoteVariablesHash = GenID(remoteVariables)
  const localVariablesHash = GenID(localVariables)

  return remoteVariablesHash !== localVariablesHash
}

async function mergeFolders (remoteCollection, localCollection) {
  console.log(' Deploying Folders:')

  const remoteFolders = getAllFoldersFromCollectionItem(remoteCollection.collection.item)
  const localFolders = localCollection.item // all folders

  const newFolders = localFolders.filter(localFolder => !remoteFolders.find(remoteFolder => remoteFolder.id === localFolder.id))
  const oldFolders = remoteFolders.filter(remoteFolder => !localFolders.find(localFolder => localFolder.id === remoteFolder.id))

  let hasChanges = newFolders.length > 0 || oldFolders.length > 0

  if (!hasChanges) {
    console.log('  -> No changes')
    return hasChanges
  }

  // create new folders
  for (const folder of newFolders) {
    const msg = `  Creating new folder [${folder.name}]`
    await new pmAPI.Folder(remoteCollection.collection.info.uid)
      .create(folder)
      .then(() => {
        hasChanges = true
        console.log(msg, '-> OK')
      })
      .catch((error) => {
        console.log(msg, '-> FAIL')
        handlePostmanAPIError(error)
      })
  }

  // delete old folders
  for (const folder of oldFolders) {
    const msg = `  Deleting old folder [${folder.name}]`
    await new pmAPI.Folder(remoteCollection.collection.info.uid)
      .delete(folder.id)
      .then(() => {
        hasChanges = true
        console.log(msg, '-> OK')
      })
      .catch((error) => {
        console.log(msg, '-> FAIL')
        handlePostmanAPIError(error)
      })
  }

  // sort folders is not supported for now
  // const order = localFolders.map(folder => folder.id)
  // const msg = ' Sorting folders'

  // // create a temporsary root folder
  // const rootFolder = await new pmAPI.Folder(remoteCollection.collection.info.uid)
  //   .create({ id: GenID(), name: 'root', folders: order })
  //   .catch((error) => {
  //     console.log(msg, '-> FAIL')
  //     handlePostmanAPIError(error)
  //   })
  // console.log('root folder', rootFolder)
  // // move all remote folders into root folder

  return hasChanges
}

async function mergeRequests (remoteCollection, localCollection) {
  const remoteFolders = getAllFoldersFromCollectionItem(remoteCollection.collection.item)
  const localFolders = localCollection.item // all folders

  console.log('\n Deploying Requests:')
  let anyRequestHasChanged = false

  // loop folders
  for (const localFolder of localFolders) {
    const remoteRemoteFolder = remoteFolders.find(remoteFolder => ((remoteFolder.id === localFolder.id)))

    // TODO: RB: get requests by folder
    // handle undefined items
    remoteRemoteFolder.item = remoteRemoteFolder.item || []

    // filter out anything that is not a request
    remoteRemoteFolder.item = remoteRemoteFolder.item.filter(request => request.request)

    const remoteRequests = remoteRemoteFolder.item
    const localRequests = localFolder.item

    // Identify old and new requests
    const newRequests = localRequests.filter(localRequest => !remoteRequests.find(remoteRequest => remoteRequest.id === localRequest.id))
    const oldRequests = remoteRequests.filter(remoteRequest => !localRequests.find(localRequest => localRequest.id === remoteRequest.id))

    const requestsInFolderHaveChanges = newRequests.length > 0 || oldRequests.length > 0

    if (!requestsInFolderHaveChanges) {
      console.log('  In Folder: ', localFolder.name, '-> No changes')
      continue
    }
    console.log('  In Folder: ', localFolder.name)

    // create new requests
    for (const request of newRequests) {
      // check request format and convert if necessary
      let pmRequest = null
      if (!request.request) { // => Postman Format
        pmRequest = request
      } else { // => OpenAPI Format
        pmRequest = pmConvert.requestFromLocal(request)
      }
      const msg = `   Creating new request [${request.name}]`

      await new pmAPI.Request(remoteCollection.collection.info.uid)
        .create(pmRequest, localFolder.id)
        .then((req) => {
          console.log(msg, '-> OK')
          return req
        })
        .catch((error) => {
          console.log(msg, '-> FAIL')
          handlePostmanAPIError(error)
        })
      // console.log('\nequest', request)
      // console.log('\npmRequest', pmRequest)
      // console.log('\nremoteRequest', remoteRequest)
    }

    // delete old requests
    for (const request of oldRequests) {
      const msg = `   Deleting old request [${request.name}]`
      await new pmAPI.Request(remoteCollection.collection.info.uid)
        .delete(request.id)
        .then(() => {
          console.log(msg, '-> OK')
        })
        .catch((error) => {
          console.log(msg, '-> FAIL')
          handlePostmanAPIError(error)
        })
    }

    if (requestsInFolderHaveChanges) {
      // sort requests in folder
      const order = localRequests.map(request => request.id)
      const msg = `   Sorting requests in folder [${localFolder.name}]`
      await new pmAPI.Folder(remoteCollection.collection.info.uid)
        .update(localFolder.id, { order })
        .then(() => { console.log(msg, '-> OK') })
        .catch((error) => {
          console.log(msg, '-> FAIL')
          handlePostmanAPIError(error)
        })
    }
    anyRequestHasChanged = anyRequestHasChanged || requestsInFolderHaveChanges
  }
  return anyRequestHasChanged
}

async function mergeResponses (remoteCollection, localCollection) {
  console.log('\n Deploying Response:')
  const remoteFolders = getAllFoldersFromCollectionItem(remoteCollection.collection.item)
  const localFolders = localCollection.item

  let anyResponseHasChanged = false
  // loop folders
  for (const localFolder of localFolders) {
    const remoteRemoteFolder = remoteFolders.find(remoteFolder => ((remoteFolder.id === localFolder.id)))

    // handle undefined items
    remoteRemoteFolder.item = remoteRemoteFolder.item || []

    // filter out anything that is not a request
    remoteRemoteFolder.item = remoteRemoteFolder.item.filter(request => request.request)

    const remoteRequests = remoteRemoteFolder.item
    const localRequests = localFolder.item

    console.log('  In Folder: ', localFolder.name)
    // loop requests
    for (const localRequest of localRequests) {
      // Postman Request format does not have a response property
      const remoteResponses = remoteRequests.find(remoteRequest => remoteRequest.id === localRequest.id).response
      const localResponses = localRequest.response
      // the request may not have responses
      if (!localResponses) {
        continue
      }

      const newResponses = localResponses.filter(localResponse => !remoteResponses.find(remoteResponse => remoteResponse.id === localResponse.id))
      const oldResponses = remoteResponses.filter(remoteResponse => !localResponses.find(localResponse => localResponse.id === remoteResponse.id))

      const ResponsesInReqquestHaveChanges = newResponses.length > 0 || oldResponses.length > 0
      if (!ResponsesInReqquestHaveChanges) {
        console.log('   In Request: ', localRequest.name, '-> No changes')
        continue
      }
      console.log('   In Request: ', localRequest.name)

      // create new responses
      for (const response of newResponses) {
        const pmResponse = pmConvert.responseFromLocal(response)
        const msg = `    Creating new response [${response.code} ${response.status}]`
        await new pmAPI.Response(remoteCollection.collection.info.uid)
          .create(pmResponse, localRequest.id)
          .then(() => {
            console.log(msg, '-> OK')
          })
          .catch((error) => {
            console.log(msg, '-> FAIL')
            handlePostmanAPIError(error)
          })
      }

      // delete old responses
      for (const response of oldResponses) {
        const msg = `    Deleting old response [${response.code} ${response.status}]`
        await new pmAPI.Response(remoteCollection.collection.info.uid)
          .delete(response.id)
          .then(() => {
            console.log(msg, '-> OK')
          })
          .catch((error) => {
            console.log(msg, '-> FAIL')
            handlePostmanAPIError(error)
          })
      }

      // updating the requests with the order of the responses, doesn't seem to be necessary
      if (ResponsesInReqquestHaveChanges) {
        // sort responses in requests
        const responsesOrder = localResponses.map(response => response.id)
        const msg = `   Sorting responses in request [${localRequest.name}]`
        await new pmAPI.Request(remoteCollection.collection.info._postman_id)
          .update(localRequest.id,
            {
              responses_order: responsesOrder
            })
          .then(() => { console.log(msg, '-> OK') })
          .catch((error) => {
            console.log(msg, '-> FAIL')
            handlePostmanAPIError(error)
          })
      }
      anyResponseHasChanged = anyResponseHasChanged || ResponsesInReqquestHaveChanges
    }
  }
  return anyResponseHasChanged
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

// return all folders in the collection
// independently of where they are
const getAllFoldersFromCollectionItem = (collectionItem) => {
  const folders = []
  const processItem = (item) => {
    if (!item.request && !item.responses) {
      folders.push({ id: item.id, name: item.name, item: item.item })
    }
    if (item.item) {
      item.item.forEach(processItem)
    }
  }
  collectionItem.forEach(processItem)
  return folders
}

// Handle axios error
const handlePostmanAPIError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log('API ERROR:', error.response.data)
  } else {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log('NO RESPONSE:', error.message)
    if (error.cause) {
      console.log('CAUSE:', error.cause)
    }
  }
  const { method, url, data } = error.config
  const smallData = data.substring(0, 1000)
  console.log('REQUEST DETAILS', { method, url, smallData })
  process.exit(1)
}

const calculateHash = (stringToHash) => {
  return crypto.createHash('sha256').update(stringToHash).digest('hex')
}

module.exports = {
  deployIncremental
}