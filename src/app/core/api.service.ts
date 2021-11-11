import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageResponse } from '../models/messageResponse';
import { StorageNames } from '../models/constants';
import { AuthService } from './auth.service';
import { StorageBackend, TokenResponse } from '@openid/appauth';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private messagesUrl = `${environment.apiUrl}messages/`;
    private configUrl = `${environment.apiUrl}config/`;
    private pingUrl = `${environment.apiUrl}ping/`;
    private logUrl = `${environment.apiUrl}log/`;

    constructor(
        private httpClient: HttpClient,
        private authService: AuthService,
        private storage: StorageBackend,
    ) {
    }

    getHttpOptions(token?: TokenResponse): object {
        const entries = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        if (token !== undefined) {
            entries['Access-Token'] = `${token.accessToken}`;
            entries['Authorization'] = `JWT ${token.idToken}`;
        }

        return {headers: new HttpHeaders(entries)};
    }

    private async preparePostData(data): Promise<string> {
        const storedString = await this.storage.getItem(StorageNames.config);
        const storedConfig = JSON.parse(storedString) || {};
        data = {...data, ...storedConfig};
        return JSON.stringify(data);
    }

    /*
     * Send message to the server, if there is user input
     * Always receive new messages from the server
     */
    async syncMessages(lastCall: number, msg: string): Promise<MessageResponse> {
        const token: TokenResponse = await this.authService.getToken();
        const options = this.getHttpOptions(token);
        const postData = await this.preparePostData({ fromstamp: lastCall, text: msg });
        return this.httpClient.post<MessageResponse>(this.messagesUrl, postData, options).toPromise();
    }

    /*
     * Ping (long) the server to check for new messages
     */
    async pingServer(): Promise<MessageResponse> {
        const token: TokenResponse = await this.authService.getToken();
        const options = this.getHttpOptions(token);
        const postData = await this.preparePostData({});
        return this.httpClient.post<MessageResponse>(this.pingUrl, postData, options).toPromise();
    }

    /*
     * Get some config from the server
     */
    async getConfig(): Promise<MessageResponse> {
        const token: TokenResponse = await this.authService.getToken();
        const options = this.getHttpOptions(token);
        const postData = await this.preparePostData({});
        return this.httpClient.post<MessageResponse>(this.configUrl, postData, options).toPromise();
    }

    /*
     * Send some log string via the API
     * Prolly only used for development
     */
    async sendLog(msg: string) {
        const token: TokenResponse = await this.authService.getToken();
        const options = this.getHttpOptions(token);
        const postData = await this.preparePostData({text: msg});
        this.httpClient.post(this.logUrl, postData, options)
            .subscribe(data => {
                console.log(data);
            }, error => {
                console.log(postData);
                console.log(error);
            });
    }
}
