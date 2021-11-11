import {Component, OnInit} from '@angular/core';
import {AuthService} from 'src/app/core/auth.service';
import {Router} from '@angular/router';

@Component({
    template: '<p>Signing Out...</p>'
})
export class EndSessionPage implements OnInit {

    constructor(
        private authService: AuthService,
        private router: Router,
    ) {
    }

    ngOnInit() {
        this.authService.EndSessionCallBack();
        this.router.navigate(['login']);
    }
}
