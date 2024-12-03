require('dotenv').config()
import { v1 as uuidv1 } from 'uuid'
import { AxiosWrapper } from './axios-wrapper'
import { PostmanCollectionResponse, PostmanFolder } from './models/postman-collection'
import { ForkResponse } from './models/postman-fork-response'
import { PostmanCollectionAPIResponse } from './models/postman-collections-response'

export class Collection {
  axios: AxiosWrapper
  apiKey: string
  collectionId: string

  constructor (collectionId: string) {
    this.collectionId = collectionId
    this.apiKey = process.env.POSTMAN_API_KEY
    this.axios = new AxiosWrapper('https://api.getpostman.com/collections', this.apiKey)
    console.log(`postman API key: ${process.env.POSTMAN_API_KEY.substring(0, 6)}`)
  }


  async get (): Promise<PostmanCollectionResponse> {
    try {
        let response = await this.axios.get( `/${this.collectionId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting collection ${this.collectionId} error: ${error}`)
    }
  }

  async getAllCollections (): Promise<PostmanCollectionAPIResponse> {
    try {
        let response = await this.axios.get(``)
        return response.data
    } catch (error) {
        throw new Error(`Error getting collection ${this.collectionId} error: ${error}`)
    }
  }

  async delete (): Promise<PostmanCollectionResponse> {
    try {
        let response = await this.axios.delete( `/${this.collectionId}`)
        return response.data
    } catch (error) {
        throw new Error(`Error getting collection ${this.collectionId} error: ${error}`)
    }
  }

  
  async fork ( publicWorkspaceId: string, forkLabel: string): Promise<ForkResponse> {
    try {
        const response = await this.axios.post(`/fork/${this.collectionId}?workspace=${publicWorkspaceId}`,{ label: forkLabel})
        return response.data
    } catch (error) {
        throw new Error(`Error forking collection ${this.collectionId} error: ${error}`)
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

