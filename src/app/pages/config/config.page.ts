import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StorageNames } from '../../models/constants';
import { Router } from '@angular/router';
import { StorageBackend } from '@openid/appauth';


@Component({
    selector: 'app-config',
    templateUrl: './config.page.html',
    styleUrls: ['./config.page.scss'],
})
export class ConfigPage implements OnInit {
    storedConfig = {};
    neededConfig = [];

    radioList = [];
    title = '';
    body = '';
    name = '';
    value = '';

    constructor(
        private platform: Platform,
        private router: Router,
        private storage: StorageBackend,
    ) {
    }

    async ngOnInit() {
        const storedString = await this.storage.getItem(StorageNames.config);
        this.storedConfig = JSON.parse(storedString) || {};

        const neededString = await this.storage.getItem(StorageNames.configNeeded);
        this.neededConfig = JSON.parse(neededString) || [];

        for (const neededItem of this.neededConfig) {
            if (!Object.keys(this.storedConfig).includes(neededItem.name)) {
                this.title = neededItem.title;
                this.body = neededItem.body;
                this.name = neededItem.name;
                this.radioList = neededItem.choices;
                this.value = '';
                return;
            }
        }

        // All needed config is already stored
        this.router.navigate(['home']);
    }

    setValue(event) {
        this.value = event.detail.value;
    }

    async saveConfig() {
        if (!this.value) {
            return;
        }

        this.storedConfig[this.name] = this.value;
        this.storage.setItem(StorageNames.config, JSON.stringify(this.storedConfig))
            .then(() => {
                this.ngOnInit();
            });
    }
}
