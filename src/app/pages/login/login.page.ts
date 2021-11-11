import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthActions } from 'ionic-appauth';
import { AuthService } from '../../core/auth.service';

@Component({
    selector: 'app-home',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
    constructor(
        private router: Router,
        private auth: AuthService,
    ) {
    }

    ngOnInit() {
        this.auth.authObservable.subscribe((action) => {
            if (action.action === AuthActions.SignInSuccess) {
                this.router.navigate(['home']);
            }
        });
    }

    signIn() {
        this.auth.signIn();
    }
}
