import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { EventNames } from '../models/constants';
import { Platform } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class PingService {
    readonly maxErrorCount = 50;
    errorCount = 0;

    event: BehaviorSubject<string> = new BehaviorSubject('');

    constructor(
        private apiService: ApiService,
        private platform: Platform,
    ) {
        this.initializeSubscriptions();
    }

    initializeSubscriptions() {
        if (!this.platform.is('capacitor')) {
            this.subscribeToPing();
        }
    }

    /*
     * Observable for the DataService to subscribe to
     */
    public onEvent(): Observable<string> {
        return this.event.asObservable();
    }

    handleFailure(error) {
        setTimeout(() => {
            this.errorCount += 1;
            this.subscribeToPing();
        }, 1000);
    }

    subscribeToPing() {
        if (this.errorCount > this.maxErrorCount) {
            this.event.next(EventNames.failure);
            this.errorCount = -1 * this.maxErrorCount;
        }

        this.apiService.pingServer().then(
            (messageResponse) => {
                this.errorCount = 0;
                this.subscribeToPing();
                if (messageResponse.messages) {
                    this.event.next(EventNames.retrieve);
                }
            },
            (error) => {
                this.handleFailure(error);
            }
        );
    }
}
