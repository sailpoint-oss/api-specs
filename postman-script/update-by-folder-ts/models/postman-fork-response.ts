export interface ForkResponse {
    collection: Collection
  }
  
  export interface Collection {
    id: string
    name: string
    fork: Fork
    uid: string
  }
  
  export interface Fork {
    label: string
    createdAt: string
    from: string
  }
  