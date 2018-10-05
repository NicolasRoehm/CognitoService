// Angular modules
import { Injectable }        from '@angular/core';
import { Inject }            from '@angular/core';
import { Optional }          from '@angular/core';
import { EventEmitter }      from '@angular/core';
import { HttpClient }        from '@angular/common/http';

// External modules
import { Observable }        from 'rxjs';
import { from }              from 'rxjs';
import * as AWS              from 'aws-sdk';
import * as AWSCognito       from 'amazon-cognito-identity-js';

// Internal modules
import { AuthType }          from './enums/auth-type.enum';
import { RespType }          from './enums/resp-type.enum';

export enum GoogleAction
{
  AUTHENTICATE = 'authenticate',
  REFRESH      = 'refresh',
  LOGOUT       = 'logout'
}

@Injectable({
  providedIn : 'root'
})
export class CognitoService
{
  public  emitLogout       : EventEmitter<null>;

  // private MFA              : boolean = false;

  private storagePrefix    : string;
  private sessionTime      : number;

  private googleId         : string;
  private googleScope      : string;

  private poolData : AWSCognito.ICognitoUserPoolData = {
    UserPoolId : null, // CognitoUserPool
    ClientId   : null  // CognitoUserPoolClient
  };

  // private identityPool     : string; // CognitoIdentityPool

  private region           : string; // Region Matching CognitoUserPool region
  private adminAccessKeyId : string;
  private adminSecretKeyId : string;

  private googleAuth       : gapi.auth2.GoogleAuth;
  private cognitoUser      : AWSCognito.CognitoUser;

  constructor
  (
    @Inject('cognitoConst') @Optional() public cognitoConst : any,
    private http ?: HttpClient
  )
  {
    this.emitLogout          = new EventEmitter();

    this.storagePrefix       = cognitoConst.storagePrefix + '_CognitoService_';
    this.sessionTime         = cognitoConst.sessionTime  || 3500000;

    this.googleId            = cognitoConst.googleId;
    this.googleScope         = cognitoConst.googleScope;

    this.poolData.UserPoolId = cognitoConst.poolData.UserPoolId;
    this.poolData.ClientId   = cognitoConst.poolData.ClientId;

    // this.identityPool        = cognitoConst.identityPool;

    this.region              = cognitoConst.region;
    this.adminAccessKeyId    = cognitoConst.adminAccessKeyId;
    this.adminSecretKeyId    = cognitoConst.adminSecretKeyId;
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Helpers -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: Misc --------------------------------------------------------------------------------

  public isAuthenticated() : boolean
  {
    if(this.getRemaining())
      return true;
    return false;
  }

  // NOTE: Session -----------------------------------------------------------------------------

  public updateSessionTime() : void
  {
    let expiresAt = this.getExpiresAt();
    let nextTime  = Date.now() + this.sessionTime;

    if(!expiresAt)
      return;

    if(nextTime < (expiresAt*1000))
    {
      this.setExpiresAt(nextTime);
      return;
    }

    // Refresh token
    this.refreshCognitoSession().subscribe(res =>
    {
      this.setExpiresAt(nextTime);
    },
    err =>
    {
      this.emitLogout.emit(); // Emmit logout
    });
  }

  public getRemaining() : number
  {
    let remaining : number = 0;
    let now       : number = 0;
    let max       : number = 0;
    now = Date.now();
    max = this.getExpiresAt();

    if(!max)
      return null;
    remaining = (max*1000) - now;
    if(remaining <= 0)
      return null;
    return remaining;
  }

  public getExpiresAt() : number
  {
    let storageKey   : string = null;
    let expiresAtStr : string = null;
    let expiresAtNum : number = null;
    storageKey   = this.storagePrefix + 'ExpiresAt';
    expiresAtStr = localStorage.getItem(storageKey);
    if(expiresAtStr)
      expiresAtNum = Number(expiresAtStr);
    return expiresAtNum;
  }

  // NOTE: Username ----------------------------------------------------------------------------

  public getUsername() : string
  {
    let storageKey : string = null;
    let provider   : string = null;
    storageKey = this.storagePrefix + 'Username';
    provider   = localStorage.getItem(storageKey);
    return provider;
  }

  // NOTE: Provider ----------------------------------------------------------------------------

  public getProvider() : string
  {
    let storageKey : string = null;
    let provider   : string = null;
    storageKey = this.storagePrefix + 'Provider';
    provider   = localStorage.getItem(storageKey);
    return provider;
  }

  // NOTE: Token -------------------------------------------------------------------------------

  public getIdToken() : string
  {
    let storageKey : string = null;
    let idToken    : string = null;
    storageKey = this.storagePrefix + 'IdToken';
    idToken    = localStorage.getItem(storageKey);
    return idToken;
  }

  public getTokens() : any
  {
    let storageKey : string = null;
    let tokensStr  : string = null;
    let tokensObj  : any    = null;
    storageKey = this.storagePrefix + 'SessionTokens';
    tokensStr  = localStorage.getItem(storageKey);
    tokensObj  = JSON.parse(tokensStr);
    return tokensObj;
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: User --------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public getCognitoUser(username : string = null) : AWSCognito.CognitoUser
  {
    if(this.cognitoUser)
      return this.cognitoUser; // User stored in the service

    let cognitoUser : AWSCognito.CognitoUser = null;
    let cognitoUserPool = new AWSCognito.CognitoUserPool(this.poolData);

    cognitoUser = cognitoUserPool.getCurrentUser(); // Authenticated user

    if(!cognitoUser)
    {
      let name : string = null;
      if(username)
        name = username; // User sent
      else
        name = this.getUsername(); // User stored in local storage
      cognitoUser = this.setCognitoUser(name);
    }

    return cognitoUser;
  }

  public getUserAttributes() : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.getUserAttributes((err : Error, res : AWSCognito.CognitoUserAttribute[]) =>
    {
      if(res)
        return res;
      console.error('CognitoService : getUserAttributes -> getUserAttributes', err);
    });
  }

  public deleteAttributes(attributeList : string[]) : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.deleteAttributes(attributeList, (err : Error, res : string) =>
    {
      if(res)
        return res;
      console.error('CognitoService : deleteAttributes -> deleteAttributes', err);
    });
  }

  public getUserData() : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.getUserData((err : Error, res : AWSCognito.UserData) =>
    {
      if(res)
        return res;
      console.error('CognitoService : getUserData -> getUserData', err);
    });
  }

  public deleteUser() : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.deleteUser((err : Error, res : string) =>
    {
      if(res)
        return res;
      console.error('CognitoService : deleteUser -> deleteUser', err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Registration ------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Signup user
   *
   * @param username
   * @param password
   * @param userAttributes - Optional parameter
   * @param validationData - Optional parameter
   */
  public signUp(username : string, password : string, userAttributes : AWSCognito.CognitoUserAttribute[] = [], validationData : AWSCognito.CognitoUserAttribute[] = []) : Observable<any>
  {
    let userPool = new AWSCognito.CognitoUserPool(this.poolData);

    return from(new Promise((resolve, reject) =>
    {
      userPool.signUp(username, password, userAttributes, validationData, (err : Error, res : AWSCognito.ISignUpResult) =>
      {
        if(res)
        {
          this.setUsername(username);
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        }
        console.error('CognitoService : signUp -> signUp', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  /**
   * Confirm the signup action
   *
   * @param verificationCode
   * @param forceAliasCreation - Optional parameter
   */
  public confirmRegistration(verificationCode : string, forceAliasCreation : boolean = false) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.confirmRegistration(verificationCode, forceAliasCreation, (err : any, res : any) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : confirmRegistration -> confirmRegistration', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  /**
   * Resend the signUp confirmation code
   */
  public resendConfirmationCode() : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.resendConfirmationCode((err : Error, res : string) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : resendConfirmationCode -> resendConfirmationCode', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: MFA ---------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Login 2nd step for users with MFA enabled
   *
   * @param mfaCode
   * @param mfaType - Optional parameter (SOFTWARE_TOKEN_MFA / SMS_MFA)
   */
  public sendMFACode(mfaCode : string, mfaType : string = null) : Observable<any>
  {
    // TODO: dynamic code
    // SOFTWARE_TOKEN_MFA
    // SMS_MFA
    let cognitoUser = this.getCognitoUser();
    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.sendMFACode(mfaCode,
      {
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.updateTokens(session);
          return resolve({ type : RespType.ON_SUCCESS, data : session });
        },
        onFailure : (err : any) =>
        {
          console.error('CognitoService : sendMFACode -> sendMFACode', err);
          return reject({ type : RespType.ON_FAILURE, data : err });
        }
      }, mfaType);
    }));
  }

  /**
   * Return the user's MFA status
   */
  public getMFAOptions() : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.getMFAOptions((err : Error, res : AWSCognito.MFAOption[]) => {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });

        console.error('CognitoService : getMFAOptions -> getMFAOptions', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  /**
   * Return the user's MFA status (must have a phone_number set)
   *
   * @param enableMfa
   */
  public setMfa(enableMfa : boolean) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      if(enableMfa)
      {
        cognitoUser.enableMFA((err : Error, res : string) => {
          if(res)
            return resolve({ type : RespType.ON_SUCCESS, data : res });

          console.error('CognitoService : setMfa -> enableMFA', err);
          return reject({ type : RespType.ON_FAILURE, data : err });
        });
      }
      else
      {
        cognitoUser.disableMFA((err : Error, res : string) => {
          if(res)
            return resolve({ type : RespType.ON_SUCCESS, data : res });

          console.error('CognitoService : setMfa -> disableMFA', err);
          return reject({ type : RespType.ON_FAILURE, data : err });
        });
      }
    }));
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Password ----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Login user after they set a new password, if a new password is required
   *
   * @param newPassword
   * @param requiredAttributeData - Optional parameter
   */
  public newPasswordRequired(newPassword : string, requiredAttributeData : any = {}) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributeData,
      {
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.updateTokens(session);
          return resolve({ type : RespType.ON_SUCCESS, data : session });
        },
        onFailure : (err : any) =>
        {
          console.error('CognitoService : newPasswordRequired -> completeNewPasswordChallenge', err);
          return reject(err);
        },
        mfaRequired : (challengeName : any, challengeParameters : any) =>
        {
          return resolve({ type : RespType.MFA_REQUIRED, data : { challengeName : challengeName, challengeParameters : challengeParameters } });
        }
      });
    }));
  }

  /**
   * Initiate forgot password flow
   *
   * @param username
   */
  public forgotPassword(username : string) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser(username);

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.forgotPassword({
        onSuccess : (data : any) =>
        {
          // NOTE: onSuccess is called if there is no inputVerificationCode callback
          // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/324
          // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/323
          return resolve({ type : RespType.ON_SUCCESS, data : data });
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : forgotPassword -> forgotPassword', err);
          return reject(err);
        },
        inputVerificationCode : (data : any) =>
        {
          return resolve({ type : RespType.INPUT_VERIFICATION_CODE, data : data });
        }
      });
    }));
  }

  /**
   * Resend the forgotPassword verification code
   */
  public getAttributeVerificationCode() : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      let name : string = null;
      cognitoUser.getAttributeVerificationCode(name, {
        onSuccess : () =>
        {
          return resolve({ type : RespType.ON_SUCCESS, data : null });
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : getAttributeVerificationCode -> getAttributeVerificationCode', err);
          return reject({ type : RespType.ON_FAILURE, data : err });
        },
        inputVerificationCode : (data : string) =>
        {
          return resolve({ type : RespType.INPUT_VERIFICATION_CODE, data : data });
        }
      });
    }));
  }

  /**
   * Finish forgot password flow
   *
   * @param newPassword
   * @param verificationCode
   */
  public confirmPassword(newPassword : string, verificationCode : string) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.confirmPassword(verificationCode, newPassword,
      {
        onSuccess()
        {
          return resolve();
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : confirmPassword -> confirmPassword', err);
          return reject(err);
        }
      });
    }));
  }

  /**
   * Update a user's password
   *
   * @param oldPassword
   * @param newPassword
   */
  public changePassword(oldPassword : string, newPassword : string) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.changePassword(oldPassword, newPassword, (err : Error, res : string) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : changePassword -> changePassword', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Admin -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public adminCreateUser(username : string, password : string) : Observable<any>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminCreateUserRequest = {
      UserPoolId        : this.poolData.UserPoolId,
      Username          : username,
      TemporaryPassword : password
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return from(new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminCreateUser(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminCreateUserResponse) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : adminCreateUser -> adminCreateUser', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  public adminDeleteUser(username : string) : Observable<any>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminDeleteUserRequest = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return from(new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminDeleteUser(params, (err : AWS.AWSError, res : any) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : adminDeleteUser -> adminDeleteUser', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  public adminResetUserPassword(username : string) : Observable<any>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminResetUserPasswordRequest = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return from(new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminResetUserPassword(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminResetUserPasswordResponse) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : adminResetUserPassword -> adminResetUserPassword', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  public adminUpdateUserAttributes(username : string, userAttributes : AWS.CognitoIdentityServiceProvider.Types.AttributeListType) : Observable<any>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest = {
      UserPoolId     : this.poolData.UserPoolId,
      Username       : username,
      UserAttributes : userAttributes
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return from(new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminUpdateUserAttributes(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesResponse) =>
      {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        console.error('CognitoService : adminUpdateUserAttributes -> adminUpdateUserAttributes', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  public resetExpiredAccount(usernameKey : string, username : string) : void
  {
    let attributes : AWS.CognitoIdentityServiceProvider.AttributeType[] = [];
    attributes.push({ Name : usernameKey, Value : username });
    this.adminUpdateUserAttributes(username, attributes);
  }

  public setAdmin() : void
  {
    let creds = new AWS.Credentials(this.adminAccessKeyId, this.adminSecretKeyId);
    AWS.config.region      = this.region;
    AWS.config.credentials = creds;
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Authentication ----------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public authenticateUser(provider : string, username ?: string, password ?: string) : Observable<any>
  {
    return from(new Promise((resolve, reject) =>
    {
      switch(provider)
      {
        case AuthType.COGNITO :
          this.authenticateCognitoUser(username, password).subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        case AuthType.GOOGLE :
          this.callGoogle(GoogleAction.AUTHENTICATE).subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        default :
          break;
      }
    }));
  }

  public refreshSession() : Observable<any>
  {
    let provider : string = null;
    provider = this.getProvider();

    return from(new Promise((resolve, reject) =>
    {
      switch(provider)
      {
        case AuthType.COGNITO :
          this.refreshCognitoSession().subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        case AuthType.GOOGLE :
          this.callGoogle(GoogleAction.REFRESH).subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        default :
          break;
      }
    }));
  }

  public signOut() : void
  {
    let provider : string = null;
    provider = this.getProvider();

    switch(provider)
    {
      case AuthType.COGNITO :
        this.signOutCognito();
        break;
      case AuthType.GOOGLE  :
        this.callGoogle(GoogleAction.LOGOUT);
        break;
      default :
        break;
    }

    this.clearStorage();
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Cognito -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Login user
   *
   * @param username
   * @param password
   */
  private authenticateCognitoUser(username : string, password : string) : Observable<any>
  {
    let authenticationData : AWSCognito.IAuthenticationDetailsData = {
      Username : username,
      Password : password
    };
    let authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);
    let cognitoUser = this.getCognitoUser(username);

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.authenticateUser(authenticationDetails,
      {
        newPasswordRequired : (userAttributes : any, requiredAttributes : any) =>
        {
          this.cognitoUser = cognitoUser; // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/365
          return resolve({ type : RespType.NEW_PASSWORD_REQUIRED, data : { userAttributes : userAttributes, requiredAttributes : requiredAttributes } });
        },
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.setUsername(username);
          this.updateTokens(session);
          this.setProvider(AuthType.COGNITO);
          return resolve({ type : RespType.ON_SUCCESS, data : session });
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : authenticateUserPool -> authenticateUser', err);
          return reject({ type : RespType.ON_FAILURE, data : err });
        },
        mfaSetup : (challengeName : any, challengeParameters : any) =>
        {
          cognitoUser.associateSoftwareToken(
          {
            associateSecretCode : (secretCode : string) =>
            {
              return resolve({ type : RespType.MFA_SETUP_ASSOCIATE_SECRETE_CODE, data : secretCode });
            },
            onFailure : (err) =>
            {
              return reject({ type : RespType.MFA_SETUP_ON_FAILURE, data : err });
            }
          });
        },
        mfaRequired : (challengeName : any, challengeParameters : any) =>
        {
          return resolve({ type : RespType.MFA_REQUIRED, data : { challengeName : challengeName, challengeParameters : challengeParameters } });
        }
      });
    }));
  }

  /**
   * Refresh a user's session (retrieve refreshed tokens)
   */
  private refreshCognitoSession() : Observable<any>
  {
    let tokens       = this.getTokens();
    let cognitoUser  = this.getCognitoUser();
    let refreshToken = new AWSCognito.CognitoRefreshToken({ RefreshToken : tokens.refreshToken });

    return from(new Promise((resolve, reject) =>
    {
      cognitoUser.refreshSession(refreshToken, (err : any, res : any) =>
      {
        if(res)
        {
          this.updateTokens(res);
          return resolve({ type : RespType.ON_SUCCESS, data : res });
        }
        console.error('CognitoService : refreshSession -> refreshSession', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  private signOutCognito() : void
  {
    let cognitoUser = this.getCognitoUser();
    if(cognitoUser)
      cognitoUser.signOut();
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Google ------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private initGoogle() : Observable<any>
  {
    let params : gapi.auth2.ClientConfig = {
      client_id : this.googleId,
      scope     : this.googleScope
    };

    return from(new Promise((resolve, reject) =>
    {
      gapi.load('auth2', () =>
      {
        let initAuth : gapi.auth2.GoogleAuth = null;
        initAuth = gapi.auth2.init(params);

        initAuth.then((googleAuth : gapi.auth2.GoogleAuth) =>
        {
          this.googleAuth = googleAuth;
          return resolve();
        },
        (reason : { error : string, details : string }) =>
        {
          console.error('CognitoService : initGoogle -> GoogleAuth', reason);
          return reject();
        });
      });
    }));
  }

  private callGoogle(action : string) : Observable<any>
  {
    return from(new Promise((resolve, reject) =>
    {
      if(this.googleAuth)
      {
        this.makeGoogle(action).subscribe(res => { return resolve(res); }, err => { return reject(err); });
      }
      else
      { // Init google
        this.initGoogle().subscribe(res =>
        {
          this.makeGoogle(action).subscribe(res => { return resolve(res); }, err => { return reject(err); });
        },
        err =>
        {
          console.error('CognitoService : callGoogle -> initGoogle', err);
        });
      }
    }));
  }

  private makeGoogle(action : string) : Observable<any>
  {
    return from(new Promise((resolve, reject) =>
    {
      switch(action)
      {
        case GoogleAction.AUTHENTICATE :
          this.authenticateGoogleUser().subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        case GoogleAction.REFRESH :
          this.refreshGoogleSession().subscribe(res => { return resolve(res); }, err => { return reject(err); });
          break;
        case GoogleAction.LOGOUT :
          this.signOutGoogle();
          return resolve();
      }
    }));
  }

  private authenticateGoogleUser() : Observable<any>
  {
    return from(new Promise((resolve, reject) =>
    {
      let options : gapi.auth2.SigninOptions = {
        scope : this.googleScope
      };
      this.googleAuth.signIn(options).then((googleUser : gapi.auth2.GoogleUser) =>
      {
        let idToken  : string                  = null;
        let profile  : gapi.auth2.BasicProfile = null;
        let response : gapi.auth2.AuthResponse = null;

        idToken  = googleUser.getId();
        response = googleUser.getAuthResponse();
        profile  = googleUser.getBasicProfile();

        this.setUsername(profile.getName());
        this.setIdToken(idToken);
        this.setExpiresAt(response.expires_at);
        this.setProvider(AuthType.GOOGLE);

        // this.buildGoogleCredentials();
        return resolve({ type : RespType.ON_SUCCESS, data : profile });
      },
      (onRejected : any) =>
      {
        // Can be : popup_blocked_by_browser
        console.error('CognitoService : loginGoogle -> signIn', onRejected);
        return reject({ type : RespType.ON_REJECTED, data : onRejected });
      })
      .catch((err) =>
      {
        console.error('CognitoService : loginGoogle -> signIn', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  private refreshGoogleSession() : Observable<any>
  {
    let googleUser : gapi.auth2.GoogleUser = null;
    googleUser = this.googleAuth.currentUser.get();

    return from(new Promise((resolve, reject) =>
    {
      googleUser.reloadAuthResponse().then((res : gapi.auth2.AuthResponse) =>
      {
        this.setIdToken(res.id_token);
        this.setExpiresAt(res.expires_at);
        return resolve({ type : RespType.ON_SUCCESS, data : res });
      })
      .catch(err =>
      {
        console.error('CognitoService : refreshGoogleSession -> reloadAuthResponse', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  private signOutGoogle() : void
  {
    this.googleAuth.signOut().then(() => {
      this.googleAuth.disconnect();
    });
  }

  // -------------------------------------------------------------------------------------------
  // TODO: Facebook ----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // -------------------------------------------------------------------------------------------
  // NOTE: Private helpers ---------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: User --------------------------------------------------------------------------------

  private setCognitoUser(username : string) : AWSCognito.CognitoUser
  {
    let cognitoUser : AWSCognito.CognitoUser = null;
    let cognitoUserPool = new AWSCognito.CognitoUserPool(this.poolData);

    let userData : AWSCognito.ICognitoUserData = {
      Username   : username,
      Pool       : cognitoUserPool
    };
    cognitoUser = new AWSCognito.CognitoUser(userData);

    this.cognitoUser = cognitoUser; // Store the user in the service
    this.setUsername(username); // Store the username in the local storage

    return cognitoUser;
  }

  // NOTE: Session -----------------------------------------------------------------------------

  private setExpiresAt(expiresAt : number) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'ExpiresAt';
    localStorage.setItem(storageKey, expiresAt.toString());
  }

  // NOTE: Username ----------------------------------------------------------------------------

  private setUsername(username : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'Username';
    localStorage.setItem(storageKey, username);
  }

  // NOTE: Provider ----------------------------------------------------------------------------

  private setProvider(provider : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'Provider';
    localStorage.setItem(storageKey, provider);
  }

  // NOTE: Token -------------------------------------------------------------------------------

  private setIdToken(token : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'IdToken';
    localStorage.setItem(storageKey, token);
  }

  private setTokens(session : AWSCognito.CognitoUserSession) : void
  {
    let storageKey : string = null;
    let tokensStr  : string = null;
    let tokensObj  : any    = null;

    storageKey = this.storagePrefix + 'SessionTokens';
    tokensObj  = {
      accessToken          : session.getAccessToken().getJwtToken(),
      accessTokenExpiresAt : session.getAccessToken().getExpiration(),
      idToken              : session.getIdToken().getJwtToken(),
      idTokenExpiresAt     : session.getIdToken().getExpiration(),
      refreshToken         : session.getRefreshToken().getToken()
    };
    tokensStr = JSON.stringify(tokensObj);
    localStorage.setItem(storageKey, tokensStr);
  }

  private updateTokens(session : AWSCognito.CognitoUserSession) : void
  {
    let tokens : any = null;
    this.setTokens(session);
    tokens = this.getTokens();
    this.setIdToken(tokens.idToken);
    this.setExpiresAt(tokens.idTokenExpiresAt);
  }

  // NOTE: Storage -----------------------------------------------------------------------------

  private clearStorage() : void
  {
    localStorage.removeItem(this.storagePrefix + 'Username');
    localStorage.removeItem(this.storagePrefix + 'Provider');
    localStorage.removeItem(this.storagePrefix + 'IdToken');
    localStorage.removeItem(this.storagePrefix + 'ExpiresAt');
    localStorage.removeItem(this.storagePrefix + 'SessionTokens');
  }

}
