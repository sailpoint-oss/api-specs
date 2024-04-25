import axios, { AxiosInstance } from "axios"
import axiosRetry from "axios-retry"

export interface Params {
    [key: string]: string | number | boolean
}

export class AxiosWrapper {
    httpClient: AxiosInstance;
    constructor(baseUrl: string) {
        this.httpClient = axios.create({
            baseURL: baseUrl, 
            timeout: 1000 * 60 * 5
        })

        // Wrap our Axios HTTP client in an Axios retry object to automatically
        // handle rate limiting.  By default, this logic will retry a given
        // API call 3 times before failing.  Read the documentation for 
        // axios-retry on NPM to see more configuration options.
        axiosRetry(this.httpClient, {
            retries: 15,
            retryDelay: axiosRetry.exponentialDelay,
            shouldResetTimeout: true,
            retryCondition: (error) => {
                if (error.response) {
                    if (error.response.status === 429) {
                        console.log('Rate limited, retrying...')
                        return true;
                    }
                } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error)) {
                    console.log('Network error, retrying...')
                    return true;
                } else {
                    return false;
                }
                return false;
            }
            
        })
    }

    async get<T = any>(url: string, data?: any) {
        return this.httpClient.get<T>(url, data);
    }

    async post<T = any>(url: string, data?: any, headers?: any) {
        return this.httpClient.post<T>(url, data, headers);
    }

    async delete<T = any>(url: string, data?: any) {
        return this.httpClient.delete<T>(url, data);
    }

    async put<T = any>(url: string, data?: any, headers?: any) {
        return this.httpClient.put<T>(url, data, headers);
    }

}