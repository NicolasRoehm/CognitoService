# Manage your users with AWS Cognito
This Angular 6 Library is a wrapper around the [aws-sdk](https://github.com/aws/aws-sdk-js) and [amazon-cognito-identity-js](https://www.npmjs.com/package/amazon-cognito-identity-js) libraries to easily manage your Cognito User Pool.

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
    + [Login](#login)
      - [Google](#google)
      - [Cognito](#cognito)
    + [Refresh session](#refresh-session)
    + [Logout](#logout)
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

```sh
npm install @caliatys/cognito-service --save
```

Copy/paste [src/app/shared/consts/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/consts/cognito.const.ts) and replace the parameters with your resource identifiers.
```typescript
export const CognitoConst = {
  storagePrefix    : 'AngularApp',
  sessionTime      : 10, // In seconds
  googleId         : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
  googleScope      : '',
  poolData         : {
    UserPoolId     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPool
    ClientId       : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPoolClient
    Paranoia       : 7 // An integer between 1 - 10
  },
  // Admin (optional)
  region           : 'eu-west-1', // Region matching CognitoUserPool region
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
  public  cognitoService : CognitoService = new CognitoService(CognitoConst);

  // Consts
  public  cognitoConst   : any            = CognitoConst;

  // Enums
  public  authType                        = AuthType;
  public  respType                        = RespType;
}
```

Add the API inside the `<head>` of [index.html](https://github.com/Caliatys/CognitoService/blob/master/src/index.html) to enable authentication with Google :
```html
<script src="https://apis.google.com/js/platform.js"></script>
```

Add `CognitoHelper` the providers of [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
// ...
import { CognitoHelper } from './shared/helpers/cognito.helper';

@NgModule({
  // ...
  providers :
  [
    CognitoHelper
    //...
  ],
  // ...
})
export class AppModule { }
```

### External packages

#### LoginComponent

<details>
  <summary>Show / Hide : Installation</summary>

Install `@caliatys/login-form` :
```sh
npm install @caliatys/login-form --save
```

Create a new login component and a new login module :
```sh
ng generate component login
ng generate module login
```

Import the `LoginFormModule` into [login.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/login/login.module.ts) :
```typescript
// ...
import { LoginFormModule } from '@caliatys/login-form';

@NgModule({
  // ...
  imports :
  [
    LoginFormModule
    //...
  ],
  // ...
})
export class LoginModule { }
```

Add a new route to the login page into [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
//...
{
  path         : 'login',
  loadChildren : './login/login.module#LoginModule',
}
//...
```

Let's create an home component with its module :
```sh
ng generate component home
ng generate module home
```

To restrict the access to the home page, the routing system requires an [auth-guard.helper.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/shared/helpers/auth-guard.helper.ts) :
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
  constructor(router : Router, cognitoHelper : CognitoHelper) { }

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

Now we can add a new protected route to the home page into [app.module.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/app.module.ts) :
```typescript
import { AuthGuardHelper } from './shared/helpers/auth-guard.helper';
//...
{
  path         : 'home',
  loadChildren : './home/home.module#HomeModule',
  canLoad      : [ AuthGuardHelper ]
},
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
//...
import { NgIdleKeepaliveModule } from '@ng-idle/keepalive'; // this includes the core NgIdleModule but includes keepalive providers for easy wireup
import { MomentModule }          from 'angular2-moment';    // optional, provides moment-style pipes for date formatting

@NgModule({
  imports: [
    NgIdleKeepaliveModule.forRoot(),
    MomentModule,
    //...
  ],
  // ...
})
export class AppModule { }
```
</details>

## Usage

### CognitoService
To start using the service, import the `CognitoHelper` into a component (`LoginComponent` for example) :
```typescript
//...
import { CognitoHelper } from './shared/helpers/cognito.helper';
//...
export class LoginComponent
{
  constructor(cognitoHelper : CognitoHelper)
  {
    // this.cognitoHelper.cognitoService...
  }
}
```

### External packages

#### LoginComponent

<details>
  <summary>Show / Hide : Usage</summary>

Add the `cal-login-form` component into [login.component.html](https://github.com/Caliatys/CognitoService/blob/master/src/app/login/login.component.html) :
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
      this.onSuccessLogin();
  }

  // Actions :

  // Google login

  public loginSocial($event : any) : void
  {
    let social : string = null;
    social = $event.social;

    if(social !== this.cognitoHelper.authType.GOOGLE)
      return;

    this.cognitoHelper.cognitoService.authenticateUser(this.cognitoHelper.authType.GOOGLE).subscribe(res =>
    {
      this.onSuccessLogin();
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

    this.cognitoHelper.cognitoService.authenticateUser(this.cognitoHelper.authType.COGNITO, username, password).subscribe(res =>
    {
      // Success login
      if(res.type === this.cognitoHelper.respType.ON_SUCCESS)
        this.onSuccessLogin();

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
      console.error('LoginComponent : login -> authenticateUser', err);
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

  private onSuccessLogin() : void
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
  private loginSub  : Subscription;
  private logoutSub : Subscription;

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

    this.loginSub  = this.loginSubscription();
    this.logoutSub = this.logoutSubscription();
  }

  public ngOnDestroy() : void
  {
    this.loginSub.unsubscribe();
    this.logoutSub.unsubscribe();
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

  private loginSubscription() : Subscription
  {
    let loginSub : Subscription = null;
    loginSub = this.cognitoHelper.cognitoService.onLogin.subscribe(() =>
    {
      this.isAuthenticated = true;
    });
    return loginSub;
  }

  private logoutSubscription() : Subscription
  {
    let logoutSub : Subscription = null;
    logoutSub = this.cognitoHelper.cognitoService.onLogout.subscribe(() =>
    {
      this.isAuthenticated = false;
      this.router.navigate([ '/login' ]);
    });
    return logoutSub;
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

```typescript
// Events that you can subscribe to
public onLogin  : EventEmitter<null>;
public onLogout : EventEmitter<null>;
```

## Methods

### Registration

#### Signup
Signup a new user :
```typescript
this.cognitoService.signUp('username', 'password').subscribe(res => {

  let signUpResult : AWSCognito.ISignUpResult = res.data;

}, err => { });
```

#### Confirm registration
Depending on your settings, email confirmation may be required.
In that case, the following function must be called :
```typescript
this.cognitoService.confirmRegistration().subscribe(res => {
  // Success
}, err => {
  // Error
});
```

#### Resend confirmation code
```typescript
this.cognitoService.resendConfirmationCode();
```

#### Login
Login an existing user with Google or Cognito.

##### Google
```typescript
this.cognitoService.authenticateUser(AuthType.GOOGLE).subscribe(res =>
  // Success
}, err => {
  // Error
});
```

##### Cognito
```typescript
this.cognitoService.authenticateUser(AuthType.COGNITO, 'username', 'password').subscribe(res => {

  // Success login
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
Generate new refreshToken, idToken and accessToken with a new expiry date.
If successful, you retrieve 3 auth tokens and the associated expiration dates (same as login).
```typescript
this.cognitoService.refreshCognitoSession().subscribe(res => {

  let session : AWSCognito.CognitoUserSession = res.data;

}, err => { });
```

#### Logout
```typescript
this.cognitoService.signOut();
```

### MFA

#### Send MFA code
Complete the `MFA_REQUIRED` sent by the `login` or by the `newPasswordRequired` method using the mfaCode received by SMS to finish the login flow.
```typescript
this.cognitoService.sendMFACode('mfaCode', 'SOFTWARE_TOKEN_MFA or SMS_MFA').subscribe(res => {

  let session : AWSCognito.CognitoUserSession = res.data;

}, err => { });
```

#### Get MFA status
If MFA is enabled for this user, retrieve its options. Otherwise, returns null.
```typescript
this.cognitoService.getMFAOptions().subscribe(res => {

  let mfaOptions : AWSCognito.MFAOption[] = res.data;

}, err => { });
```

#### Enable / Disable MFA
```typescript
let enableMfa : boolean = true;
this.cognitoService.setMfa(enableMfa).subscribe(res => {
  // Success
}, err => {
  // Error
});
```

### Password

#### New password required
Complete the `NEW_PASSWORD_REQUIRED` response sent by the `login` method to finish the first connection flow.
```typescript
this.cognitoService.newPasswordRequired('newPassword').subscribe(res => {

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
this.cognitoService.forgotPassword('username').subscribe(res => {

  // Verification code
  if(res.type === RespType.INPUT_VERIFICATION_CODE)

}, err => { });
```

#### Confirm password
Complete the `INPUT_VERIFICATION_CODE` response sent by the `forgotPassword` method to finish the forgot password flow.
```typescript
this.cognitoService.confirmPassword('newPassword', 'verificationCode').subscribe(res => {
  // Success
}, err => {
  // Error
});
```

#### Change password
Use this method to change the user's password.
```typescript
this.cognitoService.changePassword('oldPassword', 'newPassword').subscribe(res => {
  // Success
}, err => {
  // Error
});
```

## Helpers

### Is authenticated
Compare the token expiration date with the current date.
```typescript
let connected : boolean = this.cognitoService.isAuthenticated();
```

### Get username
```typescript
let username : string = this.cognitoService.getUsername();
```

### Get provider
```typescript
let provider : string = this.cognitoService.getProvider();
```

### Get id token
```typescript
let idToken : string = this.cognitoService.getIdToken();
```

### Get tokens
```typescript
let tokens : any = this.cognitoService.getTokens();
// tokens = {
//   accessToken          : string,
//   accessTokenExpiresAt : number,
//   idToken              : string,
//   idTokenExpiresAt     : number,
//   refreshToken         : string
// }
```

## Admin

### Admin create user
```typescript
this.cognitoService.adminCreateUser('username', 'password').subscribe(res => { }, err => { });
```

### Admin delete user
```typescript
this.cognitoService.adminDeleteUser('username').subscribe(res => { }, err => { });
```

### Admin reset user password
```typescript
this.cognitoService.adminResetUserPassword('username').subscribe(res => { }, err => { });
```

### Admin update user attributes
```typescript
let userAttributes : AWS.CognitoIdentityServiceProvider.Types.AttributeListType;
this.cognitoService.adminUpdateUserAttributes('username', userAttributes).subscribe(res => { }, err => { });
```

## Admin helpers

### Reset expired account
```typescript
this.cognitoService.resetExpiredAccount('usernameKey', 'username').subscribe(res => { }, err => { });
```

### Set admin
```typescript
this.cognitoService.setAdmin();
```

## Dependencies

**Important** : This project uses the following dependencies :
```json
"peerDependencies"             : {
  "@angular/common"            : "^6.0.0-rc.0 || ^6.0.0",
  "@angular/core"              : "^6.0.0-rc.0 || ^6.0.0",
  "@angular/http"              : "^6.0.3",
  "rxjs"                       : "^6.0.0",
  "rxjs-compat"                : "^6.0.0",
  "amazon-cognito-identity-js" : "2.0.6",
  "aws-sdk"                    : "2.247.1",
  "@types/gapi"                : "0.0.35",
  "@types/gapi.auth2"          : "0.0.47"
}
```

## Roadmap

### In progress

### Planning
- Translate & design Idle
- Facebook

### Contributions

Contributions are welcome, please open an issue and preferably submit a pull request.

## Development

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.0.5.