import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { Router } from '@angular/router';
import { AuthActions } from 'ionic-appauth';
import { skipWhile, take } from 'rxjs/operators';

@Component({
    template: '<p>Signing in...</p>'
})
export class AuthCallbackPage implements OnInit {

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
    }

    ngOnInit() {
        this.authService.AuthorizationCallBack(this.router.url);
        this.authService.authObservable
            .pipe(skipWhile(action => action.action !== AuthActions.SignInSuccess
                && action.action !== AuthActions.SignInFailed)
                , take(1))
            .subscribe((action) => {
                if (action.action === AuthActions.SignInSuccess) {
                    this.router.navigate(['home']);
                } else {
                    this.router.navigate(['login']);
                }
            });
    }
}
