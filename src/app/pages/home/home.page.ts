import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { StorageBackend } from '@openid/appauth';
import { AlertController, IonContent, IonInput, Platform, ToastController } from '@ionic/angular';
import { EventNames, StorageNames } from '../../models/constants';
import { Button } from '../../models/button';
import { ModalController } from '@ionic/angular';
import { ModalPage } from '../modal/modal.page';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { AuthService } from '../../core/auth.service';
import { AppComponent } from '../../app.component';
import { OneSignal } from '@ionic-native/onesignal/ngx';
import { AuthActions } from 'ionic-appauth';
import { Plugins } from '@capacitor/core';
import { DataService } from '../../core/data.service';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';


const {Network} = Plugins;

@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
    @ViewChild(IonContent, {read: false, static: true}) content: IonContent;
    @ViewChild(CdkVirtualScrollViewport, {static: true}) viewport: CdkVirtualScrollViewport;
    @ViewChild('input', {static: false}) inputElement: IonInput;

    connected = false;
    isFront = false;
    warning = '';
    userInput: string;
    userSynced = false;
    // Dirty hack, as double click doesn't work on iOS : WTF!
    prevClick: number = Date.now();

    constructor(
        public authService: AuthService,
        private router: Router,
        private platform: Platform,
        private storage: StorageBackend,
        private alertController: AlertController,
        private toastController: ToastController,
        private appComponent: AppComponent,
        private oneSignal: OneSignal,
        private modalController: ModalController,
        public dataService: DataService,
        private changeDetector: ChangeDetectorRef,
        private apiService: ApiService,
    ) {
    }

    ngOnInit() {
        this.initializeSubscriptions();
        this.warning = 'Initializing ';
    }

    ionViewDidEnter() {
        this.storage.getItem(StorageNames.userInput).then(userInput => {
            this.userInput = userInput;
            this.storage.removeItem(StorageNames.userInput);
        });
        this.dataService.addPayloadSync();
    }

    initializeSubscriptions() {
        this.authService.authObservable.subscribe((action) => {
            if (action.action !== AuthActions.SignInSuccess &&
                action.action !== AuthActions.AutoSignInSuccess) {
                this.router.navigate(['login']);
            }
        });

        Network.addListener('networkStatusChange', (status) => {
            if (status.connected) {
                this.connected = true;
                setTimeout(() => {
                    this.dataService.addPayloadSync();
                }, 1000);
            } else {
                this.connected = false;
            }
        });

        this.appComponent.onNotificationOpened().subscribe(() => {
            this.dataService.addPayloadSync();
        });

        this.platform.pause.subscribe(() => {
            this.isFront = false;
        });
        this.platform.resume.subscribe(() => {
            this.isFront = true;
            this.dataService.addPayloadSync();
        });

        this.dataService.onEvent().subscribe(result => {
            if (result === EventNames.prepare) {
                this.prepareInterface();
            } else if (result === EventNames.failure) {
                this.showAlert('Error connecting to server, please try again later');
            }
        });

        this.dataService.onSyncing().subscribe(result => {
            if (result) {
                this.warning = 'Iki typing ';
            } else {
                this.warning = '';
            }
            this.changeDetector.detectChanges();
            setTimeout(() => {
                if (this.inputElement && !this.platform.is('capacitor')) {
                    this.inputElement.setFocus();
                }
            }, 1000);
        });
    }

    /*
     * The user initiated the syncing
     * Therefore clear input after (successful) transmission
     */
    sendMessage() {
        this.userSynced = true;
        this.dataService.addPayloadSync(this.userInput);
        this.warning = 'Iki typing ';
        this.scrollDown();
    }

    /*
     * User clicked one of the buttons presented by the bot
     * Translate to userINput and send add 'normal' input
     */
    buttonClicked(button: Button) {
        this.userInput = button.payload;
        this.sendMessage();
    }

    /*
     * User wants to report the conversation for review
     */
    report() {
        this.dataService.addPayloadSync('/report_bot');
    }

    /*
     * User want to see the help modal, with fresh text from server
     * If we store locally, we can't update server side.
     */
    async showHelp() {
        const helpText = await this.apiService.getConfig().then(
            (result) => {
                return result.config.helpText;
            },
            (error) => {
                console.warn(error);
                return 'There was an error, try again later';
            }
        );
        await this.showModal(helpText);
    }

    /*
     * User want to see the info modal, with fresh text from server
     * If we store locally, we can't update server side.
     */
    async showInfo() {
        const infoText = await this.apiService.getConfig().then(
            (result) => {
                return result.config.infoText;
            },
            (error) => {
                console.warn(error);
                return 'There was an error, try again later';
            }
        );
        await this.showModal(infoText);
    }

    userTyping(event: any) {
        this.scrollDown();
        // Only for browser
        if (event.key === 'Enter') {
            this.sendMessage();
        } else {
            this.measureOverFlow(event);
        }
    }

    measureOverFlow(event: any) {
        const inputTag = document.getElementsByName('ion-input-0')[0];
        if (!inputTag) {
            return;
        }
        const style = window.getComputedStyle(inputTag, null);
        const availableWidth = inputTag.offsetWidth
            - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
            - parseFloat(style.marginLeft) - parseFloat(style.marginRight)
            - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);

        const newText = (this.userInput || '') + event.key;
        const canvas = document.getElementById('textWidthCanvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        ctx.font = `${style['font-size']} ${style['font-family']}`;
        const actualWidth = ctx.measureText(newText).width;

        if (actualWidth >= availableWidth) {
            this.showModal();
        }
    }

    scrollDown(delay: number = 50) {
        if (delay < 0) {
            return;
        }

        setTimeout(() => {
            if (this.viewport) {
                this.viewport.checkViewportSize();
                this.viewport.scrollToIndex(this.viewport.getDataLength() + 1000, 'auto');
                this.scrollDown(delay - 10);
            }
        }, delay);
    }

    // This is called from messageService.handleReceivedMessages
    prepareInterface() {
        // User initiated sync, clear input
        if (this.userSynced) {
            this.userInput = '';
            this.userSynced = false;
        }

        this.scrollDown();
    }

    /**
     * Present an alert to the user
     */
    async showAlert(message) {
        setTimeout(() => {
            this.alertController.getTop().then(top => {
                if (top !== undefined) {
                    this.alertController.dismiss(top);
                }
                const alert = this.alertController.create({
                    message,
                    header: 'Error',
                    buttons: [
                        {
                            text: 'Reload',
                            handler: () => {
                                this.router.navigate(['login']);
                            }
                        }, {
                            text: 'OK'
                        }
                    ]
                });
                alert.then(a => a.present());
            });
        }, Math.random() * 100);
    }

    /**
     * Present a toast to the user
     */
    async showToast(message, duration = 0, header?) {
        if (!header) {
            header = 'Warning';
        }
        const toast = await this.toastController.create({
            header,
            message,
            duration,
            position: 'middle',
        });
        toast.present();
    }

    /**
     * Show a modal to the user
     * If there is a message, show this (for displaying large utterances or info/help)
     * If no message, this becomes an inputmodal for large texts
     */
    async showModal(message?: string, event?: Event) {
        // It's a click on a message, check if it's a double click
        if (event !== undefined) {
            const diff = Date.now() - this.prevClick;
            this.prevClick = Date.now();
            if (diff > 500) {
                return;
            }
        }

        let inputModal = false;
        if (event !== undefined) {
            // User double-clicked on message
            event.stopPropagation();
        }
        if (message === undefined) {
            message = this.userInput;
            inputModal = true;
        }

        const modal: HTMLIonModalElement =
            await this.modalController.create({
                component: ModalPage,
                componentProps: {
                    userInput: message,
                    botMessage: this.dataService.lastMessage(),
                    inputModal,
                },
                cssClass: 'user-input-modal',
                backdropDismiss: false,
            });

        if (inputModal) {
            modal.onDidDismiss().then((detail) => {
                if (detail.data !== null && detail.data !== undefined) {
                    this.userInput = detail.data;
                    this.sendMessage();
                }
            });
        }

        return await modal.present();
    }
}
