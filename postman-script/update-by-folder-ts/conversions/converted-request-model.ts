import { PostmanResponse } from "../models/postman-collection";
import { convertedResponse } from "./converted-response-model";

export interface convertedRequest {
    id?: any;
    name?: any;
    dataMode?: any;
    data?: any[];
    auth?: any;
    events?: any;
    rawModeData?: any;
    descriptionFormat?: any;
    description?: any;
    headers?: any[];
    headerData?: any[];
    variables?: any;
    method?: any;
    pathVariables?: any[];
    pathVariableData?: any[];
    url?: string;
    preRequestScript?: any;
    tests?: any;
    currentHelper?: any;
    helperAttributes?: any;
    queryParams?: any[];
    protocolProfileBehavior?: any;
    dataDisabled?: any;
    responses_order?: any;
    responses?: convertedResponse[];
    folder?: any;
    collection?: any;
    dataOptions?: any;
}