  export interface PostmanCollectionAPIResponse {
    collections: Collection[]
  }
  
  export interface Collection {
    id: string
    name: string
    owner: string
    createdAt: string
    updatedAt: string
    uid: string
    isPublic: boolean
    fork?: Fork
  }
  
  export interface Fork {
    label: string
    createdAt: string
    from: string
  }