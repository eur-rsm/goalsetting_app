import { Injectable } from '@angular/core';
import { StorageBackend } from '@openid/appauth';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { Message } from '../models/message';
import { Platform } from '@ionic/angular';
import { Button } from '../models/button';
import { EventNames, StorageNames } from '../models/constants';
import { MessageResponse } from '../models/messageResponse';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { PingService } from './ping.service';
import { SQLiteService } from './sqlite.service';


@Injectable({
    providedIn: 'root'
})
export class DataService {
    readonly maxErrorCount = 10;
    readonly dripTimeout = 750;
    errorCount = 0;

    syncing: BehaviorSubject<boolean> = new BehaviorSubject(false);
    event: BehaviorSubject<string> = new BehaviorSubject('');
    messages: BehaviorSubject<Message[]> = new BehaviorSubject([]);
    buttons: BehaviorSubject<Button[]> = new BehaviorSubject([]);
    payloads: string[] = [];

    constructor(
        private apiService: ApiService,
        private router: Router,
        private storage: StorageBackend,
        private platform: Platform,
        private pingService: PingService,
        private sqliteService: SQLiteService,
    ) {
        this.initialize();
    }

    initialize() {
        if (this.platform.is('capacitor')) {
            this.initializeDB();
        }

        this.initializeSubscriptions();
    }

    async initializeDB() {
        this.syncing.next(true);

        await this.sqliteService.initializePlugin();
        const result = await this.sqliteService.selectMessagesDB();
        await this.setMessages(result.values);
        await this.setButtons(true);

        this.syncing.next(false);
        this.addPayloadSync();
    }

    initializeSubscriptions() {
        this.pingService.onEvent().subscribe(result => {
            if (result === EventNames.failure) {
                this.event.next(EventNames.failure);
            } else if (result === EventNames.retrieve) {
                this.addPayloadSync();
            }
        });
    }

    /*
     * Observables for the Home Page to subscribe to
     */
    public onEvent(): Observable<string> {
        return this.event.asObservable();
    }

    public onSyncing(): Observable<boolean> {
        return this.syncing.asObservable();
    }

    public onMessages(): Observable<Message[]> {
        return this.messages.asObservable();
    }

    public onButtons(part?: number): Observable<Button[]> {
        // Assume all fit if not more then 8, otherwise let CSS take care of it
        if (part === undefined) {
            return this.buttons.asObservable();
        }

        // If more than 8, divide into 2 rows
        let half = this.buttons.value.length;
        if (this.buttons.value.length > 8) {
            half = Math.ceil(this.buttons.value.length / 2);
        }
        if (part === 0) {
            return of(this.buttons.value.slice(0, half));
        } else {
            return of(this.buttons.value.slice(half));
        }
    }

    public hasButtons(part?: number): boolean {
        if (part === 1) {
            return this.buttons.getValue().length > 8;
        }
        return this.buttons.getValue().length > 0;
    }

    public lastMessage(): string {
        return this.messages.value[this.messages.value.length - 1].text || '';
    }

    public lastCall(): number {
        const lastMessage = this.messages.value[this.messages.value.length - 1];
        if (lastMessage) {
            return lastMessage.timestamp;
        } else {
            return 0;
        }
    }

    public addPayloadSync(payload?: string) {
        // Ignore this (sync-only) call if already syncing
        if (this.syncing.value && !payload) {
            return;
        }

        // Add new payloads, strip HTML
        payload = payload || '';
        payload = payload.replace(/(<([^>]+)>)/gi, '');
        if (this.payloads.indexOf(payload) === -1) {
            this.payloads.push(payload);
        }

        // Remove empty payloads if we have a better one
        while (this.payloads.length > 1 && this.payloads.includes('')) {
            this.payloads.splice(this.payloads.indexOf(''), 1);
        }

        // Make sure restart after X errors
        if (this.syncing.value) {
            this.errorCount += 1;
        }

        // Regardless of payload, always sync
        this.scheduleSync();
    }

    private async setMessages(messages: Message[]) {
        messages = await messages.sort((m1, m2) => m1.timestamp - m2.timestamp);
        await this.messages.next(messages);
        await this.event.next(EventNames.prepare);
    }

    private async setButtons(fromMemory?: boolean) {
        if (fromMemory) {
            const storedString = await this.storage.getItem(StorageNames.buttons);
            const storedButtons = JSON.parse(storedString) || [];
            this.buttons.next(storedButtons);
            return;
        }

        if (this.messages.value.length > 0) {
            const lastMessage: Message = this.messages.value[this.messages.value.length - 1];
            const buttons: Button[] = lastMessage.buttons || [];
            this.buttons.next(buttons);
            await this.storage.setItem(StorageNames.buttons, JSON.stringify(buttons));
        }
    }

    private async handleReceivedMessages(messageResponse: MessageResponse) {
        // Add received messages to DB and local the collection
        const messages: Message[] = this.messages.value;
        let lastCall = this.lastCall();
        for (let message of messageResponse.messages) {
            message = this.formatMessageText(message, lastCall);
            // Push to DB if on device
            await this.sqliteService.insertMessagesDB(message);
            // Push to collection, will be shown in redraw
            messages.push(message);
            lastCall = Math.max(lastCall, message.timestamp);
        }

        this.setMessages(messages);
        await this.setButtons();
    }

    private async handleReceivedMessagesDrip(messageResponse: MessageResponse) {
        const addOneMessage = (remaining, parent) => {
            let message = remaining.shift();
            const lastCall = parent.lastCall();
            message = this.formatMessageText(message, lastCall);
            // Push to DB if on device
            this.sqliteService.insertMessagesDB(message);
            this.setMessages([...parent.messages.value, message]);

            if (remaining.length === 0) {
                parent.setButtons();
                parent.errorCount = 0;
                return;
            }

            setTimeout(addOneMessage, this.dripTimeout, remaining, parent);
        };

        addOneMessage([...messageResponse.messages], this);
    }

    private async handleReceivedConfig(messageResponse: MessageResponse) {
        const config = messageResponse.config;
        // Nothing to ask the user
        if (!config) {
            return;
        }

        // Check if we need to ask user config
        const storedString = await this.storage.getItem(StorageNames.config);
        const storedConfig = JSON.parse(storedString) || {};
        const configKeys = Object.keys(storedConfig || []);
        for (const neededConfig of config) {
            if (!configKeys.includes(neededConfig.name)) {
                this.storage.setItem(StorageNames.configNeeded,
                    JSON.stringify(config)
                ).then(() => {
                    this.router.navigate(['config']);
                });
                break;
            }
        }
    }

    private handleFailure(error, payload: string) {
        this.payloads.unshift(payload);
        if (this.errorCount < this.maxErrorCount) {
            this.errorCount += 1;
            this.scheduleSync(10000);
        } else {
            console.error('failure');
            console.error(error);
            this.errorCount = 0;
            this.event.next(EventNames.failure);
        }
    }

    private async scheduleSync(delay?: number) {
        // Nothing to sync
        if (this.payloads.length === 0) {
            return;
        }

        if (!this.syncing.value && !delay) {
            await this.syncMessages();
        } else {
            setTimeout(() => {
                this.scheduleSync();
            }, delay || 10000);
        }
    }

    private async syncMessages() {
        this.syncing.next(true);

        const payload = this.payloads.shift();
        const lastCall = this.lastCall();
        let dripCount = 0;
        this.apiService.syncMessages(lastCall, payload)
            .then(
                (messageResponse) => {
                    if (messageResponse.messages.length > 10) {
                        this.handleReceivedMessages(messageResponse);
                    } else if (messageResponse.messages.length > 0) {
                        dripCount = messageResponse.messages.length;
                        this.handleReceivedMessagesDrip(messageResponse);
                    }
                    this.handleReceivedConfig(messageResponse);
                    this.errorCount = 0;
                },
                (error) => {
                    this.handleFailure(error, payload);
                }
            )
            .finally(
                () => {
                    setTimeout(() => {
                        this.syncing.next(false);
                    }, (this.dripTimeout + 2) * dripCount);
                }
            );
    }

    //////////////////////////////////////////////////////////////////////////
    // Convenience functions
    //////////////////////////////////////////////////////////////////////////
    formatDate(msgTimestamp: number, lastCall: number): string {
        // Only show date is differs from previous message
        const msgDate = new Date(msgTimestamp);
        const lastDate = new Date(lastCall);
        if (msgDate.toDateString() !== lastDate.toDateString()) {
            return msgDate.toDateString();
        } else {
            return '';
        }
    }

    formatTime(timestamp: number): string {
        const msgDate = new Date(timestamp);
        let hours: any = msgDate.getHours();
        hours = hours < 10 ? '0' + hours : hours;
        let minutes: any = msgDate.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes}`;
    }

    formatMessageText(message: Message, lastCall: number): Message {
        // Massage the messages for the output
        message.text = message.text.split('\\n').join('<br/>').trim();
        message.text = message.text.split('\n').join('<br/>').trim();

        // Set date and time string if they differ from previous
        message.dateString = this.formatDate(message.timestamp, lastCall);
        message.timeString = this.formatTime(message.timestamp);

        return message;
    }

    // Just for development
    async logLocal(msg: string) {
        this.messages.value.push({
            text: `LOCAL : ${msg}`,
            username: 'bot',
            dateString: this.formatDate(Date.now(), this.lastCall()),
            timestamp: new Date().getTime()
        });

        this.event.next(EventNames.prepare);
    }
}
