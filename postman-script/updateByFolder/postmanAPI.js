require('dotenv').config()
const axiosRetry = require('axios-retry').default
const axios = require('axios')

const handleError = (error) => {
      // Log only essential error details
      if (error.code === 'ECONNABORTED') {
        console.error(`A timeout occurred: ${error.message}`);
      } else if (error.response) {
        // Server responded with a status other than 200 range
        console.error(`Request failed with status: ${error.response.status}`);
      } else if (error.request) {
        // Request was made but no response was received
        console.error('No response received');
      } else {
        // Something else happened in setting up the request
        console.error('Error:', error.message);
      }
  
      // Return a rejected promise to maintain promise chain
      return Promise.reject(error);
}

class Collection {
  constructor (collectionId) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = axios.create({
      timeout: 1000 * 5, // 60 seconds
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey }
    })
    axiosRetry(this.axios, {
      retries: 10,
      retryCondition: (error) => {
        console.log('error, retrying')
        return error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response.status === 429
      }
    })

    //this.axios.interceptors.response.use(response => response, handleError);
  }


  async get () {
    return await this.axios.get(
            `https://api.getpostman.com/collections/${this.collectionId}`
            , { timeout: 1000 * 60 * 5 } // 5 minutes
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error getting collection ${this.collectionId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async merge (destinationCollectionId, strategy = 'updateSourceWithDestination') {
    return await this.axios.post(
      'https://api.getpostman.com/collections/merge',
      { source: this.collectionId, destination: destinationCollectionId, strategy },
      { timeout: 1000 * 60 * 5 } // 5 minutes
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error merging collection from ${this.collectionId} to ${destinationCollectionId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async update (collection) {
    return await this.axios.put(
        `https://api.getpostman.com/collections/${this.collectionId}`,
        collection,
        { timeout: 1000 * 60 * 5 } // 5 minutes
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error updating collection ${collection.id}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }
}

class Folder {
  constructor (collectionId) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = axios.create({
      timeout: 1000 * 5, // 60 seconds
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey }
    })
    axiosRetry(this.axios, {
      retries: 10,
      //retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        console.log('error, retrying')
        return error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response.status === 429
      }
    })
    //this.axios.interceptors.response.use(response => response, handleError);
  }

  async get (folderId) {
    return await this.axios.get(
            `https://api.getpostman.com/collections/${this.collectionId}/folders/${folderId}`
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error getting folder ${folderId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async create (folder) {
    return await this.axios.post(
        `https://api.getpostman.com/collections/${this.collectionId}/folders`,
        folder
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error creating folder ${folder.Id}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async update (folderId, folder) {
    return await this.axios.put(
        `https://api.getpostman.com/collections/${this.collectionId}/folders/${folderId}`,
        folder
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error updating folder ${folder.Id}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async delete (folderId) {
    return await this.axios.delete(
        `https://api.getpostman.com/collections/${this.collectionId}/folders/${folderId}`

    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error deleting folder ${folderId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }
} // class Folder

class Request {
  constructor (collectionId) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = axios.create({
      timeout: 1000 * 5, // 60 seconds
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey }
    })
    axiosRetry(this.axios, {
      retries: 10,
      //retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        console.log('error, retrying')
        return error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response.status === 429
      }
    })
    //this.axios.interceptors.response.use(response => response, handleError);
  }

  async get (requestId) {
    return await this.axios.get(
            `https://api.getpostman.com/collections/${this.collectionId}/requests/${requestId}`
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error getting request ${requestId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async create (request, folderId) {
    return await this.axios.post(
        `https://api.getpostman.com/collections/${this.collectionId}/requests`,
        request,
        { params: { folder: folderId } }
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error creating request ${request.id}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async update (requestId, request) {
    return await this.axios.put(
        `https://api.getpostman.com/collections/${this.collectionId}/requests/${requestId}`,
        request
    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error updating request ${request.id}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }

  async delete (requestId) {
    return await this.axios.delete(
        `https://api.getpostman.com/collections/${this.collectionId}/requests/${requestId}`

    ).then(function (response) {
      if (response.status !== 200) {
        throw new Error(`Error deleting request ${requestId}: ${response.status} ${response.statusText}`)
      } else {
        return response.data
      }
    })
  }
} // class Request

class Response {
  constructor (collectionId) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = axios.create({
      timeout: 1000 * 5, // 60 seconds
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey }
    })
    axiosRetry(this.axios, {
      retries: 10,
      //retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        console.log('error, retrying')
        return error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response.status === 429
      }
    })
    //this.axios.interceptors.response.use(response => response, handleError);
  }

  async get (responseId) {
    return await this.axios.get(
            `https://api.getpostman.com/collections/${this.collectionId}/responses/${responseId}`
    ).then(function (axiosResp) {
      if (axiosResp.status !== 200) {
        throw new Error(`Error getting response ${responseId}: ${axiosResp.status} ${axiosResp.statusText}`)
      } else {
        return axiosResp.data
      }
    })
  }

  async create (response, requestId) {
    return await this.axios.post(
        `https://api.getpostman.com/collections/${this.collectionId}/responses`,
        response,
        { params: { request: requestId } }
    ).then(function (axiosResp) {
      if (axiosResp.status !== 200) {
        throw new Error(`Error creating response ${response.id}: ${axiosResp.status} ${axiosResp.statusText}`)
      } else {
        return axiosResp.data
      }
    })
  }

  async delete (responseId) {
    return await this.axios.delete(
        `https://api.getpostman.com/collections/${this.collectionId}/responses/${responseId}`

    ).then(function (axiosResp) {
      if (axiosResp.status !== 200) {
        throw new Error(`Error deleting response ${responseId}: ${axiosResp.status} ${axiosResp.statusText}`)
      } else {
        return axiosResp.data
      }
    })
  }
} // class Response

module.exports = {
  Collection,
  Folder,
  Request,
  Response
}