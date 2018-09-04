// Angular modules
import { Component }          from '@angular/core';
import { ViewChild }          from '@angular/core';
import { ChangeDetectorRef }  from '@angular/core';
import { MatSnackBar }        from '@angular/material';
import { Http }               from '@angular/http';
import { HttpParams }         from '@angular/common/http';
import { HttpHeaders }        from '@angular/common/http';
import { HttpClient }         from '@angular/common/http';
import { Headers }            from '@angular/http';
import { Response }           from '@angular/http';
import { HttpErrorResponse }  from '@angular/common/http';

// External modules
import { Observable }         from 'rxjs/Observable';
import { Subscription }       from 'rxjs/Subscription';
import { TranslateService }   from '@ngx-translate/core';

// Components
import { LoginFormComponent } from '@caliatys/login-form';

// Enums
import { AuthError }          from './auth.enum';

// Services
import { CognitoService }     from 'cognito-service';
import { AuthType }           from 'cognito-service';
import { RespType }           from 'cognito-service';

import { CognitoConst }       from './cognito.const';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent
{

  @ViewChild('loginForm') loginForm : LoginFormComponent;

  public apiURL      : string = '';

  public refreshList : any = [];
  public requestList : any = [];

  public cognitoService  : CognitoService;
  public isAuthenticated : boolean = false;

  constructor
  (
    public  snackBar  : MatSnackBar,
    private http      : HttpClient,
    private translate : TranslateService,
    private cdRef     : ChangeDetectorRef,
  )
  {
    this.cognitoService = new CognitoService(CognitoConst);
    // NOTE: This language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('en');
    // NOTE: The lang to use, if the lang isn't available, it will use the current loader to get them
    translate.use('en');

    this.isAuthenticated = this.cognitoService.isAuthenticated();
    console.log(this.isAuthenticated);
  }

  // -------------------------------------------------------------------------------
  // NOTE: Actions -----------------------------------------------------------------
  // -------------------------------------------------------------------------------

  public logout() : void
  {
    this.cognitoService.signOut();
    this.isAuthenticated = false;
  }

  public login($event : any) : void
  {
    if(!$event)
      return;

    let username : string = null;
    let password : string = null;
    username = $event.username;
    password = $event.password;

    // Show loader
    this.cognitoService.authenticateUser(username, password).subscribe(res =>
    {
      // Success login
      if(res.type === RespType.ON_SUCCESS)
        this.onSuccessLogin();

      // First connection
      if(res.type === RespType.NEW_PASSWORD_REQUIRED)
        this.loginForm.showPwdForm(true);

      // MFA required
      if(res.type === RespType.MFA_REQUIRED)
        this.loginForm.showMfaForm();

      // MFA setup : associate secret code
      if(res.type === RespType.MFA_SETUP_ASSOCIATE_SECRETE_CODE)
        this.loginForm.showMfaSetupForm('JBSWY3DPEHPK3PXP', 'otpauth://totp/john@doe.com?secret=JBSWY3DPEHPK3PXP&issuer=Caliatys');
    },
    err =>
    {
      // Hide loader

      // Error
      if(err.type === RespType.ON_FAILURE)
      {
        console.error('AppComponent : login -> authenticateUser', err);
        this.snackBar.open(this.translate.instant('ERROR_LOGIN_FAILED'), 'X');
      }

      // MFA setup : error
      if(err.type === RespType.MFA_SETUP_ON_FAILURE)
      {
        console.error('AppComponent : login -> authenticateUser', err);
        this.snackBar.open(err.data, 'X');
      }
    });
  }

  public forgotPassword($event : any) : void
  {
    if(!$event)
      return;

    let username : string = null;
    username = $event.username;

    if(!username)
    {
      this.snackBar.open(this.translate.instant('ERROR_USR_REQUIRED'), 'X');
      return;
    }

    this.cognitoService.forgotPassword(username).subscribe(res =>
    {
      // Verification code
      if(res.type === RespType.INPUT_VERIFICATION_CODE)
        this.loginForm.showPwdForm(false);
    },
    err =>
    {
      let errorMsg  : string = null;
      let errorCode : string = null;
      errorCode = err.data;

      switch(errorCode)
      { // NOTE: This example use AWS errors
        case AuthError.FORGOT_PASS_VERIF_EMAIL :
          errorMsg = this.translate.instant('ERROR_INCORRECT_EMAIL');
          break;
        case AuthError.FORGOT_PASS_VERIF_INIT :
          errorMsg = this.translate.instant('ERROR_FORGOT_PASS_VERIF_INIT');
          break;
        case AuthError.VERIF_LIMIT :
          errorMsg = this.translate.instant('ERROR_VERIF_LIMIT');
          break;
        case AuthError.VERIF_AUTHORIZATION :
          errorMsg = this.translate.instant('ERROR_VERIF_AUTHORIZATION');
          break;
        default :
          errorMsg = this.translate.instant('ERROR_AMAZON_POLICY');
          break;
      }

      console.error('AppComponent : forgotPassword -> forgotPassword', err);
      this.snackBar.open(errorMsg, 'X');
    });
  }

  public firstPassword($event : any) : void
  { // NOTE: First connection
    if(!$event)
      return;

    let username    : string = null;
    let newPassword : string = null;
    username    = $event.username;
    newPassword = $event.password;

    this.cognitoService.changePassword(newPassword).subscribe(res =>
    {
      // Success
      if(res.type === RespType.ON_SUCCESS)
        this.loginForm.hidePwdForm();
      // MFA required
      if(res.type === RespType.MFA_REQUIRED)
        this.loginForm.showMfaForm();

      this.snackBar.open(this.translate.instant('SUCCESS_UPDATE_PWD'), 'x');
    },
    err =>
    {
      console.error('AppComponent : firstPassword -> changePassword', err);
      this.snackBar.open(this.translate.instant('ERROR_AMAZON_POLICY'), 'x');
    });
  }

  public lostPassword($event : any) : void
  { // NOTE: Lost password
    if(!$event)
      return;

    let username    : string = null;
    let newPassword : string = null;
    let verifCode   : string = null;
    username    = $event.username;
    newPassword = $event.password;
    verifCode   = $event.verificationCode;

    this.cognitoService.confirmPassword(username, newPassword, verifCode).subscribe(res =>
    {
      this.loginForm.hidePwdForm(newPassword);
      this.snackBar.open(this.translate.instant('SUCCESS_UPDATE_PWD'), 'x');
    },
    err =>
    {
      let errorMsg  : string = null;
      let errorCode : string = null;
      errorCode = err.data;

      switch(errorCode)
      { // NOTE: This example use AWS errors
        case AuthError.VERIF_CODE :
          errorMsg = this.translate.instant('ERROR_VERIF_CODE');
          break;
        case AuthError.VERIF_LIMIT :
          errorMsg = this.translate.instant('ERROR_VERIF_LIMIT');
          break;
        default :
          errorMsg = this.translate.instant('ERROR_AMAZON_POLICY');
          break;
      }

      console.error('AppComponent : lostPassword -> confirmPassword', err);
      this.snackBar.open(errorMsg, 'x');
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Refresh session ---------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public refresh() : void
  {
    this.cognitoService.refreshCognitoSession().subscribe(res => {
      console.log(res);
    }, err => {
      console.log(err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Api gateway request -----------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public requestBP() : Observable<any>
  {
    let token = this.cognitoService.getIdToken();
    let params  : HttpParams  = null;
    let headers : HttpHeaders = null;
    let options : any         = {};
    params  = new HttpParams();
    headers = new HttpHeaders({
      'Content-Type'        : 'application/json',
      'Authorization'       : token
    });
    options.headers = headers;
    options.params  = params;

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      this.http.get('YOUR_API_URL', options).subscribe((res : ArrayBuffer) => {
        console.log(res);
        return resolve(res);
      }, (err : HttpErrorResponse) => {
        console.error('AppComponent : requestBP', err);
        return reject(err);
      });
    }));
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Private functions -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private onSuccessLogin() : void
  {
    console.log('Authenticated !');
    console.log(this.cognitoService.getUsername());
    console.log(this.cognitoService.getProvider());
    console.log(this.cognitoService.getIdToken());
    this.isAuthenticated = true;
  }

}
