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

    let login    : string = null;
    let password : string = null;
    login    = $event.login;
    password = $event.password;

    // Show loader
    this.cognitoService.authenticateUser(login, password).subscribe(res =>
    {
      console.log('Authenticated !');
      console.log(this.cognitoService.getIdToken());
      // this.askRefresh(); // Run once
      this.runLoop(); // Then run loop
    },
    err =>
    {
      // Hide loader
      // First connection
      if(err.code === 1)
        this.loginForm.showPwdForm(true);

      // Error
      if(err.code === 2)
        this.snackBar.open(this.translate.instant('ERROR_LOGIN_FAILED'), 'X');
    });
  }

  public forgotPassword($event : any) : void
  { // NOTE: onClickForgotPassword
    if(!$event)
      return;

    let login : string = null;
    login = $event.login;

    if(!login)
    {
      this.snackBar.open(this.translate.instant('ERROR_LOGIN_REQUIRED'), 'X');
      return;
    }

    this.cognitoService.forgotPassword(login).subscribe((res : any) =>
    {
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

      this.snackBar.open(errorMsg, 'X');
    });
  }

  public firstPassword($event : any) : void
  { // NOTE: First connection
    if(!$event)
      return;

    let newPassword : string = null;
    newPassword = $event.newPassword;

    this.cognitoService.changePassword(newPassword).subscribe(res =>
    {
      this.loginForm.hidePwdForm();
      this.snackBar.open(this.translate.instant('SUCCESS_UPDATE_PWD'), 'x');
    },
    err =>
    {
      this.snackBar.open(this.translate.instant('ERROR_AMAZON_POLICY'), 'x');
    });
  }

  public lostPassword($event : any) : void
  { // NOTE: Lost password
    if(!$event)
      return;

    let newPassword : string = null;
    let verifCode   : string = null;
    newPassword = $event.newPassword;
    verifCode   = $event.verifCode;

    this.cognitoService.confirmPassword(newPassword, verifCode).subscribe(res =>
    {
      this.loginForm.hidePwdForm();
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
      this.http.get(this.apiURL + 'business_profile', { headers : headers }).subscribe(
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

}
