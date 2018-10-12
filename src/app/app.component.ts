// Angular modules
import { Component }          from '@angular/core';
import { OnInit }             from '@angular/core';
import { OnDestroy }          from '@angular/core';
import { ViewChild }          from '@angular/core';
import { MatSnackBar }        from '@angular/material';
import { HttpParams }         from '@angular/common/http';
import { HttpHeaders }        from '@angular/common/http';
import { HttpClient }         from '@angular/common/http';
import { HttpErrorResponse }  from '@angular/common/http';

// External modules
import { Subscription }             from 'rxjs';
import { Observable }               from 'rxjs';
import { from }                     from 'rxjs';
import { TranslateService }         from '@ngx-translate/core';
import { Idle }                     from '@ng-idle/core';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive }                from '@ng-idle/keepalive';

// Components
import { LoginFormComponent } from '@caliatys/login-form';

// Enums
import { AuthError }          from './auth.enum';

// Services
import { CognitoService }     from 'cognito-service';
import { AuthType }           from 'cognito-service';
import { RespType }           from 'cognito-service';

// Consts
import { CognitoConst }       from './cognito.const';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy
{
  // NOTE: @caliatys/login-form
  @ViewChild('loginForm') loginForm : LoginFormComponent;

  // NOTE: @caliatys/cognito-service
  public  cognitoService  : CognitoService = new CognitoService(CognitoConst);
  public  isAuthenticated : boolean = false;

  // NOTE: Session with : @ng-idle/core - @ng-idle/keepalive - @caliatys/cognito-service
  public  idleState : string  = 'Not started.';
  public  timedOut  : boolean = null;
  public  lastPing ?: Date    = null;
  private logoutSub : Subscription;

  // NOTE: Authenticated request
  private apiURL    : string = 'YOUR_API_URL';

  constructor
  (
    public  snackBar  : MatSnackBar,
    private idle      : Idle,
    private http      : HttpClient,
    private translate : TranslateService,
    private keepalive : Keepalive
  )
  {
    // This language will be used as a fallback when a translation isn't found in the current language
    translate.setDefaultLang('en');
    // The lang to use, if the lang isn't available, it will use the current loader to get them
    translate.use('en');
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

  // -------------------------------------------------------------------------------------------
  // NOTE: Actions -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: Logout ------------------------------------------------------------------------------

  public logout() : void
  {
    this.cognitoService.signOut();
    this.isAuthenticated = false;
  }

  // NOTE: Google login ------------------------------------------------------------------------

  public loginSocial($event : any) : void
  {
    if(!$event)
      return;

    let social : string = null;
    social = $event.social;

    if(social !== AuthType.GOOGLE)
      return;

    // Show loader
    this.cognitoService.authenticateUser(AuthType.GOOGLE).subscribe(res =>
    {
      console.log(res);
      this.onSuccessLogin();
    },
    err =>
    {
      console.log(err);
    });
  }

  // NOTE: Cognito login -----------------------------------------------------------------------

  public login($event : any) : void
  {
    let username : string = null;
    let password : string = null;
    username = $event.username;
    password = $event.password;

    // Show loader
    this.cognitoService.authenticateUser(AuthType.COGNITO, username, password).subscribe(res =>
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

  // -------------------------------------------------------------------------------------------

  public forgotPassword($event : any) : void
  {
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
        case AuthError.FORGOT_PWD_VERIF_USER :
          errorMsg = this.translate.instant('ERROR_INCORRECT_USER');
          break;
        case AuthError.FORGOT_PWD_VERIF_INIT :
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

  // NOTE: First connection --------------------------------------------------------------------

  public firstPassword($event : any) : void
  {
    let username    : string = null;
    let newPassword : string = null;
    username    = $event.username;
    newPassword = $event.password;

    this.cognitoService.newPasswordRequired(newPassword).subscribe(res =>
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

  // NOTE: Lost password -----------------------------------------------------------------------

  public lostPassword($event : any) : void
  {
    let newPassword : string = null;
    let verifCode   : string = null;
    newPassword = $event.password;
    verifCode   = $event.verificationCode;

    this.cognitoService.confirmPassword(newPassword, verifCode).subscribe(res =>
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

  // Do not add these two following functions inside your project !
  // You can use them to test the cognito service if you are logged in.

  // NOTE: Refresh session ---------------------------------------------------------------------

  public refresh() : void
  {
    this.cognitoService.refreshSession().subscribe(res => {
      console.log(res);
      console.log(new Date(res.data.expires_at));
    }, err => {
      console.log(err);
    });
  }

  // NOTE: Api gateway request -----------------------------------------------------------------

  public request() : Observable<any>
  {
    let token = this.cognitoService.getIdToken();
    let params  : HttpParams  = null;
    let headers : HttpHeaders = null;
    let options : any         = {};
    params  = new HttpParams();
    headers = new HttpHeaders({
      'Content-Type'  : 'application/json',
      'Authorization' : token
    });
    options.headers = headers;
    options.params  = params;

    return from(new Promise((resolve, reject) =>
    {
      this.http.get(this.apiURL, options).subscribe((res : ArrayBuffer) => {
        console.log(res);
        return resolve(res);
      }, (err : HttpErrorResponse) => {
        console.error('AppComponent : request', err);
        return reject(err);
      });
    }));
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Session management ------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------------------------
  // ---- NOTE: Subscription -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------------------------
  // NOTE: Private functions -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private onSuccessLogin() : void
  {
    console.log('Authenticated !');
    console.log(this.cognitoService.getUsername());
    console.log(this.cognitoService.getProvider());
    console.log(this.cognitoService.getIdToken());
    console.log(new Date(this.cognitoService.getExpiresAt()));
    this.isAuthenticated = true;
  }

}
