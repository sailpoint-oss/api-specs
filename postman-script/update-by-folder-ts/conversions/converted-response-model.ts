export interface convertedResponse {
    id: any;
    name: any;
    status: any;
    responseCode: {
        code: any;
        name: any;
        detail: string;
    };
    headers: any[];
    cookies: any[];
    mime: any;
    text: any;
    language: string;
    rawDataType: string;
    requestObject: any;
}