import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ModalPage } from './modal.page';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({ name: 'safeHtml', pure: true })
export class SafeHtmlPipe implements PipeTransform {
    constructor(private sanitized: DomSanitizer) {
    }

    transform(value) {
        return this.sanitized.bypassSecurityTrustHtml(value);
    }
}


@NgModule({
    declarations: [
        ModalPage, SafeHtmlPipe,
    ],
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
    ],
    entryComponents: [
        ModalPage
    ]
})
export class ModalPageModule {
}
