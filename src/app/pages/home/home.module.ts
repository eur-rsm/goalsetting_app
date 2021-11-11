import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { ModalPageModule } from '../modal/modal.module';
import { RouterModule, Routes } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DomSanitizer } from '@angular/platform-browser';

const routes: Routes = [
    {
        path: '',
        component: HomePage
    }
];

@Pipe({ name: 'safeHtml', pure: true})
export class SafeHtmlPipe implements PipeTransform  {
    constructor(private sanitized: DomSanitizer) {}
    transform(value) {
        return this.sanitized.bypassSecurityTrustHtml(value);
    }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        ModalPageModule,
        ScrollingModule,
        RouterModule.forChild(routes)
    ],
    declarations: [
        HomePage, SafeHtmlPipe
    ]
})
export class HomePageModule {
}
