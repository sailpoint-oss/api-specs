// Postman Convertions
// ------------------------------------------------------------
// Handles the conversions from the local generated object
// to the postman api specific objects.
// The converted objects are necessary for the updates to work.
// ------------------------------------------------------------
// The interesting part is that the postman api uses a different
// object structure for folders, requests, adn responses,
// when compared to what you get from the collection json file.
// ------------------------------------------------------------


const requestFromLocal = (localRequest, responses) => {
    //   console.log('localRequest', localRequest)
      let url = localRequest.request.url.host + '/' + localRequest.request.url.path.join('/')
    
      let data = []
      let dataMode = null
      let rawModeData = null
      if (localRequest.request.body && localRequest.request.body.urlencoded) {
        data = dataFromLocalURLEncode(localRequest.request.body.urlencoded)
        dataMode = localRequest.request.body.mode
        rawModeData = localRequest.request.body.raw
      } else if (localRequest.request.body && !localRequest.request.body.urlencoded) {
        dataMode = localRequest.request.body.mode
        rawModeData = localRequest.request.body.raw
      }
    
      let queryParams = []
      if (localRequest.request.url.query) {
        queryParams = dataFromLocalURLEncode(localRequest.request.url.query)
        url += '?'
        for (const param of queryParams) {
          if (param.description.content) {
            param.description = param.description.content
          }
          if (param.enabled === false) continue
          url += param.key + '=' + param.value + '&'
        }
        url = url.slice(0, -1)
      }
    
      let pathVariableData = []
      if (localRequest.request.url.variable) {
        pathVariableData = dataFromLocalURLEncode(localRequest.request.url.variable)
      }
    
      let headerData = []
      if (localRequest.request.header) {
        headerData = dataFromLocalURLEncode(localRequest.request.header)
          .map((header) => ({ key: header.key, value: header.value, enabled: header.enabled, description: header.description }))
      }

      let headers = []
      if (localRequest.request.header) {
        headers = dataFromLocalURLEncode(localRequest.request.header)
          .map((header) => ({ key: header.key, value: header.value, description: header.description }))
      }

      if (JSON.stringify(localRequest.request.description) === '{}') {
        localRequest.request.description = ''
      }
    
      const request = {
        // owner: '8119550',
        // lastUpdatedBy: '8119550',
        // lastRevision: 32526900683,
        // folder: 'dfa47710-b3d3-4a2c-bbc8-fbd25ad12244',
        // collection: 'fa89c950-c947-4061-9d13-fb18d7c6bc51',
    
        id: localRequest.id, //
        name: localRequest.name, //
    
        dataMode, //
        data, //
        auth: localRequest.request.auth, //
        events: localRequest.events, //
        //
        rawModeData, // body os request
        //
        descriptionFormat: localRequest.descriptionFormat, // it can be in either ``html`` or ``markdown`` formats.
        description: localRequest.request.description && localRequest.request.description.content ?  localRequest.request.description.content : localRequest.request.description, //
        // Headers
        headers: headers,
        headerData,
        //
        variables: localRequest.variables,
        method: localRequest.request.method, //
    
        // Path Variables
        pathVariables: pathVariableData, //
        pathVariableData, //
        //
        url, //
        preRequestScript: localRequest.preRequestScript,
        tests: localRequest.tests,
        currentHelper: localRequest.currentHelper,
        helperAttributes: localRequest.helperAttributes,
        queryParams, //
    
        protocolProfileBehavior: localRequest.protocolProfileBehavior,
        dataDisabled: localRequest.dataDisabled,
        responses_order: localRequest.responses_order,
        responses: responses,
    
        // createdAt: '2023-09-12T16:25:20.000Z',
        // updatedAt: '2023-09-12T16:25:23.000Z',
        // dataOptions: {{"raw":{}}},
      }
      return request
    }
    
    const responseFromLocal = (localResponse, requestObject) => {
      let headers = []
      if (localResponse.header) {
        headers = localResponse.header
        .map((item) => ({ key: item.key, value: item.value }))
        .sort((a, b) => {
            if (a.key < b.key) {
                return -1;
            }
            if (a.key > b.key) {
                return 1;
            }
            return 0;
        });
      } else {
        console.log(`missing headers for response ${localResponse.name}`)
      }
      
      const response = {
        // owner: '8119550',
        // lastUpdatedBy: '8119550',
        // lastRevision: 32546597265,
        // request: '331bbc94-5425-46f3-8c02-31c353d2ced8',
    
        id: localResponse.id, //
        name: localResponse.name, //
        status: localResponse.status, //
        responseCode: {
          code: localResponse.code, //
          name: localResponse.status, //
          detail: ''
        },
        // time: null,
        headers, //
        cookies: [],
        mime: null,
        text: localResponse.body ? localResponse.body : '', //
        language: 'json', //
        rawDataType: 'text',//
        requestObject: requestObject,
        // createdAt: '2023-09-13T14:53:05.000Z',
        // updatedAt: '2023-09-13T14:53:05.000Z'
      }
    
      return response
    }
    
    const dataFromLocalURLEncode = (localFormData) => {
      const data = []
      for (const param of localFormData) {
        // check if param.key is a number
        if (!param.key || !isNaN(param.key)) {
          continue
        }
        if (JSON.stringify(param.description) === '{}') {
          param.description = ''
        }
        const item = {
          key: param.key,
          description: param.description && param.description.content ?  param.description.content : param.description,
          value: param.value,
          enabled: false
        }
        data.push(item)
      }
      return data
    }
    
    module.exports = {
      requestFromLocal,
      responseFromLocal
    }