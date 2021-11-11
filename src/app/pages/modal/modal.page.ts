import { Component } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.page.html',
    styleUrls: ['./modal.page.scss'],
})
export class ModalPage {
    userInput: string;
    botMessage: string;
    inputModal: boolean;
    saveHelp = 'Submit the text below';
    dismissHelp = 'Dismiss the text below';

    constructor(
        private modalController: ModalController,
        private navParams: NavParams,
    ) {
    }

    ionViewWillEnter() {
        this.userInput = this.navParams.get('userInput');
        this.botMessage = this.navParams.get('botMessage');
        this.inputModal = this.navParams.get('inputModal');
    }

    async saveInput() {
        await this.modalController.dismiss(this.userInput);
    }

    async dismissInput() {
        await this.modalController.dismiss(null);
    }
}
