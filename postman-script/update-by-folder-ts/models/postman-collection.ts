export interface PostmanCollection {
    item: Folder[]
    event: Event[]
    variable: Variable[]
    info: Info
    auth: Auth
  }
  
  export interface Folder {
    name: string
    description: string
    item: RequestItem[]
  }
  
  export interface RequestItem {
    id: string
    name: string
    request: Request
    response: Response[]
    event: any[]
    protocolProfileBehavior: ProtocolProfileBehavior
  }
  
  export interface Request {
    name: string
    description: Description
    url: Url
    header: Header[]
    method: string
    body: Body
  }
  
  export interface Description {
    content?: string
    type?: string
  }
  
  export interface Url {
    path: string[]
    host: string[]
    query: Query[]
    variable: Variable[]
  }
  
  export interface Query {
    disabled: boolean
    description: Description
    key: string
    value: string
  }

  
  export interface Variable {
    type: string
    value?: string
    key: string
    disabled?: boolean
    description?: Description
  }
  
  
  export interface Body {
    mode?: string
    raw?: string
    options?: Options
    formdata?: Formdaum[]
  }
  
  export interface Options {
    raw: Raw
  }
  
  export interface Raw {
    headerFamily: string
    language: string
  }
  
  export interface Formdaum {
    description: Description
    key: string
    value: string
    type: string
  }
  
  export interface Response {
    id: string
    name: string
    originalRequest: OriginalRequest
    status: string
    code: number
    header: Header[]
    body?: string
    cookie: any[]
    _postman_previewlanguage: string
  }
  
  export interface OriginalRequest {
    url: Url
    header: Header[]
    method: string
    body: Body
  }
  
  
  export interface Header {
    key: string
    value: string
    disabled?: boolean
    description?: Description
  }
  
  export interface ProtocolProfileBehavior {
    disableBodyPruning: boolean
  }
  
  export interface Event {
    listen: string
    script: Script
  }
  
  export interface Script {
    type: string
    exec: string[]
  }
  
  export interface Info {
    _postman_id: string
    name: string
    schema: string
    description: Description
  }
  
  
  export interface Auth {
    type: string
    bearer: Bearer[]
  }
  
  export interface Bearer {
    key: string
    value: string
    type: string
  }
  