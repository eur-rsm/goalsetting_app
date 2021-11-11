import { Requestor, StorageBackend, TokenResponse } from '@openid/appauth';
import { Platform } from '@ionic/angular';
import { Injectable, NgZone } from '@angular/core';
import { IonicAuth, Browser } from 'ionic-appauth';
import { Plugins } from '@capacitor/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from 'src/environments/environment';
import { StorageNames } from '../models/constants';

const { App } = Plugins;

@Injectable({
    providedIn: 'root'
})
export class AuthService extends IonicAuth {

    constructor(
        requestor: Requestor,
        storage: StorageBackend,
        browser: Browser,
        private platform: Platform,
        private ngZone: NgZone,
    ) {
        super(browser, storage, requestor);

        this.addConfig();
    }

    public async startUpAsync() {
        if (this.platform.is('capacitor')) {
            App.addListener('appUrlOpen', (data: any) => {
                if (data.url !== undefined) {
                    this.ngZone.run(() => {
                        this.handleCallback(data.url);
                    });
                }
            });
        }

        super.startUpAsync();
    }

    private addConfig() {
        const authConfig: any = {
            identity_server: environment.oidcUrl,
            identity_client: environment.clientId,
            redirect_url: environment.redirectUri,
            end_session_redirect_url: environment.logoutRedirectUri,
            scopes: environment.scopes,
            usePkce: true,
        };

        this.authConfig = { ...authConfig };
    }

    async getToken(): Promise<TokenResponse> {
        let token: TokenResponse = await this.getValidToken();
        /* TODO This will never work, as the refresh token is undefined
        if (this.isExpired(token)) {
            await this.requestRefreshToken(token);
            token = await this.getValidToken();
        }
        */
        return token;
    }

    decodedToken(tokenResponse: TokenResponse): any {
        if (!tokenResponse || !tokenResponse.idToken) {
            return null;
        }

        const helper = new JwtHelperService();
        return helper.decodeToken(tokenResponse.idToken);
    }

    // TODO Only used in getToken
    isExpired(tokenResponse: TokenResponse): boolean {
        if (!tokenResponse || !tokenResponse.idToken) {
            return true;
        }
        const helper = new JwtHelperService();
        return helper.isTokenExpired(tokenResponse.idToken);
    }

    private handleCallback(callbackUrl: string): void {
        if ((callbackUrl).indexOf(this.authConfig.redirect_url) === 0) {
            this.AuthorizationCallBack(callbackUrl);
        }

        if ((callbackUrl).indexOf(this.authConfig.end_session_redirect_url) === 0) {
            this.EndSessionCallBack();
        }
    }
}
