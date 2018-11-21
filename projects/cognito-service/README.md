<a href="https://www.npmjs.com/package/@caliatys/cognito-service" target="_blank">
  <img alt="npm version" src="https://img.shields.io/npm/v/@caliatys/cognito-service.svg?style=flat-square"/>
</a>

# Manage your users with AWS Cognito
This Angular Library, which currently supports Angular 6.x and 7.x, is a wrapper around the [aws-sdk](https://github.com/aws/aws-sdk-js) and [amazon-cognito-identity-js](https://www.npmjs.com/package/amazon-cognito-identity-js) libraries to easily manage your Cognito User Pool.

## Note
The sample application uses our authentication component : [@caliatys/login-form](https://github.com/Caliatys/LoginComponent/).
It also implements [@ng-idle](https://github.com/HackedByChinese/ng2-idle) and [angular2-moment](https://github.com/urish/ngx-moment) packages to manage the connected user's session.

**Important** : If you plan to use the `CognitoService` as we do in the sample application, please follow the next chapters (External packages [installation](#external-packages) and [usage](#external-packages-1)) or refer to the dedicated documentations. You can also take a look at the [src/app](https://github.com/Caliatys/CognitoService/blob/master/src/app/) folder to see how we use packages together in a concrete example of implementation.

- [@caliatys/login-form - Readme](https://github.com/Caliatys/LoginComponent/#installation)
- [@ng-idle - Example with sources](https://hackedbychinese.github.io/ng2-idle/)
- [angular2-moment - Readme](https://www.npmjs.com/package/angular2-moment#installation)

## Table of contents
<details>
  <summary>Show / Hide</summary>

- [Demo](#demo)
- [Installation](#installation)
  * [CognitoService](#cognitoservice)
  * [External packages](#external-packages)
    + [LoginComponent](#logincomponent)
    + [NgIdle & Moment](#ngidle-&-moment)
- [Usage](#usage)
  * [CognitoService](#cognitoservice-1)
  * [External packages](#external-packages-1)
    + [LoginComponent](#logincomponent-1)
    + [NgIdle & Moment](#ngidle-&-moment-1)
- [Variables](#variables)
- [Methods](#methods)
  * [Registration](#registration)
    + [Signup](#signup)
    + [Confirm registration](#confirm-registration)
    + [Resend confirmation code](#resend-confirmation-code)
    + [SignIn](#signin)
      - [Google](#google)
      - [Cognito](#cognito)
    + [Refresh session](#refresh-session)
    + [SignOut](#signout)
  * [MFA](#mfa)
    + [Send MFA code](#send-mfa-code)
    + [Get MFA status](#get-mfa-status)
    + [Enable / Disable MFA](#enable-/-disable-mfa)
  * [Password](#password)
    + [New password required](#new-password-required)
    + [Forgot password](#forgot-password)
    + [Confirm password](#confirm-password)
    + [Change password](#change-password)
- [Helpers](#helpers)
  * [Is authenticated](#is-authenticated)
  * [Get username](#get-username)
  * [Get provider](#get-provider)
  * [Get id token](#get-id-token)
  * [Get tokens](#get-tokens)
- [Admin](#admin)
  * [Admin create user](#admin-create-user)
  * [Admin delete user](#admin-delete-user)
  * [Admin reset user password](#admin-reset-user-password)
  * [Admin update user attributes](#admin-update-user-attributes)
- [Admin helpers](#admin-helpers)
  * [Reset expired account](#reset-expired-account)
  * [Set admin](#set-admin)
- [Dependencies](#dependencies)
- [Roadmap](#roadmap)
  * [In progress](#in-progress)
  * [Planning](#planning)
  * [Contributions](#contributions)
- [Development](#development)
</details>

## Demo

```sh
git clone https://github.com/Caliatys/CognitoService
cd CognitoService/
npm install
```

Don't forget to edit the parameters located in [src/app/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/cognito.const.ts).

```sh
ng build cognito-service --prod
ng serve
```

## Installation

### CognitoService

Add `@caliatys/cognito-service` module as dependency to your project.
```sh
npm install @caliatys/cognito-service --save
```

Copy/paste [src/app/shared/consts/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/consts/cognito.const.ts) and replace the parameters with your resource identifiers.
```typescript
export const CognitoConst = {
  storagePrefix    : 'AngularApp',
  sessionTime      : 10000, // In millisecond
  googleId         : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
  googleScope      : '',
  poolData         : {
    UserPoolId     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPool
    ClientId       : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPoolClient
    Paranoia       : 7 // An integer between 1 - 10
  },
  identityPool     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoIdentityPool
  region           : 'eu-west-1', // Region matching CognitoUserPool region
  // Admin (optional)
  adminAccessKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  adminSecretKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
```

Copy/paste [src/app/shared/helpers/cognito.helper.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/helpers/cognito.helper.ts). This file is used to simplify the implementation of the `CognitoService` in your application while keeping a single instance of it.
```typescript
// Angular modules
import { Injectable }     from '@angular/core';

// External modules
import { CognitoService } from '@caliatys/cognito-service';
import { AuthType }       from '@caliatys/cognito-service';
import { RespType }       from '@caliatys/cognito-service';

// Consts
import { CognitoConst }   from '../consts/cognito.const';

@Injectable()
export class CognitoHelper
{
  // Services
  public cognitoService : CognitoService = new CognitoService(CognitoConst);

  // Consts
  public cognitoConst                    = CognitoConst;

  // Enums
  public authType                        = AuthType;
  public respType                        = RespType;
}
```

Include `CognitoHelper` into the providers of [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
...
import { CognitoHelper } from './shared/helpers/cognito.helper';

@NgModule({
  ...
  providers :
  [
    CognitoHelper
    ...
  ],
  ...
})
export class AppModule { }
```

Add the API inside the `<head>` of [index.html](https://github.com/Caliatys/CognitoService/blob/master/src/index.html) to enable authentication with Google :
```html
<script src="https://apis.google.com/js/platform.js"></script>
```

### External packages

#### LoginComponent

<details>
  <summary>Show / Hide : Installation</summary>

Install `@caliatys/login-form` :
```sh
npm install @caliatys/login-form --save
```

Create a new login module with its routing and component :
```sh
ng generate module login --routing --no-spec
ng generate component login --no-spec
```

Include `LoginFormModule` into [login.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/login/login.module.ts) or in module where you will use it.
```typescript
...
import { LoginFormModule } from '@caliatys/login-form';

@NgModule({
  ...
  imports :
  [
    LoginFormModule
    ...
  ],
  ...
})
export class LoginModule { }
```
**or** include `LoginFormModule` into your [shared.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/shared.module.ts). This could be usefull if your project has nested Modules.
<!-- -->
[Angular Sharing Modules - Official documentation](https://angular.io/guide/sharing-ngmodules)

You can generate it with :
```sh
ng generate module shared --no-spec
```

```typescript
// shared.module.ts
import { NgModule }        from '@angular/core';
import { CommonModule }    from '@angular/common';
import { LoginFormModule } from '@caliatys/login-form';
...

@NgModule({
  imports: [
    CommonModule,
    LoginFormModule,
    ...
  ],
  exports: [
    CommonModule,
    LoginFormModule,
    ...
  ],
  ...
})
export class SharedModule {
}
```
```typescript
// app.module.ts
...
import { SharedModule } from './shared/shared.module';

@NgModule({
  ...
  imports :
  [
    SharedModule
    ...
  ],
  ...
})
export class AppModule { }
```

Create an home module with its routing and component :
```sh
ng generate module home --routing --no-spec
ng generate component home --no-spec
```

**Bonus** : Create and custom a 404 page.
```sh
ng generate module static --routing --no-spec
ng generate component static/not-found --no-spec
```

Include `StaticModule` into [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
...
import { StaticModule } from './static/static.module';

@NgModule({
  ...
  imports :
  [
    StaticModule
    ...
  ],
  ...
})
export class AppModule { }
```

Include `CognitoHelper` into [not-found.component.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/static/not-found/not-found.component.ts) :
```typescript
// Angular modules
import { Component }     from '@angular/core';

// Helpers
import { CognitoHelper } from '../../shared/helpers/cognito.helper';

@Component({
  selector    : 'app-not-found',
  templateUrl : './not-found.component.html',
  styleUrls   : ['./not-found.component.scss']
})
export class NotFoundComponent
{
  constructor(public cognitoHelper : CognitoHelper) { }
}
```

And use it into [not-found.component.html](https://github.com/Caliatys/CognitoService/blob/master/src/app/static/not-found/not-found.component.html) :
```html
<h1>404 - Page not found</h1>
<!-- Authenticated user -->
<button type="button" [routerLink]="['/home']"
  *ngIf="cognitoHelper.cognitoService.isAuthenticated()">
  Go to home page
</button>
<!-- Unknown user -->
<button type="button" [routerLink]="['/login']"
  *ngIf="!cognitoHelper.cognitoService.isAuthenticated()">
  Go to login page
</button>
```

To restrict the access to the home page and redirect to the login page, the routing system requires an [auth-guard.helper.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/helpers/auth-guard.helper.ts) :
```typescript
// Angular modules
import { Injectable }    from '@angular/core';
import { Router }        from '@angular/router';
import { Route }         from '@angular/router';
import { CanLoad }       from '@angular/router';

// Helpers
import { CognitoHelper } from '../../shared/helpers/cognito.helper';

@Injectable()
export class AuthGuardHelper implements CanLoad
{
  constructor(private router : Router, private cognitoHelper : CognitoHelper) { }

  public canLoad(route : Route) : boolean
  {
    return this.isAuthenticated();
  }

  private isAuthenticated() : boolean
  {
    let isAuthenticated : boolean = false;
    isAuthenticated = this.cognitoHelper.cognitoService.isAuthenticated();

    if(!isAuthenticated)
      this.router.navigate(['/login']);

    return isAuthenticated;
  }
}
```

If you don't have [app-routing.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app-routing.module.ts), here's how to create and import it :
```sh
ng generate module app-routing --flat --module=app --no-spec
```
> --flat puts the file in src/app instead of its own folder.
>
> --module=app tells the CLI to register it in the imports array of the AppModule.
<!-- -->
[Angular Routing - Official documentation](https://angular.io/tutorial/toh-pt5)

Include `AppRoutingModule` into [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
...
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  ...
  imports :
  [
    AppRoutingModule
    ...
  ],
  ...
})
export class AppModule { }
```

Now let's add and protect the routes into [app-routing.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app-routing.module.ts) :
```typescript
// Angular modules
import { NgModule }          from '@angular/core';
import { RouterModule }      from '@angular/router';
import { Routes }            from '@angular/router';

// Components
import { NotFoundComponent } from './static/not-found/not-found.component';

// Helpers
import { AuthGuardHelper }   from './shared/helpers/auth-guard.helper';

const routes : Routes = [
  {
    path         : 'login',
    loadChildren : './login/login.module#LoginModule',
  },
  {
    path         : 'home',
    loadChildren : './home/home.module#HomeModule',
    canLoad      : [ AuthGuardHelper ]
  },
  { path : '',   redirectTo : '/login', pathMatch : 'full' },
  { path : '**', component  : NotFoundComponent }
];

@NgModule({
  imports   : [ RouterModule.forRoot(routes) ],
  exports   : [ RouterModule ],
  providers : [ AuthGuardHelper ]
})
export class AppRoutingModule { }
```

Here is an overview of the file structure :
```
app/                                 
│                                    
├── home/                            
│   ├── home-routing.module.ts       
│   ├── home.component.html          
│   ├── home.component.scss          
│   ├── home.component.ts            
│   └── home.module.ts               
│                                    
├── login/                           
│   ├── login-routing.module.ts      
│   ├── login.component.html         
│   ├── login.component.scss         
│   ├── login.component.ts           
│   └── login.module.ts              
│                                    
├── shared/                          
│   ├── consts/                      
│   │   └── cognito.const.ts         
│   ├── helpers/                     
│   │   ├── auth-guard.helper.ts     
│   │   └── cognito.helper.ts        
│   └── shared.module.ts             
│                                    
├── static/                          
│   ├── not-found/                   
│   │   ├── not-found.component.html 
│   │   ├── not-found.component.scss 
│   │   └── not-found.component.ts   
│   ├── static-routing.module.ts     
│   └── static.module.ts             
│                                    
├── app-routing.module.ts            
├── app.component.html               
├── app.component.scss               
├── app.component.ts                 
└── app.module.ts                    
```
</details>

#### NgIdle & Moment
<details>
  <summary>Show / Hide : Installation</summary>

Install `@ng-idle` :
```sh
npm install @ng-idle/core @ng-idle/keepalive angular2-moment --save
```

Add `NgIdleKeepaliveModule` and `MomentModule` into the imports of [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
...
import { NgIdleKeepaliveModule } from '@ng-idle/keepalive'; // this includes the core NgIdleModule but includes keepalive providers for easy wireup
import { MomentModule }          from 'angular2-moment';    // optional, provides moment-style pipes for date formatting

@NgModule({
  imports: [
    NgIdleKeepaliveModule.forRoot(),
    MomentModule,
    ...
  ],
  ...
})
export class AppModule { }
```
</details>

## Usage

### CognitoService
To start using the service, import the `CognitoHelper` into a component (`LoginComponent` for example) :
```typescript
...
import { CognitoHelper } from './shared/helpers/cognito.helper';
...
export class LoginComponent
{
  constructor(public cognitoHelper : CognitoHelper)
  {
    // this.cognitoHelper.cognitoService...
  }
}
```

### External packages

#### LoginComponent

<details>
  <summary>Show / Hide : Usage</summary>

Once the `LoginFormModule` is imported, you can start using the `cal-login-form` component into [login.component.html](https://github.com/Caliatys/CognitoService/blob/master/src/app/login/login.component.html) :
```html
<cal-login-form #loginForm
  (initialized)="initialized()"
  (signUp)="signUp()"
  (login)="login($event)"
  (loginSocial)="loginSocial($event)"
  (forgotPwd)="forgotPassword($event)"
  (sendFirstPwd)="firstPassword($event)"
  (sendResetPwd)="resetPassword($event)"
  (saveMfaKey)="saveMfaKey($event)"
  (sendMfaCode)="sendMfaCode($event)"
  (stepUsr)="stepUsr($event)"
  (stepPwd)="stepPwd($event)">
</cal-login-form>
```

The component accepts several inputs that are listed in the [documentation](https://github.com/Caliatys/LoginComponent#inputs).

Here is how we integrate the output events with `LoginFormComponent` in [login.component.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/login/login.component.ts) :

```typescript
// Angular modules
import { Component }          from '@angular/core';
import { ViewChild }          from '@angular/core';
import { Router }             from '@angular/router';
import { MatSnackBar }        from '@angular/material';

// External modules
import { LoginFormComponent } from '@caliatys/login-form';

// Helpers
import { CognitoHelper }      from '../shared/helpers/cognito.helper';

@Component({
  moduleId    : module.id,
  templateUrl : 'login.component.html',
  styleUrls   : ['login.component.scss']
})
export class LoginComponent
{
  // @caliatys/login-form
  @ViewChild('loginForm') loginForm : LoginFormComponent;

  constructor
  (
    public  router        : Router,
    public  snackBar      : MatSnackBar,
    private cognitoHelper : CognitoHelper
  )
  {
    if(this.cognitoHelper.cognitoService.isAuthenticated())
      this.successfulConnection();
  }

  // Actions :

  // Google login

  public loginSocial($event : any) : void
  {
    let social : string = null;
    social = $event.social;

    if(social !== this.cognitoHelper.authType.GOOGLE)
      return;

    this.cognitoHelper.cognitoService.signIn(this.cognitoHelper.authType.GOOGLE).subscribe(res =>
    {
      this.successfulConnection();
    },
    err =>
    {
      console.error(err);
    });
  }

  // Cognito login

  public login($event : any) : void
  {
    let username : string = null;
    let password : string = null;
    username = $event.username;
    password = $event.password;

    this.cognitoHelper.cognitoService.signIn(this.cognitoHelper.authType.COGNITO, username, password).subscribe(res =>
    {
      // Successful signIn
      if(res.type === this.cognitoHelper.respType.ON_SUCCESS)
        this.successfulConnection();

      // First connection
      if(res.type === this.cognitoHelper.respType.NEW_PASSWORD_REQUIRED)
        this.loginForm.showPwdForm(true);

      // MFA required
      if(res.type === this.cognitoHelper.respType.MFA_REQUIRED)
        this.loginForm.showMfaForm();

      // MFA setup : associate secret code
      if(res.type === this.cognitoHelper.respType.MFA_SETUP_ASSOCIATE_SECRETE_CODE)
        this.loginForm.showMfaSetupForm('JBSWY3DPEHPK3PXP', 'otpauth://totp/john@doe.com?secret=JBSWY3DPEHPK3PXP&issuer=Caliatys');
    },
    err =>
    {
      // ON_FAILURE / MFA_SETUP_ON_FAILURE
      console.error('LoginComponent : login -> signIn', err);
      this.snackBar.open(err.data.message, 'X');
    });
  }

  // First connection

  public firstPassword($event : any) : void
  {
    let username    : string = null;
    let newPassword : string = null;
    username    = $event.username;
    newPassword = $event.password;

    this.cognitoHelper.cognitoService.newPasswordRequired(newPassword).subscribe(res =>
    {
      // Success
      if(res.type === this.cognitoHelper.respType.ON_SUCCESS)
        this.loginForm.hidePwdForm();
      // MFA required
      if(res.type === this.cognitoHelper.respType.MFA_REQUIRED)
        this.loginForm.showMfaForm();
    },
    err =>
    {
      console.error('LoginComponent : firstPassword -> changePassword', err);
      this.snackBar.open(err.data.message, 'X');
    });
  }

  // Forgot password

  public forgotPassword($event : any) : void
  {
    let username : string = null;
    username = $event.username;

    if(!username)
      return; // Username required

    this.cognitoHelper.cognitoService.forgotPassword(username).subscribe(res =>
    {
      // Verification code
      if(res.type === this.cognitoHelper.respType.INPUT_VERIFICATION_CODE)
        this.loginForm.showPwdForm(false);
    },
    err =>
    {
      console.error('LoginComponent : forgotPassword -> forgotPassword', err);
      this.snackBar.open(err.data.message, 'X');
    });
  }

  // Reset password : complete the forgot password flow

  public resetPassword($event : any) : void
  {
    let newPassword : string = null;
    let verifCode   : string = null;
    newPassword = $event.password;
    verifCode   = $event.verificationCode;

    this.cognitoHelper.cognitoService.confirmPassword(newPassword, verifCode).subscribe(res =>
    {
      this.loginForm.hidePwdForm(newPassword); // Password updated successfully
    },
    err =>
    {
      console.error('LoginComponent : resetPassword -> confirmPassword', err);
      this.snackBar.open(err.data.message, 'X');
    });
  }

  private successfulConnection() : void
  {
    this.router.navigate(['/home']);
  }
```
</details>

#### NgIdle & Moment

<details>
  <summary>Show / Hide : Usage</summary>

Here is how we manage the user's session with `Idle`, `DEFAULT_INTERRUPTSOURCES`, `Keepalive` in [app.component.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.component.ts) :
```typescript
// Angular modules
import { Component }                from '@angular/core';
import { OnInit }                   from '@angular/core';
import { OnDestroy }                from '@angular/core';
import { Router }                   from '@angular/router';

// External modules
import { Subscription }             from 'rxjs';
import { Idle }                     from '@ng-idle/core';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive }                from '@ng-idle/keepalive';

// Helpers
import { CognitoHelper }            from './shared/helpers/cognito.helper';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy
{
  public  isAuthenticated : boolean = false;

  // Session with : @ng-idle/core - @ng-idle/keepalive - @caliatys/cognito-service
  public  idleState : string  = 'Not started.';
  public  timedOut  : boolean = null;
  public  lastPing ?: Date    = null;

  // Subscriptions
  private signInSub  : Subscription;
  private signOutSub : Subscription;

  constructor
  (
    private cognitoHelper : CognitoHelper,
    private router        : Router,
    private idle          : Idle,
    private keepalive     : Keepalive
  )
  {
  }

  public ngOnInit() : void
  {
    this.isAuthenticated = this.cognitoHelper.cognitoService.isAuthenticated();

    this.setIdle();

    this.signInSub  = this.signInSubscription();
    this.signOutSub = this.signOutSubscription();
  }

  public ngOnDestroy() : void
  {
    this.signInSub.unsubscribe();
    this.signOutSub.unsubscribe();
  }

  // Session management

  private setIdle() : void
  {
    this.timedOut = false;

    this.idle.setIdle(5); // Sets an idle timeout of 5 seconds
    this.idle.setTimeout(this.cognitoHelper.cognitoConst.sessionTime); // After X seconds (+ 5 idle seconds) of inactivity, the user will be considered timed out

    this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES); // Sets the default interrupts, in this case, things like clicks, scrolls, touches to the document

    this.idle.onIdleEnd.subscribe(() => this.idleState = 'No longer idle.');

    this.idle.onIdleStart.subscribe(() => this.idleState = 'You\'ve gone idle!');
    this.idle.onTimeoutWarning.subscribe((countdown) => this.idleState = 'You will time out in ' + countdown + ' seconds!');

    this.keepalive.interval(5); // Sets the ping interval to 5 seconds

    this.keepalive.onPing.subscribe(() =>
    {
      this.cognitoHelper.cognitoService.updateSessionTime();
      this.lastPing = new Date();
    });

    this.idle.onTimeout.subscribe(() =>
    {
      this.idleState = 'Timed out!';
      this.timedOut  = true;
      if(this.cognitoHelper.cognitoService.isAuthenticated())
        this.cognitoHelper.cognitoService.signOut();
      this.resetIdle();
    });

    this.resetIdle();
  }

  private resetIdle() : void
  {
    this.idle.watch();
    this.idleState = 'Started.';
    this.timedOut  = false;
  }

  // Subscription

  private signInSubscription() : Subscription
  {
    let signInSub : Subscription = null;
    signInSub = this.cognitoHelper.cognitoService.onSignIn.subscribe(() =>
    {
      this.isAuthenticated = true;
    });
    return signInSub;
  }

  private signOutSubscription() : Subscription
  {
    let signOutSub : Subscription = null;
    signOutSub = this.cognitoHelper.cognitoService.onSignOut.subscribe(() =>
    {
      this.isAuthenticated = false;
      this.router.navigate([ '/login' ]);
    });
    return signOutSub;
  }

}
```

If you want to display the idle state, you can add it to [app.component.html](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.component.html) :
```html
<div *ngIf="isAuthenticated">
  <p>{{ idleState }}</p>
  <p *ngIf="lastPing">Last keepalive ping {{ lastPing | amTimeAgo }}</p>
</div>
```
</details>

## Variables

Events that you can subscribe to deal with `signIn` and `signOut` events

```typescript
// Events that you can subscribe to
public onSignIn  : EventEmitter<null>;
public onSignOut : EventEmitter<null>;
```

## Methods

### Registration

#### SignUp
Register a new user :
```typescript
this.cognitoHelper.cognitoService.signUp('username', 'password').subscribe(res => {

  let signUpResult : AWSCognito.ISignUpResult = res.data;

}, err => { });
```

#### Confirm registration
Depending on your settings, email confirmation may be required.
In that case, the following function must be called :
```typescript
this.cognitoHelper.cognitoService.confirmRegistration().subscribe(res => {
  // Success
}, err => {
  // Error
});
```

#### Resend confirmation code
```typescript
this.cognitoHelper.cognitoService.resendConfirmationCode();
```

#### SignIn
Connect an existing user with Google or Cognito.
##### Google
```typescript
this.cognitoHelper.cognitoService.signIn(this.cognitoHelper.authType.GOOGLE).subscribe(res => {
  // Success
}, err => {
  // Error
});
```

##### Cognito
```typescript
this.cognitoHelper.cognitoService.signIn(this.cognitoHelper.authType.COGNITO, 'username', 'password').subscribe(res => {

  // Successful connection
  if(res.type === RespType.ON_SUCCESS)
    let session : AWSCognito.CognitoUserSession = res.data;

  // First connection
  if(res.type === RespType.NEW_PASSWORD_REQUIRED)

  // MFA required
  if(res.type === RespType.MFA_REQUIRED)

  // MFA setup : associate secret code
  if(res.type === RespType.MFA_SETUP_ASSOCIATE_SECRETE_CODE)
    let secretCode : string = res.data;

}, err => {

  // Error
  if(err.type === RespType.ON_FAILURE)
    let err : any = res.data;

  // MFA setup : error
  if(err.type === RespType.MFA_SETUP_ON_FAILURE)
    let err : any = res.data;

});
```

#### Refresh session
Generate new `refreshToken`, `idToken` and `accessToken` with a new expiry date.
If successful, you retrieve 3 auth tokens and the associated expiration dates (same as `signIn`).
```typescript
this.cognitoHelper.cognitoService.refreshCognitoSession().subscribe(res => {

  let session : AWSCognito.CognitoUserSession = res.data;

}, err => { });
```

#### SignOut
```typescript
this.cognitoHelper.cognitoService.signOut();
```

### MFA

#### Send MFA code
Complete the `MFA_REQUIRED` sent by the `signIn` or by the `newPasswordRequired` method using the mfaCode received by SMS to finish the signIn flow.
```typescript
this.cognitoHelper.cognitoService.sendMFACode('mfaCode', 'SOFTWARE_TOKEN_MFA or SMS_MFA').subscribe(res => {

  let session : AWSCognito.CognitoUserSession = res.data;

}, err => { });
```

#### Get MFA status
If MFA is enabled for this user, retrieve its options. Otherwise, returns null.
```typescript
this.cognitoHelper.cognitoService.getMFAOptions().subscribe(res => {

  let mfaOptions : AWSCognito.MFAOption[] = res.data;

}, err => { });
```

#### Enable / Disable MFA
```typescript
let enableMfa : boolean = true;
this.cognitoHelper.cognitoService.setMfa(enableMfa).subscribe(res => {
  // Success
}, err => {
  // Error
});
```

### Password

#### New password required
Complete the `NEW_PASSWORD_REQUIRED` response sent by the `signIn` method to finish the first connection flow.
```typescript
this.cognitoHelper.cognitoService.newPasswordRequired('newPassword').subscribe(res => {

  // Success
  if(res.type === RespType.ON_SUCCESS)

  // MFA required
  if(res.type === RespType.MFA_REQUIRED)

}, err => { });
```

#### Forgot password
Start a forgot password flow.
Cognito will send a `verificationCode` to one of the user's confirmed contact methods (email or SMS) to be used in the `confirmPassword` method below.
```typescript
this.cognitoHelper.cognitoService.forgotPassword('username').subscribe(res => {

  // Verification code
  if(res.type === RespType.INPUT_VERIFICATION_CODE)

}, err => { });
```

#### Confirm password
Complete the `INPUT_VERIFICATION_CODE` response sent by the `forgotPassword` method to finish the forgot password flow.
```typescript
this.cognitoHelper.cognitoService.confirmPassword('newPassword', 'verificationCode').subscribe(res => {
  // Success
}, err => {
  // Error
});
```

#### Change password
Use this method to change the user's password.
```typescript
this.cognitoHelper.cognitoService.changePassword('oldPassword', 'newPassword').subscribe(res => {
  // Success
}, err => {
  // Error
});
```

## Helpers

### Is authenticated
Compare the token expiration date with the current date.
```typescript
let connected : boolean = this.cognitoHelper.cognitoService.isAuthenticated();
```

### Get username
```typescript
let username : string = this.cognitoHelper.cognitoService.getUsername();
```

### Get provider
```typescript
let provider : string = this.cognitoHelper.cognitoService.getProvider();
```

### Get id token
```typescript
let idToken : string = this.cognitoHelper.cognitoService.getIdToken();
```

### Get tokens
```typescript
let tokens : any = this.cognitoHelper.cognitoService.getTokens();
// tokens = {
//   accessToken          : string,
//   accessTokenExpiresAt : number, (milliseconds)
//   idToken              : string,
//   idTokenExpiresAt     : number, (milliseconds)
//   refreshToken         : string
// }
```

### Get token expiration date
```typescript
let expiresAt : Date = this.cognitoHelper.cognitoService.getExpiresAt();
```

### Get the remaining time
```typescript
let remaining : Number = this.cognitoHelper.cognitoService.getRemaining(); // milliseconds
```

## Admin

### Admin create user
```typescript
this.cognitoHelper.cognitoService.adminCreateUser('username', 'password').subscribe(res => { }, err => { });
```

### Admin delete user
```typescript
this.cognitoHelper.cognitoService.adminDeleteUser('username').subscribe(res => { }, err => { });
```

### Admin reset user password
```typescript
this.cognitoHelper.cognitoService.adminResetUserPassword('username').subscribe(res => { }, err => { });
```

### Admin update user attributes
```typescript
let userAttributes : AWS.CognitoIdentityServiceProvider.Types.AttributeListType;
this.cognitoHelper.cognitoService.adminUpdateUserAttributes('username', userAttributes).subscribe(res => { }, err => { });
```

## Admin helpers

### Reset expired account
```typescript
this.cognitoHelper.cognitoService.resetExpiredAccount('usernameKey', 'username').subscribe(res => { }, err => { });
```

### Set admin
```typescript
this.cognitoHelper.cognitoService.setAdmin();
```

## Dependencies

**Important** : This project uses the following dependencies :
```json
"peerDependencies"             : {
  "@angular/common"            : "^6.0.0 || ^7.0.0",
  "@angular/core"              : "^6.0.0 || ^7.0.0",
  "rxjs"                       : "^6.0.0",
  "rxjs-compat"                : "^6.0.0",
  "amazon-cognito-identity-js" : "^2.0.6",
  "aws-sdk"                    : "^2.247.1",
  "@types/gapi"                : "0.0.35",
  "@types/gapi.auth2"          : "0.0.47"
},
"devDependencies"              : {
  "@types/node"                : "10.12.0"
}
```

If it's an empty Angular application :

- Add `"types": ["node"]` to the [tsconfig.app.json](https://github.com/Caliatys/CognitoService/blob/master/src/tsconfig.app.json) file that the angular-cli creates in the `src` directory.
- Add `(window as any).global = window;` to the [polyfills.ts](https://github.com/Caliatys/CognitoService/blob/master/src/polyfills.ts) file, as mentioned here : [angular/angular-cli#9827 (comment)](https://github.com/angular/angular-cli/issues/9827#issuecomment-386154063)

## Roadmap

### In progress

### Planning
- Translate & design Idle
- Facebook

### Contributions

Contributions are welcome, please open an issue and preferably submit a pull request.

## Development

CognitoService is built with [Angular CLI](https://github.com/angular/angular-cli).