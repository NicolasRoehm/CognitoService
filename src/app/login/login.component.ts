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
      console.error('LoginComponent : loginSocial -> authenticateUser', err);
    });
  }

  // NOTE: Cognito login -----------------------------------------------------------------------

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
      {
        this.loginForm.hidePwdForm();
        this.login($event);
      }

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
      console.error('LoginComponent : forgotPassword -> forgotPassword', err);
      this.snackBar.open(err.data.message, 'X');
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
      console.error('LoginComponent : resetPassword -> confirmPassword', err);
      this.snackBar.open(err.data.message, 'X');
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
