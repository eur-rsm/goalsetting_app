import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './core/auth-guard.service';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadChildren: './pages/home/home.module#HomePageModule',
        canActivate: [AuthGuardService],
    },
    {
        path: 'login',
        loadChildren: './pages/login/login.module#LoginPageModule',
    },
    {
        path: 'config',
        loadChildren: './pages/config/config.module#ConfigPageModule'
    },
    {
        path: 'implicit/callback',
        loadChildren: './pages/implicit/auth-callback/auth-callback.module#AuthCallbackPageModule'
    },
    {
        path: 'implicit/endsession',
        loadChildren: './pages/implicit/end-session/end-session.module#EndSessionPageModule'
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {preloadingStrategy: PreloadAllModules})
    ],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
