// https://github.com/aws-samples/aws-cognito-apigw-angular-auth/blob/master/src/app/aws.service.ts

// Angular modules
import { Injectable }        from '@angular/core';
import { Inject }            from '@angular/core';
import { Optional }          from '@angular/core';
import { HttpClient }        from '@angular/common/http';

// External modules
import { Observable }        from 'rxjs';
import 'rxjs/add/observable/fromPromise';
import * as AWS              from 'aws-sdk';
import * as AWSCognito       from 'amazon-cognito-identity-js';

// Internal modules
import { AuthType }          from './enums/auth-type.enum';
import { RespType }          from './enums/resp-type.enum';

@Injectable({
  providedIn : 'root'
})
export class CognitoService
{
  // public googleCreds   : any;
  // public googleProfile : any;
  // public googleData    : any;

  // public MFA : boolean = false;
  public googleId    : string = null;
  public googleScope : string = null;

  public poolData : AWSCognito.ICognitoUserPoolData = {
    UserPoolId : null, // CognitoUserPool
    ClientId   : null  // CognitoUserPoolClient
  };
  public identityPool : string = null; // CognitoIdentityPool
  public region       : string = null; // Region Matching CognitoUserPool region

  public adminAccessKeyId : string = null;
  public adminSecretKeyId : string = null;

  public storagePrefix : string = 'CognitoService';

  // private subscribe   : Subscription;
  // private timer       : Observable<number>;
  private googleAuth  : gapi.auth2.GoogleAuth;
  private cognitoUser : AWSCognito.CognitoUser;

  constructor
  (
    @Inject('cognitoConst') @Optional() public cognitoConst : any,
    private http ?: HttpClient
  )
  {
    this.googleId            = cognitoConst.googleId;
    this.googleScope         = cognitoConst.googleScope;

    this.poolData.UserPoolId = cognitoConst.poolData.UserPoolId;
    this.poolData.ClientId   = cognitoConst.poolData.ClientId;
    this.identityPool        = cognitoConst.identityPool;
    this.region              = cognitoConst.region;

    this.adminAccessKeyId    = cognitoConst.adminAccessKeyId;
    this.adminSecretKeyId    = cognitoConst.adminSecretKeyId;

    // this.initGoogle();
  }

  // ----------------------------------------------------------------------------------------------
  // NOTE: Helpers --------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------

  // NOTE: Misc

  public isAuthenticated() : boolean
  {
    let tokens = this.getTokens();
    if(!tokens)
      return false;
    if(tokens.idTokenExpiresAt < Math.round(Date.now()/1000))
      return false;
    return true;
  }

  // NOTE: Username

  public getUsername() : string
  {
    let storageKey : string = null;
    let provider   : string = null;
    storageKey = this.storagePrefix + 'Username';
    provider   = localStorage.getItem(storageKey);
    return provider;
  }

  public setUsername(username : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'Username';
    localStorage.setItem(storageKey, username);
  }

  // NOTE: Provider

  public getProvider() : string
  {
    let storageKey : string = null;
    let provider   : string = null;
    storageKey = this.storagePrefix + 'Provider';
    provider   = localStorage.getItem(storageKey);
    return provider;
  }

  public setProvider(provider : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'Provider';
    localStorage.setItem(storageKey, provider);
  }

  // NOTE: Token

  public setIdToken(token : string) : void
  {
    let storageKey : string = null;
    storageKey = this.storagePrefix + 'IdToken';
    localStorage.setItem(storageKey, token);
  }

  public getIdToken() : string
  {
    let storageKey : string = null;
    let idToken    : string = null;
    storageKey = this.storagePrefix + 'IdToken';
    idToken    = localStorage.getItem(storageKey);
    return idToken;
  }

  public setTokens(session : AWSCognito.CognitoUserSession) : void
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

  public updateTokens(session : AWSCognito.CognitoUserSession) : void
  {
    let tokens : any = null;
    this.setTokens(session);
    tokens = this.getTokens();
    this.setIdToken(tokens.idToken);
  }

  // NOTE: Storage

  public clearStorage() : void
  {
    localStorage.removeItem(this.storagePrefix + 'Username');
    localStorage.removeItem(this.storagePrefix + 'Provider');
    localStorage.removeItem(this.storagePrefix + 'IdToken');
    localStorage.removeItem(this.storagePrefix + 'SessionTokens');
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: User --------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public setCognitoUser(username : string) : AWSCognito.CognitoUser
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      userPool.signUp(username, password, userAttributes, validationData, (err : Error, res : AWSCognito.ISignUpResult) => {
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.confirmRegistration(verificationCode, forceAliasCreation, (err : any, res : any) => {
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.resendConfirmationCode((err : Error, res : string) => {
        if(res)
          return resolve({ type : RespType.ON_SUCCESS, data : res });

        console.error('CognitoService : resendConfirmationCode -> resendConfirmationCode', err);
        return reject({ type : RespType.ON_FAILURE, data : err });
      });
    }));
  }

  /**
   * Login user
   *
   * @param username
   * @param password
   */
  public authenticateUser(username : string, password : string) : Observable<any>
  {
    let authenticationData : AWSCognito.IAuthenticationDetailsData = {
      Username : username,
      Password : password
    };
    let authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);
    let cognitoUser = this.getCognitoUser(username);

    return Observable.fromPromise(new Promise((resolve, reject) =>
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
  public refreshCognitoSession() : Observable<any>
  {
    let tokens       = this.getTokens();
    let cognitoUser  = this.getCognitoUser();
    let refreshToken = new AWSCognito.CognitoRefreshToken({ RefreshToken : tokens.refreshToken });

    return Observable.fromPromise(new Promise((resolve, reject) => {
      cognitoUser.refreshSession(refreshToken, (err : any, res : any) => {
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

  public signOut() : void
  {
    // if (this.getProvider() === AuthType.COGNITO)
      this.signOutCognito();
    // else if (this.getProvider() === AuthType.GOOGLE)
    //   this.signOutGoogle();

    this.clearStorage();
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
    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

  // TODO: Check if it's for what I think

  /**
   * Resend the forgotPassword verification code
   */
  public getAttributeVerificationCode() : Observable<any>
  {
    let cognitoUser = this.getCognitoUser();

    return Observable.fromPromise(new Promise((resolve, reject) =>
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
        inputVerificationCode : (data: string) =>
        {
          //
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.changePassword(oldPassword, newPassword, (err : Error, res : string) => {
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

    return Observable.fromPromise(new Promise((resolve, reject) =>
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

  // public initGoogle() : void
  // {
  //   let params : gapi.auth2.ClientConfig = {
  //     client_id : this.googleId,
  //     scope     : this.googleScope
  //   };

  //   gapi.load('auth2', () =>
  //   {
  //     this.googleAuth = gapi.auth2.init(params);
  //   });
  // }

  // public loginGoogle() : Observable<any>
  // {
  //   return Observable.fromPromise(new Promise((resolve, reject) =>
  //   {
  //     let options : gapi.auth2.SigninOptions = {
  //       scope : this.googleScope
  //     };
  //     this.googleAuth.signIn(options).then((onfulfilled : gapi.auth2.GoogleUser) => {

  //       console.log('CognitoService : loginGoogle -> signIn succeeded');

  //       let idToken : string                  = null;
  //       let profile : gapi.auth2.BasicProfile = null;

  //       idToken = onfulfilled.getId();
  //       profile = onfulfilled.getBasicProfile();

  //       this.setIdToken(idToken);
  //       this.setProvider(AuthType.GOOGLE);
  //       // this.buildGoogleCredentials();

  //       return resolve(profile);

  //     }, (onrejected : any) => {
  //       console.error('CognitoService : loginGoogle -> signIn', onrejected);
  //     }).catch((err) =>
  //     {
  //       console.error('CognitoService : loginGoogle -> signIn', err);
  //       this.signOut();
  //       return reject();
  //     });
  //   }));
  // }

  // -------------------------------------------------------------------------------------------
  // NOTE: Session -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // public askRefresh() : Observable<any>
  // {
  //   var provider : string = null;
  //   var idToken  : string = null;
  //   provider = this.getProvider();
  //   idToken  = this.getIdToken();

  //   if(!idToken)
  //   {
  //     return Observable.fromPromise(new Promise((resolve, reject) => {
  //       this.signOut();
  //       this.clearStorage();
  //       console.error('CognitoService : askRefresh -> Token does not exist...');
  //       reject();
  //     }));
  //   }

  //   if(provider === AuthType.COGNITO)
  //     return this.refreshTokenCognito();
  //   else if(provider === AuthType.GOOGLE)
  //     return this.checkAndRefreshTokenGoogle();
  // }

  // public startRefreshTimer() : void
  // {
  //   this.timer     = timer(0, 30000); // 5 min
  //   this.subscribe = this.timer.subscribe(() =>
  //   {
  //     this.renew();
  //     // this.askRefresh().subscribe(res =>
  //     // {
  //     //   console.log('CognitoService : startRefreshTimer -> askRefresh succeeded');
  //     // }, err => {
  //     //   console.error('CognitoService : startRefreshTimer -> askRefresh', err);
  //     // });
  //   });
  // }

  // public checkAndRefreshTokenGoogle() : Observable<any>
  // {
  //   return Observable.fromPromise(new Promise((resolve, reject) =>
  //   {
  //     this.checkGoogleTokenValidity().subscribe((res)=>
  //     {
  //       if(res === RespType.EXPIRED_TOKEN)
  //       {
  //         console.error('CognitoService : askRefresh -> The Google token has expired');
  //         this.refreshTokenGoogle().subscribe(()=>
  //         {
  //           resolve();
  //         }, err => {
  //           reject();
  //         });
  //         return;
  //       }
  //       else
  //       {
  //         console.log('CognitoService : askRefresh -> checkGoogleTokenValidity succeeded');
  //         this.buildGoogleCredentials();
  //         resolve();
  //       }
  //     }, err => {
  //       console.error('CognitoService : askRefresh -> checkGoogleTokenValidity', err);
  //       this.refreshTokenGoogle().subscribe(() =>
  //       {
  //         resolve();
  //       }, err => {
  //         reject();
  //       });
  //     });
  //   }));
  // }

  // public checkGoogleTokenValidity() : Observable<any>
  // {
  //   return this.http.get('https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=' + this.getIdToken()).map((res : any) =>
  //   {
  //     if(res.expires_in && res.expires_in < 1800) // NOTE: Refresh google session each 30 min
  //       return RespType.EXPIRED_TOKEN;
  //     return res;
  //   }).catch(err => {
  //     return Observable.throw(err || 'Server error');
  //   });
  // }

  // public refreshTokenCognito() : Observable<any>
  // {
  //   // Not working : https://gist.github.com/kndt84/5be8e86a15468ed1c8fc3699429003ad
  //   // Working     : https://github.com/awslabs/aws-cognito-angular-quickstart/issues/39
  //   this.buildCognitoCredentials();
  //   this.cognitoUser = this.getCurrentUser();
  //   return Observable.fromPromise(new Promise((resolve, reject) =>
  //   {
  //     this.cognitoUser.getSession((err, session : AWSCognito.CognitoUserSession) =>
  //     {
  //       if(err)
  //       {
  //         console.error('CognitoService : askRefresh -> getSession', err);
  //         return reject();
  //       }
  //       else
  //       {
  //         this.setTokens(session);
  //         console.log('CognitoService : askRefresh -> getSession succeeded');
  //         return resolve();
  //       }
  //     });
  //   }));
  // }

  // public refreshTokenGoogle() : Observable<any>
  // {
  //   var user : gapi.auth2.GoogleUser = null;
  //   user = gapi.auth2.getAuthInstance().currentUser.get();

  //   return Observable.fromPromise(new Promise((resolve, reject) =>
  //   {
  //     user.reloadAuthResponse().then((res : gapi.auth2.AuthResponse) => {
  //       console.log('CognitoService : refreshTokenGoogle -> reloadAuthResponse succeeded');

  //       this.setIdToken(res.id_token);
  //       this.setProvider(AuthType.GOOGLE);

  //       resolve();
  //     }).catch(err => {
  //       console.error('CognitoService : refreshTokenGoogle -> reloadAuthResponse', err);

  //       this.signOut();

  //       reject();
  //     });
  //   }));
  // }

  // -------------------------------------------------------------------------------------------
  // NOTE: Private -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // private buildCognitoCredentials() : void
  // {
  //   let url    : string = 'cognito-idp.' + this.region + '.amazonaws.com/' + this.poolData.UserPoolId;
  //   let logins : any    = {};
  //   logins[url] = this.getIdToken();
  //   AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //     IdentityPoolId : this.identityPool,
  //     Logins         : { logins }
  //   });
  //   AWS.config.credentials
  // }

  // private buildGoogleCredentials() : void
  // {
  //   AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //     IdentityPoolId : this.identityPool,
  //     Logins         : { 'accounts.google.com' : this.getIdToken() }
  //   });
  //   // 'graph.facebook.com'
  // }

  // private isAuthenticatedGoogle() : boolean
  // {
  //   let isAuthenticated : boolean = false;
  //   if(gapi.auth2)
  //     isAuthenticated = gapi.auth2.getAuthInstance().isSignedIn.get();
  //   return isAuthenticated;
  // }

  // private isAuthenticatedCognito() : boolean
  // {
  //   // TODO: Change this is auth by a refresh token test
  //   // let isAuthenticated : boolean = false;

  //   // let cognitoUser = this.getCurrentUser();
  //   // if(cognitoUser)
  //   //   cognitoUser.getSession((err, session : AWSCognito.CognitoUserSession) =>
  //   //   {
  //   //     isAuthenticated = session.isValid();
  //   //   });
  //   return true;
  // }

  private signOutCognito() : void
  {
    let cognitoUser = this.getCognitoUser();
    if(cognitoUser)
      cognitoUser.signOut();
  }

  private signOutGoogle() : void
  {
    let user : gapi.auth2.GoogleUser = null;
    if(gapi.auth2)
    {
      user = gapi.auth2.getAuthInstance().currentUser.get();
      user.disconnect();
    }
  }

}
