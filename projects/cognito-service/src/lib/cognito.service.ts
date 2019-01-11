// Angular modules
import { Injectable }             from '@angular/core';
import { Inject }                 from '@angular/core';
import { Optional }               from '@angular/core';
import { EventEmitter }           from '@angular/core';

// External modules
import * as AWSCognito            from 'amazon-cognito-identity-js';
import * as AWS                   from 'aws-sdk';
import * as awsservice            from 'aws-sdk/lib/service';

// Models
import { CognitoServiceResponse } from './models/cognito-service-response.model';

// Enums
import { AuthType }               from './enums/auth-type.enum';
import { RespType }               from './enums/resp-type.enum';

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
  public  onSignIn          : EventEmitter<null>;
  public  onSignOut         : EventEmitter<null>;

  // private MFA              : boolean = false;

  private storagePrefix    : string;

  private googleId         : string;
  private googleScope      : string;

  private poolData : AWSCognito.ICognitoUserPoolData = {
    UserPoolId : null, // CognitoUserPool
    ClientId   : null  // CognitoUserPoolClient
  };

  private identityPool     : string; // CognitoIdentityPool
  private region           : string; // Region Matching CognitoUserPool region

  private adminAccessKeyId : string;
  private adminSecretKeyId : string;

  private googleAuth       : gapi.auth2.GoogleAuth;
  private cognitoUser      : AWSCognito.CognitoUser;

  constructor
  (
    @Inject('cognitoConst') @Optional() public cognitoConst : any
  )
  {
    this.onSignIn             = new EventEmitter();
    this.onSignOut            = new EventEmitter();

    this.storagePrefix       = cognitoConst.storagePrefix + '_CognitoService_';

    this.googleId            = cognitoConst.googleId;
    this.googleScope         = cognitoConst.googleScope;

    this.poolData.UserPoolId = cognitoConst.poolData.UserPoolId;
    this.poolData.ClientId   = cognitoConst.poolData.ClientId;

    this.identityPool        = cognitoConst.identityPool;

    this.region              = cognitoConst.region;
    this.adminAccessKeyId    = cognitoConst.adminAccessKeyId;
    this.adminSecretKeyId    = cognitoConst.adminSecretKeyId;
  }

  // -------------------------------------------------------------------------------------------
  // SECTION: Helpers --------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: Misc --------------------------------------------------------------------------------

  public isAuthenticated() : boolean
  {
    if (this.getRemaining())
      return true;
    return false;
  }

  public sts() : Promise<AWS.STS.GetCallerIdentityResponse | AWS.AWSError>
  {
    return new Promise((resolve, reject) =>
    {
      let sts = new AWS.STS();
      let params : AWS.STS.GetCallerIdentityRequest = null;
      sts.getCallerIdentity(params, (err : AWS.AWSError, data : AWS.STS.GetCallerIdentityResponse) =>
      {
        if (data)
          return resolve(data);
        console.error('CognitoService : sts -> getCallerIdentity', err);
        return reject(err);
      });
    });
  }

  // NOTE: Session -----------------------------------------------------------------------------

  public autoRefreshSession() : void
  {
    let expiresAt = this.getExpiresAt();
    if (!expiresAt)
      return;

    let timeDiff = expiresAt.getTime() - Date.now() - 60000; // 1 min

    if (timeDiff < 0)
    {
      this.signOut();
      return;
    }

    setTimeout(() =>
    {
      // Refresh token
      this.refreshSession().then(_ =>
      {
        this.autoRefreshSession();
      }).catch(_ =>
      {
        this.signOut();
      });
    }, timeDiff);
  }

  public getRemaining() : number
  {
    let remaining : number = 0;
    let now       : number = 0;
    let max       : Date   = null;
    now = Date.now();
    max = this.getExpiresAt();

    if (!max)
      return null;
    remaining = max.getTime() - now;
    if (remaining <= 0)
      return null;
    return remaining;
  }

  public getExpiresAt() : Date
  {
    let storageKey   : string = null;
    let expiresAtStr : string = null;
    let expiresAtNum : number = null;
    let expiresAtDat : Date   = null;
    storageKey   = this.storagePrefix + 'ExpiresAt';
    expiresAtStr = localStorage.getItem(storageKey);
    if (expiresAtStr)
    {
      expiresAtNum = Number(expiresAtStr);
      if (expiresAtNum)
        expiresAtDat = new Date(expiresAtNum);
    }
    return expiresAtDat;
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

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Credentials ----------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public initCredentials() : void
  {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId : this.identityPool,
    });
    AWS.config.region = this.region;
  }

  public getCredentials() : Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      let credentials = AWS.config.credentials as any;
      if (!credentials)
      {
        let error = 'You must initialize the credentials with initCredentials()';
        console.error('CognitoService : getCredentials', error);
        return reject(error);
      }
      credentials.get((err) =>
      {
        if (err)
        {
          console.error('CognitoService : getCredentials', err);
          return reject(err);
        }
        return resolve(AWS.config.credentials);
      });
    });
  }

  public updateCredentials(clientConfig ?: awsservice.ServiceConfigurationOptions) : void
  {
    let url      : string = null;
    let provider : string = null;
    let idToken  : string = null;

    provider = this.getProvider();
    idToken  = this.getIdToken();

    switch (provider)
    {
      case AuthType.COGNITO :
        url = 'cognito-idp.' + this.region.toLowerCase() + '.amazonaws.com/' + this.poolData.UserPoolId;
        break;
      case AuthType.GOOGLE :
        url = 'accounts.google.com';
        break;
      default :
        console.error('CognitoService : setCredentials -> Provider not recognized');
        return;
    }

    let logins : any = {};
    logins[url] = idToken;

    if (!this.identityPool)
    {
      console.info('We recommend that you provide an identity pool ID from a federated identity');
      return;
    }

    let options : AWS.CognitoIdentityCredentials.CognitoIdentityOptions = {
      IdentityPoolId : this.identityPool,
      Logins         : logins
    };

    AWS.config.region      = this.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials(options, clientConfig);
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: User -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public getCognitoUser(username : string = null) : AWSCognito.CognitoUser
  {
    if (this.cognitoUser)
      return this.cognitoUser; // User stored in the service

    let cognitoUser : AWSCognito.CognitoUser = null;
    let cognitoUserPool = new AWSCognito.CognitoUserPool(this.poolData);

    cognitoUser = cognitoUserPool.getCurrentUser(); // Authenticated user

    if (!cognitoUser)
    {
      let name : string = null;
      if (username)
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
      if (res)
        return res;
      console.error('CognitoService : getUserAttributes -> getUserAttributes', err);
    });
  }

  public deleteAttributes(attributeList : string[]) : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.deleteAttributes(attributeList, (err : Error, res : string) =>
    {
      if (res)
        return res;
      console.error('CognitoService : deleteAttributes -> deleteAttributes', err);
    });
  }

  public getUserData() : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.getUserData((err : Error, res : AWSCognito.UserData) =>
    {
      if (res)
        return res;
      console.error('CognitoService : getUserData -> getUserData', err);
    });
  }

  public deleteUser() : any
  {
    let cognitoUser = this.getCognitoUser();
    cognitoUser.deleteUser((err : Error, res : string) =>
    {
      if (res)
        return res;
      console.error('CognitoService : deleteUser -> deleteUser', err);
    });
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Registration ---------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Register a new user
   *
   * @param username
   * @param password
   * @param userAttributes - Optional parameter
   * @param validationData - Optional parameter
   */
  public signUp(username : string, password : string, userAttributes : AWSCognito.CognitoUserAttribute[] = [], validationData : AWSCognito.CognitoUserAttribute[] = []) : Promise<CognitoServiceResponse>
  {
    let userPool = new AWSCognito.CognitoUserPool(this.poolData);

    return new Promise((resolve, reject) =>
    {
      userPool.signUp(username, password, userAttributes, validationData, (err : Error, res : AWSCognito.ISignUpResult) =>
      {
        if (res)
        {
          this.setUsername(username);
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : signUp -> signUp', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  /**
   * Confirm the signUp action
   *
   * @param verificationCode
   * @param forceAliasCreation - Optional parameter
   */
  public confirmRegistration(verificationCode : string, forceAliasCreation : boolean = false) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.confirmRegistration(verificationCode, forceAliasCreation, (err : any, res : any) =>
      {
        if (res)
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : confirmRegistration -> confirmRegistration', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  /**
   * Resend the signUp confirmation code
   */
  public resendConfirmationCode() : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.resendConfirmationCode((err : Error, res : string) =>
      {
        if (res)
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : resendConfirmationCode -> resendConfirmationCode', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: MFA ------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Login 2nd step for users with MFA enabled
   *
   * @param mfaCode
   * @param mfaType - Optional parameter (SOFTWARE_TOKEN_MFA / SMS_MFA)
   */
  public sendMFACode(mfaCode : string, mfaType : string = null) : Promise<CognitoServiceResponse>
  {
    // TODO: dynamic code
    // SOFTWARE_TOKEN_MFA
    // SMS_MFA
    let cognitoUser = this.getCognitoUser();
    return new Promise((resolve, reject) =>
    {
      cognitoUser.sendMFACode(mfaCode,
      {
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.updateTokens(session);
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, session);
          return resolve(response);
        },
        onFailure : (err : any) =>
        {
          console.error('CognitoService : sendMFACode -> sendMFACode', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        }
      }, mfaType);
    });
  }

  /**
   * Return the user's MFA status
   */
  public getMFAOptions() : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.getMFAOptions((err : Error, res : AWSCognito.MFAOption[]) =>
      {
        if (res)
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : getMFAOptions -> getMFAOptions', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  /**
   * Return the user's MFA status (must have a phone_number set)
   *
   * @param enableMfa
   */
  public setMfa(enableMfa : boolean) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      if (enableMfa)
      {
        cognitoUser.enableMFA((err : Error, res : string) =>
        {
          if (res)
          {
            let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
            return resolve(response);
          }
          console.error('CognitoService : setMfa -> enableMFA', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        });
      }
      else
      {
        cognitoUser.disableMFA((err : Error, res : string) =>
        {
          if (res)
          {
            let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
            return resolve(response);
          }
          console.error('CognitoService : setMfa -> disableMFA', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        });
      }
    });
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Password -------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Set a new password on the first connection (if a new password is required)
   *
   * @param newPassword
   * @param requiredAttributeData - Optional parameter
   */
  public newPasswordRequired(newPassword : string, requiredAttributeData : any = {}) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributeData,
      {
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.updateTokens(session);
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, session);
          return resolve(response);
        },
        onFailure : (err : any) =>
        {
          console.error('CognitoService : newPasswordRequired -> completeNewPasswordChallenge', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        },
        mfaRequired : (challengeName : any, challengeParameters : any) =>
        {
          let response = new CognitoServiceResponse(RespType.MFA_REQUIRED, { challengeName : challengeName, challengeParameters : challengeParameters });
          return resolve(response);
        }
      });
    });
  }

  /**
   * Initiate forgot password flow
   *
   * @param username
   */
  public forgotPassword(username : string) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.setCognitoUser(username);

    return new Promise((resolve, reject) =>
    {
      cognitoUser.forgotPassword(
      {
        onSuccess : (data : any) =>
        {
          // NOTE: onSuccess is called if there is no inputVerificationCode callback
          // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/324
          // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/323
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, data);
          return resolve(response);
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : forgotPassword -> forgotPassword', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        },
        inputVerificationCode : (data : any) =>
        {
          let response = new CognitoServiceResponse(RespType.INPUT_VERIFICATION_CODE, data);
          return resolve(response);
        }
      });
    });
  }

  /**
   * Resend the forgotPassword verification code
   */
  public getAttributeVerificationCode() : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      let name : string = null;
      cognitoUser.getAttributeVerificationCode(name,
      {
        onSuccess : () =>
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, null);
          return resolve(response);
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : getAttributeVerificationCode -> getAttributeVerificationCode', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        },
        inputVerificationCode : (data : string) =>
        {
          let response = new CognitoServiceResponse(RespType.INPUT_VERIFICATION_CODE, data);
          return resolve(response);
        }
      });
    });
  }

  /**
   * Finish forgot password flow
   *
   * @param newPassword
   * @param verificationCode
   */
  public confirmPassword(newPassword : string, verificationCode : string) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.confirmPassword(verificationCode, newPassword,
      {
        onSuccess()
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, null);
          return resolve(response);
        },
        onFailure : (err : Error) =>
        {
          console.error('CognitoService : confirmPassword -> confirmPassword', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        }
      });
    });
  }

  /**
   * Update a user's password
   *
   * @param oldPassword
   * @param newPassword
   */
  public changePassword(oldPassword : string, newPassword : string) : Promise<CognitoServiceResponse>
  {
    let cognitoUser = this.getCognitoUser();

    return new Promise((resolve, reject) =>
    {
      cognitoUser.changePassword(oldPassword, newPassword, (err : Error, res : string) =>
      {
        if (res)
        {
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : changePassword -> changePassword', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Admin ----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public adminCreateUser(username : string, password : string) : Promise<AWS.AWSError | AWS.CognitoIdentityServiceProvider.AdminCreateUserResponse>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminCreateUserRequest = {
      UserPoolId        : this.poolData.UserPoolId,
      Username          : username,
      TemporaryPassword : password
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminCreateUser(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminCreateUserResponse) =>
      {
        if (res)
          return resolve(res);
        console.error('CognitoService : adminCreateUser -> adminCreateUser', err);
        return reject(err);
      });
    });
  }

  public adminDeleteUser(username : string) : Promise<AWS.AWSError | any>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminDeleteUserRequest = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminDeleteUser(params, (err : AWS.AWSError, res : any) =>
      {
        if (res)
          return resolve(res);
        console.error('CognitoService : adminDeleteUser -> adminDeleteUser', err);
        return reject(err);
      });
    });
  }

  public adminResetUserPassword(username : string) : Promise<AWS.AWSError | AWS.CognitoIdentityServiceProvider.AdminResetUserPasswordResponse>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminResetUserPasswordRequest = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminResetUserPassword(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminResetUserPasswordResponse) =>
      {
        if (res)
          return resolve(res);
        console.error('CognitoService : adminResetUserPassword -> adminResetUserPassword', err);
        return reject(err);
      });
    });
  }

  public adminUpdateUserAttributes(username : string, userAttributes : AWS.CognitoIdentityServiceProvider.Types.AttributeListType) : Promise<AWS.AWSError | AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesResponse>
  {
    this.setAdmin();
    let params : AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest = {
      UserPoolId     : this.poolData.UserPoolId,
      Username       : username,
      UserAttributes : userAttributes
    };

    let cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    return new Promise((resolve, reject) =>
    {
      cognitoIdentityServiceProvider.adminUpdateUserAttributes(params, (err : AWS.AWSError, res : AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesResponse) =>
      {
        if (res)
          return resolve(res);
        console.error('CognitoService : adminUpdateUserAttributes -> adminUpdateUserAttributes', err);
        return reject(err);
      });
    });
  }

  public resetExpiredAccount(usernameKey : string, username : string) : Promise<AWS.AWSError | AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesResponse>
  {
    let attributes : AWS.CognitoIdentityServiceProvider.AttributeType[] = [];
    attributes.push({ Name : usernameKey, Value : username });
    return this.adminUpdateUserAttributes(username, attributes);
  }

  public setAdmin() : void
  {
    let creds = new AWS.Credentials(this.adminAccessKeyId, this.adminSecretKeyId);
    AWS.config.region      = this.region;
    AWS.config.credentials = creds;
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Authentication -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  /**
   * Connect an existing user
   *
   * @param provider - Use the AuthType enum to send an authorized authentication provider
   * @param username
   * @param password
   */
  public signIn(provider : string, username ?: string, password ?: string) : Promise<CognitoServiceResponse>
  {
    switch (provider)
    {
      case AuthType.COGNITO :
        return this.authenticateCognitoUser(username, password);
      case AuthType.GOOGLE :
        return this.callGoogle(GoogleAction.AUTHENTICATE);
      default :
        let error = 'Provider not recognized : use the AuthType enum to send an authorized authentication provider';
        console.error(error);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, error);
        return Promise.reject(response);
    }
  }

  /**
   * Refresh a user's session (retrieve refreshed tokens)
   */
  public refreshSession() : Promise<CognitoServiceResponse>
  {
    let provider : string = null;
    provider = this.getProvider();

    switch (provider)
    {
      case AuthType.COGNITO :
        return this.refreshCognitoSession();
      case AuthType.GOOGLE :
        return this.callGoogle(GoogleAction.REFRESH);
      default :
        let error = 'Provider not recognized : the user must be logged in before updating the session';
        console.error(error);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, error);
        return Promise.reject(response);
    }
  }

  public signOut() : void
  {
    let provider : string = null;
    provider = this.getProvider();

    switch (provider)
    {
      case AuthType.COGNITO :
        this.signOutCognito();
        break;
      case AuthType.GOOGLE :
        this.callGoogle(GoogleAction.LOGOUT);
        break;
      default :
        console.error('Provider not recognized : the user must be logged in before logging out');
        break;
    }

    this.onSignOut.emit();
    this.clearStorage();
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Cognito --------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private authenticateCognitoUser(username : string, password : string) : Promise<CognitoServiceResponse>
  {
    let authenticationData : AWSCognito.IAuthenticationDetailsData = {
      Username : username,
      Password : password
    };
    let authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);
    let cognitoUser = this.getCognitoUser(username);

    return new Promise((resolve, reject) =>
    {
      cognitoUser.authenticateUser(authenticationDetails,
      {
        newPasswordRequired : (userAttributes : any, requiredAttributes : any) =>
        {
          this.cognitoUser = cognitoUser; // NOTE: https://github.com/amazon-archives/amazon-cognito-identity-js/issues/365
          let response = new CognitoServiceResponse(RespType.NEW_PASSWORD_REQUIRED, { userAttributes : userAttributes, requiredAttributes : requiredAttributes });
          return resolve(response);
        },
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          this.setUsername(username);
          this.updateTokens(session);
          this.setProvider(AuthType.COGNITO);
          this.updateCredentials();

          this.onSignIn.emit();
          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, session);
          return resolve(response);
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : authenticateCognitoUser -> authenticateUser', err);
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
          return reject(response);
        },
        mfaSetup : (challengeName : any, challengeParameters : any) =>
        {
          cognitoUser.associateSoftwareToken(
          {
            associateSecretCode : (secretCode : string) =>
            {
              let response = new CognitoServiceResponse(RespType.MFA_SETUP_ASSOCIATE_SECRETE_CODE, secretCode);
              return resolve(response);
            },
            onFailure : (err) =>
            {
              let response = new CognitoServiceResponse(RespType.MFA_SETUP_ON_FAILURE, err);
              return reject(response);
            }
          });
        },
        mfaRequired : (challengeName : any, challengeParameters : any) =>
        {
          let response = new CognitoServiceResponse(RespType.MFA_REQUIRED, { challengeName : challengeName, challengeParameters : challengeParameters });
          return resolve(response);
        }
      });
    });
  }

  private refreshCognitoSession() : Promise<CognitoServiceResponse>
  {
    let tokens       = this.getTokens();
    let cognitoUser  = this.getCognitoUser();
    let refreshToken = new AWSCognito.CognitoRefreshToken({ RefreshToken : tokens.refreshToken });

    return new Promise((resolve, reject) =>
    {
      cognitoUser.refreshSession(refreshToken, (err : any, res : any) =>
      {
        if (res)
        {
          this.updateTokens(res);
          this.updateCredentials();

          let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
          return resolve(response);
        }
        console.error('CognitoService : refreshSession -> refreshSession', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  private signOutCognito() : void
  {
    let cognitoUser = this.getCognitoUser();
    if (cognitoUser)
      cognitoUser.signOut();
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // SECTION: Google ---------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private initGoogle() : Promise<CognitoServiceResponse>
  {
    let params  : gapi.auth2.ClientConfig = {
      client_id : this.googleId,
      scope     : this.googleScope
    };

    return new Promise((resolve, reject) =>
    {
      gapi.load('auth2',
      {
        callback  : _ =>
        {
          gapi.auth2.init(params).then((googleAuth : gapi.auth2.GoogleAuth) =>
          {
            this.googleAuth = googleAuth;
            let response = new CognitoServiceResponse(RespType.ON_SUCCESS, googleAuth);
            return resolve(response);
          },
          (reason : { error : string, details : string }) =>
          {
            console.error('CognitoService : initGoogle -> GoogleAuth', reason);
            let response = new CognitoServiceResponse(RespType.ON_FAILURE, reason);
            return reject(response);
          });
        },
        onerror   : _ =>
        { // Handle loading error
          let error = 'gapi.client failed to load';
          console.error('CognitoService : initGoogle -> load', error);
          let response = new CognitoServiceResponse(RespType.ON_ERROR, error);
          return reject(response);
        },
        timeout   : 5000, // 5 seconds
        ontimeout : _ =>
        { // Handle timeout
          let error = 'gapi.client could not load in a timely manner';
          console.error('CognitoService : initGoogle -> load', error);
          let response = new CognitoServiceResponse(RespType.ON_TIMEOUT, error);
          return reject(response);
        }
      });
    });
  }

  private callGoogle(action : string) : Promise<CognitoServiceResponse>
  {
    if (this.googleAuth)
    {
      return this.makeGoogle(action);
    }
    else
    {
      return new Promise((resolve, reject) =>
      {
        this.initGoogle().then(_ =>
        {
          this.makeGoogle(action).then(res => resolve(res)).catch(err => reject(err));
        }).catch(error =>
        {
          let response = new CognitoServiceResponse(RespType.ON_FAILURE, error);
          return Promise.reject(response);
        });
      });
    }
  }

  private makeGoogle(action : string) : Promise<CognitoServiceResponse>
  {
    switch (action)
    {
      case GoogleAction.AUTHENTICATE :
        return this.authenticateGoogleUser();
      case GoogleAction.REFRESH :
        return this.refreshGoogleSession();
      case GoogleAction.LOGOUT :
        this.signOutGoogle();
        let logoutResponse = new CognitoServiceResponse(RespType.ON_SUCCESS, null);
        return Promise.resolve(logoutResponse);
      default :
        let error = 'Google action not recognized : authenticate / refresh / logout';
        console.error(error);
        let defaultResponse = new CognitoServiceResponse(RespType.ON_FAILURE, error);
        return Promise.reject(defaultResponse);
    }
  }

  private authenticateGoogleUser() : Promise<CognitoServiceResponse>
  {
    return new Promise((resolve, reject) =>
    {
      let options : gapi.auth2.SigninOptions = {
        scope : this.googleScope
      };
      this.googleAuth.signIn(options).then((googleUser : gapi.auth2.GoogleUser) =>
      {
        let googleResponse = googleUser.getAuthResponse();
        let googleProfile  = googleUser.getBasicProfile();

        this.setUsername(googleProfile.getName());
        this.setIdToken(googleResponse.id_token);
        this.setExpiresAt(googleResponse.expires_at);
        this.setProvider(AuthType.GOOGLE);
        this.updateCredentials();

        this.onSignIn.emit();
        let response = new CognitoServiceResponse(RespType.ON_SUCCESS, googleProfile);
        return resolve(response);
      }, (onRejected : any) =>
      {
        // Can be : popup_blocked_by_browser
        console.error('CognitoService : authenticateGoogleUser -> signIn', onRejected);
        let response = new CognitoServiceResponse(RespType.ON_REJECTED, onRejected);
        return reject(response);
      }).catch((err) =>
      {
        console.error('CognitoService : authenticateGoogleUser -> signIn', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  private refreshGoogleSession() : Promise<CognitoServiceResponse>
  {
    let googleUser : gapi.auth2.GoogleUser = null;
    googleUser = this.googleAuth.currentUser.get();

    return new Promise((resolve, reject) =>
    {
      googleUser.reloadAuthResponse().then((res : gapi.auth2.AuthResponse) =>
      {
        this.setIdToken(res.id_token);
        this.setExpiresAt(res.expires_at);
        this.updateCredentials();

        let response = new CognitoServiceResponse(RespType.ON_SUCCESS, res);
        return resolve(response);
      }).catch(err =>
      {
        console.error('CognitoService : refreshGoogleSession -> reloadAuthResponse', err);
        let response = new CognitoServiceResponse(RespType.ON_FAILURE, err);
        return reject(response);
      });
    });
  }

  private signOutGoogle() : void
  {
    this.googleAuth.signOut().then(_ =>
    {
      this.googleAuth.disconnect();
    });
  }

  // !SECTION

  // -------------------------------------------------------------------------------------------
  // TODO: Facebook ----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // -------------------------------------------------------------------------------------------
  // SECTION: Private helpers ------------------------------------------------------------------
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
      accessTokenExpiresAt : session.getAccessToken().getExpiration() * 1000, // Seconds to milliseconds
      idToken              : session.getIdToken().getJwtToken(),
      idTokenExpiresAt     : session.getIdToken().getExpiration() * 1000, // Seconds to milliseconds
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

  // !SECTION

}
