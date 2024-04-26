export interface PostmanCollectionResponse {
    collection: PostmanCollection
}

export interface PostmanCollection {
    item: PostmanFolder[]
    event: PostmanEvent[]
    variable: PostmanVariable[]
    info: PostmanInfo
    auth: PostmanAuth
  }
  
  export interface PostmanFolder {
    id?: string
    name: string
    description: string
    item: PostmanRequestItem[] | PostmanFolder
  }

  export function isPostmanFolder(item: any): item is PostmanFolder {
    return item && typeof item === "object"
  }

  export function isPostmanRequestItem(item: any): item is PostmanRequestItem[] {
    return Array.isArray(item)
  }
  
  export interface PostmanRequestItem {
    id: string
    name: string
    request: PostmanRequest
    response: PostmanResponse[]
    event: any[]
    protocolProfileBehavior: ProtocolProfileBehavior
    descriptionFormat?: any
    variables?: any
    preRequestScript?: any
    tests?: any
    currentHelper?: any
    helperAttributes?: any
    dataDisabled?: any
    responses_order?: any
  }
  
  export interface PostmanRequest {
    name: string
    description: PostmanDescription | string
    url: Url
    header: PostmanHeader[]
    method: string
    body: Body
    auth?: any
  }

  export function isPostmanDescription(description: any): description is PostmanDescription {
    return typeof description === 'object'
  }
  
  export interface PostmanDescription {
    content?: string
    type?: string
  }
  
  export interface Url {
    path: string[]
    host: string[]
    query: Query[]
    variable: PostmanVariable[]
  }
  
  export interface Query {
    disabled: boolean
    description: PostmanDescription
    key: string
    value: string
  }

  
  export interface PostmanVariable {
    type: string
    value?: string
    key: string
    disabled?: boolean
    description?: PostmanDescription
  }
  
  
  export interface Body {
    mode?: string
    raw?: string
    options?: Options
    formdata?: Formdaum[]
    urlencoded?: any
  }
  
  export interface Options {
    raw: Raw
  }
  
  export interface Raw {
    headerFamily: string
    language: string
  }
  
  export interface Formdaum {
    description: PostmanDescription
    key: string
    value: string
    type: string
  }
  
  export interface PostmanResponse {
    id: string
    name: string
    originalRequest: OriginalRequest
    status: string
    code: number
    header: PostmanHeader[]
    body?: string
    cookie: any[]
    _postman_previewlanguage: string
    responseCode: ResponseCode
  }

  export interface ResponseCode {
    code: string
  }
  
  export interface OriginalRequest {
    url: Url
    header: PostmanHeader[]
    method: string
    body: Body
  }
  
  
  export interface PostmanHeader {
    key: string
    value: string
    disabled?: boolean
    description?: PostmanDescription
  }
  
  export interface ProtocolProfileBehavior {
    disableBodyPruning: boolean
  }
  
  export interface PostmanEvent {
    listen: string
    script: PostmanScript
  }
  
  export interface PostmanScript {
    type: string
    exec: string[]
  }
  
  export interface PostmanInfo {
    _postman_id: string
    name: string
    schema: string
    description: PostmanDescription
  }
  
  
  export interface PostmanAuth {
    type: string
    bearer: Bearer[]
  }
  
  export interface Bearer {
    key: string
    value: string
    type: string
  }
  