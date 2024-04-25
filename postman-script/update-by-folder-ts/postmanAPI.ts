require('dotenv').config()
const axiosRetry = require('axios-retry').default
import axios, { AxiosInstance } from 'axios'
import { v1 as uuidv1 } from 'uuid'
import { AxiosWrapper } from './axios-wrapper'

export class Collection {
  axios: AxiosWrapper
  apiKey: string
  collectionId: string

  constructor (collectionId: string) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = new AxiosWrapper('https://api.getpostman.com/collections')
  }


  async get (): Promise<any> {
    try {
        let response = await this.axios.get( `/${this.collectionId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting collection ${this.collectionId} error: ${error}`)
    }
  }

  async merge (destinationCollectionId, strategy = 'updateSourceWithDestination'): Promise<any> {
    try {
        const response = await this.axios.post('/merge',{ source: this.collectionId, destination: destinationCollectionId, strategy })
        return response.data
    } catch (error) {
        throw new Error(`Error merging collection ${this.collectionId} error: ${error}`)
    }
  }

  async update (collection): Promise<any> {
    try {
        const response = await this.axios.put(`/${this.collectionId}`, collection)
        return response.data
    } catch (error) {
        throw new Error(`Error updating collection ${this.collectionId} error: ${error}`)
    }
  }
}

export class Folder {
    axios: AxiosWrapper
    apiKey: string
    collectionId: string

  constructor (collectionId: string) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = new AxiosWrapper(`https://api.getpostman.com/collections/${this.collectionId}/folders`)
  }

  async get (folderId: string): Promise<any> {
    try {
        const response = await this.axios.get(`/${folderId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting folder ${folderId} error: ${error}`)
    }
  }

  async create (folder: any): Promise<any> {
    try {
        const response = await this.axios.post(``, folder)
        return response.data
    } catch (error) {
        throw new Error(`Error creating folder ${folder.Id} error: ${error}`)
    }
  }

  async update (folderId: string, folder: any): Promise<any> {
    try {
        const response = await this.axios.put(`/${folderId}`, folder)
        return response.data
    } catch (error) {
        throw new Error(`Error updating folder ${folder.Id} error: ${error}`)
    }
  }

  async delete (folderId): Promise<any> {

    try {
        const response = await this.axios.delete(`/${folderId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error deleting folder ${folderId} error: ${error}`)
    }
  }
} // class Folder

export class Request {
    axios: AxiosWrapper
    apiKey: string
    collectionId: string

  constructor (collectionId: string) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = new AxiosWrapper(`https://api.getpostman.com/collections/${this.collectionId}/requests`)
  }


  async get (requestId: string): Promise<any> {
    try {
        const response = await this.axios.get(`/${requestId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting request ${requestId} error: ${error}`)
    }
  }

  async create (request: any, folderId: string): Promise<any> {
    if (request.id) {
      request.id = uuidv1()
      for (let response of request.responses) {
        if (response.id) {
          response.id = uuidv1()
        }
      }
    }
    try {
        const response = await this.axios.post(``, request, { params: { folder: folderId } })
        return response.data
    } catch (error) {
        throw new Error(`Error creating request ${request.id} error: ${error}`)
    }
  }

  async update (requestId, request): Promise<any> {
    try {
        const response = await this.axios.put(`/${requestId}`,request)
        return response.data
    } catch (error) {
        throw new Error(`Error updating request ${request.id} error: ${error}`)
    }
  }

  async delete (requestId): Promise<any> {
    try {
        const response = await this.axios.delete(`/${requestId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error deleting request ${requestId} error: ${error}`)
    }
  }
} 

export class Response {
    axios: AxiosWrapper
    apiKey: string
    collectionId: string

  constructor (collectionId: string) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = new AxiosWrapper(`https://api.getpostman.com/collections/${this.collectionId}/responses`)
  }

  async get (responseId: string) {
    try {
        const response = await this.axios.get(`/${responseId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting response ${responseId} error: ${error}`)
    }

  }

  async create (responseObject: any, responseId: string) {
    try {
        const response = await this.axios.post(``, responseObject, { params: { request: responseId } })
        return response.data
    } catch (error) {
        throw new Error(`Error creating response ${responseObject.id} error: ${error}`)
    }
  }

  async update (responseObject: any, responseId: string) {
    try {
        const response = await this.axios.put(`/${responseId}`, responseObject)
        return response.data
    } catch (error) {
        throw new Error(`Error creating response ${responseObject.id} error: ${error}`)
    }
  }

  async delete (responseId: string) {
    try {
        const response = await this.axios.delete(`/${responseId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error deleting response ${responseId} error: ${error}`)
    }

  }
}
