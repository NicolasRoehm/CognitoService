# Manage your users with AWS Cognito
This Angular 6 Library is a wrapper around the client libraries `aws-sdk` and `amazon-cognito-identity-js` to easily manage your Cognito User Pool.

<a href="https://nodei.co/npm/@caliatys/cognito-service/" target="_blank">
  <img src="https://nodei.co/npm/@caliatys/cognito-service.svg?downloads=true">
</a>

## Note
You can use this service with your own components or with our [generic authentication component](https://github.com/Caliatys/LoginComponent/).
This project already implements our [@caliatys/login-form](https://github.com/Caliatys/LoginComponent/) component for demo and tests.

## Installation
```sh
npm install @caliatys/cognito-service --save
```

Copy/paste [src/app/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/cognito.const.ts) and replace the parameters with your resource identifiers.
```typescript
export const CognitoConst = {
  googleId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
  poolData : {
    UserPoolId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPool
    ClientId   : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPoolClient
    Paranoia   : 7 // an integer between 1 - 10
  },
  // Admin (optional)
  region           : 'eu-west-1', // Region matching CognitoUserPool region
  adminAccessKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  adminSecretKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
```

Import `CognitoService` and `CognitoConst` inside a component :
```typescript
import { CognitoService } from '@caliatys/cognito-service';
import { CognitoConst }   from './cognito.const';
import { RespType }       from '@caliatys/cognito-service'; // Response enum (onSucces, onFailure, ...)
import { AuthType }       from '@caliatys/cognito-service'; // Provider enum (google, facebook, ...)

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent
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
Login an existing user :
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

#### Enable or Disable MFA
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

## Dependencies

**Important Note**: This project uses the following dependencies :
```json
"@angular/common"            : "^6.0.0-rc.0 || ^6.0.0",
"@angular/core"              : "^6.0.0-rc.0 || ^6.0.0",
"@angular/http"              : "^6.0.3",
"rxjs"                       : "^6.0.0",
"rxjs-compat"                : "^6.0.0",
"amazon-cognito-identity-js" : "2.0.6",
"aws-sdk"                    : "2.247.1",
"@types/gapi"                : "0.0.35",
"@types/gapi.auth2"          : "0.0.47"
```

## Roadmap

### In Progress
- Angular 6 demo

### Planning
- Facebook

### Contributions

Contributions are welcome, please open an issue and preferably submit a pull request.

## Development

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.0.5.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Library Build / NPM Package

Run `npm run package` to build the library and generate an [NPM](https://www.npmjs.com) package.
The build artifacts will be stored in the `dist/lib` folder.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).