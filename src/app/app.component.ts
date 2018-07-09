// Angular modules
import { Component }          from '@angular/core';
import { ViewChild }          from '@angular/core';
import { MatSnackBar }        from '@angular/material';
import { Http }               from '@angular/http';
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

import { CognitoConst }       from './cognito.const';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent
{

  @ViewChild('loginForm') loginForm : LoginFormComponent;

  public apiURL   : string = '';

  public refreshList : any = [];
  public requestList : any = [];

  public cognitoService : CognitoService;

  constructor
  (
    public  snackBar  : MatSnackBar,
    private http      : Http,
    private translate : TranslateService
  )
  {
    this.cognitoService = new CognitoService(CognitoConst);
    // NOTE: This language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('en');
    // NOTE: The lang to use, if the lang isn't available, it will use the current loader to get them
    translate.use('en');
  }

  // -------------------------------------------------------------------------------
  // NOTE: Actions -----------------------------------------------------------------
  // -------------------------------------------------------------------------------

  public logout() : void
  {
    this.cognitoService.signOut();
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
      if(res.code === 1)
        this.onSuccessLogin();

      // MFA required
      if(res.code === 2)
        this.loginForm.showMfaForm();
    },
    err =>
    {
      // Hide loader
      // First connection
      if(err.code === 1)
        this.loginForm.showPwdForm(true);

      // Error
      if(err.code === 2)
      {
        console.error('AppComponent : login -> authenticateUser', err);
        this.snackBar.open(this.translate.instant('ERROR_LOGIN_FAILED'), 'X');
      }

      // MFA setup : associate secret code
      if(err.code === 3)
        this.loginForm.showMfaSetupForm('JBSWY3DPEHPK3PXP', 'otpauth://totp/john@doe.com?secret=JBSWY3DPEHPK3PXP&issuer=Caliatys');

      // MFA setup : error
      if(err.code === 4)
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
      if(res.code === 2)
        this.loginForm.showPwdForm(false);
    },
    err =>
    {
      let errorMsg  : string = null;
      let errorCode : string = null;
      errorCode = err.code;

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
      if(res.code === 1)
        this.loginForm.hidePwdForm();
      // MFA required
      if(res.code === 2)
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
      errorCode = err.code;

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

  public runLoop() : void
  {
    let every : number = null;
    every = 1740000; // 15 min (900000) or 29 min (1740000)
    setInterval(() => {
      this.askRefresh();
    }, every);
  }

  public askRefresh() : void
  {
    let refreshResp : any    = null;
    let time        : string =  null;

    time = new Date().toLocaleString();

    refreshResp = this.cognitoService.refreshSession();

    this.refreshList.push({ time: time, response : refreshResp });
  }

  public request() : void
  {
    let token       : string = null;
    let time        : string = null;

    time  = new Date().toLocaleString();
    token = this.cognitoService.getIdToken();

    this.requestBP(token).subscribe(res =>
    {
      this.requestList.push({ time: time, response : res });
    },
    err =>
    {
      console.error('AppComponent : request -> requestBP', err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Api gateway request -----------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public requestBP(token : string) : Observable<any>
  {
    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', token);

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      this.http.get(this.apiURL + 'business-profile', { headers : headers }).subscribe(
      (res : Response) =>
      {
        let result = res.json();
        console.log(result);
        return resolve(result);
      },
      (err : HttpErrorResponse) =>
      {
        console.error('CognitoService : requestBP', err);
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
    console.log(this.cognitoService.getIdToken());
    // this.askRefresh(); // Run once
    // this.runLoop(); // Then run loop
  }

}
