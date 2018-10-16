// Angular modules
import { Component }          from '@angular/core';
import { ViewChild }          from '@angular/core';
import { Router }             from '@angular/router';
import { MatSnackBar }        from '@angular/material';

// External modules
import { TranslateService }   from '@ngx-translate/core';
import { LoginFormComponent } from '@caliatys/login-form';

// Helpers
import { CognitoHelper }      from '../shared/helpers/cognito.helper';

// Enums
import { AuthError }          from '../shared/enums/auth.enum';

@Component({
  moduleId    : module.id,
  templateUrl : 'login.component.html',
  styleUrls   : ['login.component.scss']
})
export class LoginComponent
{
  // NOTE: @caliatys/login-form
  @ViewChild('loginForm') loginForm : LoginFormComponent;

  constructor
  (
    public  router        : Router,
    public  snackBar      : MatSnackBar,
    private cognitoHelper : CognitoHelper,
    private translate     : TranslateService
  )
  {
    if(this.cognitoHelper.cognitoService.isAuthenticated())
      this.onSuccessLogin();
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Actions -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: Google login ------------------------------------------------------------------------

  public loginSocial($event : any) : void
  {
    if(!$event)
      return;

    let social : string = null;
    social = $event.social;

    if(social !== this.cognitoHelper.authType.GOOGLE)
      return;

    // Show loader
    this.cognitoHelper.cognitoService.authenticateUser(this.cognitoHelper.authType.GOOGLE).subscribe(res =>
    {
      console.log(res);
      this.onSuccessLogin();
    },
    err =>
    {
      console.error(err);
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
      // Hide loader

      // Error
      if(err.type === this.cognitoHelper.respType.ON_FAILURE)
      {
        console.error('LoginComponent : login -> authenticateUser', err);
        this.snackBar.open(this.translate.instant('ERROR_LOGIN_FAILED'), 'X');
      }

      // MFA setup : error
      if(err.type === this.cognitoHelper.respType.MFA_SETUP_ON_FAILURE)
      {
        console.error('LoginComponent : login -> authenticateUser', err);
        this.snackBar.open(err.data, 'X');
      }
    });
  }

  // NOTE: First connection --------------------------------------------------------------------

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

      this.snackBar.open(this.translate.instant('SUCCESS_UPDATE_PWD'), 'x');
    },
    err =>
    {
      console.error('LoginComponent : firstPassword -> changePassword', err);
      this.snackBar.open(this.translate.instant('ERROR_AMAZON_POLICY'), 'x');
    });
  }

  // NOTE: Forgot password ---------------------------------------------------------------------

  public forgotPassword($event : any) : void
  {
    let username : string = null;
    username = $event.username;

    if(!username)
    {
      this.snackBar.open(this.translate.instant('ERROR_USR_REQUIRED'), 'X');
      return;
    }

    this.cognitoHelper.cognitoService.forgotPassword(username).subscribe(res =>
    {
      // Verification code
      if(res.type === this.cognitoHelper.respType.INPUT_VERIFICATION_CODE)
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

      console.error('LoginComponent : forgotPassword -> forgotPassword', err);
      this.snackBar.open(errorMsg, 'X');
    });
  }

  // NOTE: Reset password -----------------------------------------------------------------------

  // Complete the forgot password flow

  public resetPassword($event : any) : void
  {
    let newPassword : string = null;
    let verifCode   : string = null;
    newPassword = $event.password;
    verifCode   = $event.verificationCode;

    this.cognitoHelper.cognitoService.confirmPassword(newPassword, verifCode).subscribe(res =>
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

      console.error('LoginComponent : resetPassword -> confirmPassword', err);
      this.snackBar.open(errorMsg, 'x');
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Private functions -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private onSuccessLogin() : void
  {
    console.log('LoginComponent : onSuccessLogin');
    console.log('%c' + 'Username : '  + this.cognitoHelper.cognitoService.getUsername()            , 'color: white; background-color: #0764D3;');
    console.log('%c' + 'Provider : '  + this.cognitoHelper.cognitoService.getProvider()            , 'color: white; background-color: green;');
    console.log('%c' + 'IdToken : '   + this.cognitoHelper.cognitoService.getIdToken()             , 'color: white; background-color: black;');
    console.log('%c' + 'ExpiresAt : ' + new Date(this.cognitoHelper.cognitoService.getExpiresAt()) , 'color: black; background-color: white;');
    this.router.navigate(['/home']);
  }

}
