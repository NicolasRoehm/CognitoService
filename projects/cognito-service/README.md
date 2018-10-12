# Manage your users with AWS Cognito
This Angular 6 Library is a wrapper around the client libraries `aws-sdk` and `amazon-cognito-identity-js` to easily manage your Cognito User Pool. It also uses the `@ng-idle` and `angular2-moment` plugin to manage the connected user's session.

## Note
You can use this service with your own components or with our [authentication component](https://github.com/Caliatys/LoginComponent/).
This project does not implements our component by default but we are using it for demo and tests.

Important : If you plan to use the `CognitoService` with our `LoginComponent` you will also need to follow the [@caliatys/login-form - Installation guide](https://github.com/Caliatys/LoginComponent/#installation).

## Table of contents
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
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
```sh
npm install @caliatys/cognito-service --save
```

Copy/paste [src/app/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/cognito.const.ts) and replace the parameters with your resource identifiers.
```typescript
export const CognitoConst = {
  storagePrefix    : 'AngularApp',
  sessionTime      : 3500000, // In milliseconds (58 min = 3500000 ms)
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

Add the API inside the `<head>` of `index.html` to enable authentication with Google :
```html
<script src="https://apis.google.com/js/platform.js"></script>
```

Add `NgIdleKeepaliveModule` and `MomentModule` into the imports of `app.module.ts` :
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

## Usage

Import `Idle`, `DEFAULT_INTERRUPTSOURCES`, `Keepalive` inside `app.component.ts`.
```typescript
import { Component }                from '@angular/core';
import { OnInit }                   from '@angular/core';
import { OnDestroy }                from '@angular/core';
import { CognitoService }           from '@caliatys/cognito-service';
import { Idle }                     from '@ng-idle/core';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive }                from '@ng-idle/keepalive';
import { Subscription }             from 'rxjs';
import { CognitoConst }             from './cognito.const';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy
{
  // @caliatys/cognito-service
  public  cognitoService  : CognitoService = new CognitoService(CognitoConst);
  public  isAuthenticated : boolean;

  // Session with : @ng-idle/core - @ng-idle/keepalive - @caliatys/cognito-service
  public  idleState : string  = 'Not started.';
  public  timedOut  : boolean = null;
  public  lastPing ?: Date    = null;
  private logoutSub : Subscription;

  constructor
  (
    private idle      : Idle,
    private keepalive : Keepalive
  )
  {
  }

  public ngOnInit() : void
  {
    this.logoutSub       = this.logoutSubscription();
    this.isAuthenticated = this.cognitoService.isAuthenticated();
    this.setIdle();
  }

  public ngOnDestroy() : void
  {
    this.logoutSub.unsubscribe();
  }

  private setIdle() : void
  {
    this.timedOut = false;

    this.idle.setIdle(5); // Sets an idle timeout of 5 seconds
    this.idle.setTimeout(CognitoConst.sessionTime / 1000); // After X seconds (+ 5 idle seconds) of inactivity, the user will be considered timed out

    this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES); // Sets the default interrupts, in this case, things like clicks, scrolls, touches to the document

    this.idle.onIdleEnd.subscribe(() => this.idleState = 'No longer idle.');

    this.idle.onIdleStart.subscribe(() => this.idleState = 'You\'ve gone idle!');
    this.idle.onTimeoutWarning.subscribe((countdown) => this.idleState = 'You will time out in ' + countdown + ' seconds!');

    this.keepalive.interval(5); // Sets the ping interval to 5 seconds

    this.keepalive.onPing.subscribe(() =>
    {
      this.cognitoService.updateSessionTime();
      this.lastPing = new Date();
    });

    this.idle.onTimeout.subscribe(() =>
    {
      this.idleState = 'Timed out!';
      this.timedOut  = true;
      this.cognitoService.emitLogout.emit();
    });

    this.resetIdle();
  }

  private resetIdle() : void
  {
    this.idle.watch();
    this.idleState = 'Started.';
    this.timedOut  = false;
  }

  private logoutSubscription() : Subscription
  {
    let logoutSub : Subscription = null;
    logoutSub = this.cognitoService.emitLogout.subscribe(() =>
    {
      this.isAuthenticated = false;
      this.cognitoService.signOut();
    });
    return logoutSub;
  }
}
```

Import `CognitoService` and `CognitoConst` inside a component :
```typescript
//...
import { CognitoService } from '@caliatys/cognito-service';
import { CognitoConst }   from './cognito.const';
import { RespType }       from '@caliatys/cognito-service'; // Response enum (onSucces, onFailure, ...)
import { AuthType }       from '@caliatys/cognito-service'; // Provider enum (google, facebook, ...)
//...
export class LoginComponent
{
  public cognitoService : CognitoService = new CognitoService(CognitoConst);
}
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

**Important Note** : This project uses the following dependencies :
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
  "@types/gapi.auth2"          : "0.0.47",
  "@ng-idle/core"              : "^6.0.0-beta.3",
  "@ng-idle/keepalive"         : "^6.0.0-beta.3",
  "angular2-moment"            : "^1.9.0"
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