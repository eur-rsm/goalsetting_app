import { AuthService } from './core/auth.service';
import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { OneSignal } from '@ionic-native/onesignal/ngx';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Plugins } from '@capacitor/core';

const { SplashScreen } = Plugins;

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent {

    private status: BehaviorSubject<boolean> = new BehaviorSubject(true);

    constructor(
        private platform: Platform,
        private authService: AuthService,
        private oneSignal: OneSignal,
    ) {
        this.initializeApp();
    }

    initializeApp() {
        this.platform.ready().then(() => {
            SplashScreen.hide();
            this.authService.startUpAsync();

            if (this.platform.is('capacitor')) {
                this.initializeNotifications();
                this.platform.resume.subscribe(() => {
                    this.oneSignal.clearOneSignalNotifications();
                });
            }
        });
    }

    /**
     * Handle creating notifications
     */
    private initializeNotifications() {
        // OneSignal Code start:
        this.oneSignal.startInit(environment.oneSignalAppId, environment.googleProjectId);
        this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.None);
        this.oneSignal.handleNotificationOpened().subscribe(() => {
            this.oneSignal.clearOneSignalNotifications();
            this.status.next(!this.status.getValue());
        });
        this.oneSignal.handleNotificationReceived().subscribe(() => {
            this.status.next(!this.status.getValue());
        });
        this.oneSignal.endInit();

        // Allow backend to signal this device
        this.authService.authObservable.subscribe((action) => {
            if (action.tokenResponse) {
                const decoded = this.authService.decodedToken(action.tokenResponse);
                this.oneSignal.setExternalUserId(decoded['sub']);
            }
        });
    }

    /*
     * Observable for the Home Page to subscribe to
     */
    public onNotificationOpened(): Observable<boolean> {
        return this.status.asObservable();
    }
}
