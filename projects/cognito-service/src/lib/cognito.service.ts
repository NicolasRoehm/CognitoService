// https://github.com/aws-samples/aws-cognito-apigw-angular-auth/blob/master/src/app/aws.service.ts

// Angular modules
import { Injectable }        from '@angular/core';
import { Inject }            from '@angular/core';
import { Optional }          from '@angular/core';

// External modules
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/fromPromise';
import { Observable }        from 'rxjs/Observable';
import * as AWS              from 'aws-sdk';
import * as AWSCognito       from 'amazon-cognito-identity-js';

@Injectable({
  providedIn: 'root'
})
export class CognitoService
{
  // public googleCreds   : any;
  // public googleProfile : any;
  // public googleData    : any;

  // public MFA : boolean = false;
  // public googleId : string = null;
  public poolData : any    = {
    UserPoolId : null, // CognitoUserPool
    ClientId   : null  // CognitoUserPoolClient
  };
  public identityPool : string = null; // CognitoIdentityPool
  public region       : string = null; // Region Matching CognitoUserPool region

  public adminAccessKeyId : string = null;
  public adminSecretKeyId : string = null;

  public storagePrefix : string = 'CognitoService';

  constructor
  (
    @Inject('cognitoConst') @Optional() public cognitoConst ?: any
  )
  {
    // this.googleId            = cognitoConst.googleId;
    this.poolData.UserPoolId = cognitoConst.poolData.UserPoolId;
    this.poolData.ClientId   = cognitoConst.poolData.ClientId;
    this.identityPool        = cognitoConst.identityPool;
    this.region              = cognitoConst.region;
    this.adminAccessKeyId    = cognitoConst.adminAccessKeyId;
    this.adminSecretKeyId    = cognitoConst.adminSecretKeyId;
  }

  // ----------------------------------------------------------------------------------------------
  // NOTE: Helpers --------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------

  public isAuthenticated() : boolean
  {
    let currentUser : AWSCognito.CognitoUser = null;
    currentUser = this.getCurrentUser();
    if(currentUser)
      return true;
    return false;
  }

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
    tokensObj = {
      accessToken  : session.getAccessToken().getJwtToken(),
      idToken      : session.getIdToken().getJwtToken(),
      refreshToken : session.getRefreshToken().getToken()
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

  // -------------------------------------------------------------------------------------------
  // NOTE: User --------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public getCognitoUser(username : string) : AWSCognito.CognitoUser
  {
    let userPool = new AWSCognito.CognitoUserPool(this.poolData);
    let userData = {
      Username : username,
      Pool     : userPool
    };
    return new AWSCognito.CognitoUser(userData);
  }

  public getCurrentUser() : AWSCognito.CognitoUser
  {
    let userPool = new AWSCognito.CognitoUserPool(this.poolData);
    return userPool.getCurrentUser();
  }

  public getUserAttributes(username : string) : any
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.getUserAttributes((err, res : AWSCognito.CognitoUserAttribute[]) =>
    {
      if(res)
        return res;
      console.error('CognitoService : getUserAttributes -> getUserAttributes', err);
    });
  }

  public deleteAttributes(attributeList : string[]) : any
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.deleteAttributes(attributeList, (err, res) =>
    {
      if(res)
        return res;
      console.error('CognitoService : deleteAttributes -> deleteAttributes', err);
    });
  }

  public getUserData() : any
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.getUserData((err, res) =>
    {
      if(res)
        return res;
      console.error('CognitoService : getUserData -> getUserData', err);
    });
  }

  public getUsername() : string
  {
    let cognitoUser = this.getCurrentUser();
    return cognitoUser.getUsername();
  }

  public deleteUser() : any
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.deleteUser((err, res) =>
    {
      if(res)
        return res;
      console.error('CognitoService : deleteUser -> deleteUser', err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Session -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public refreshSession() : any
  {
    // Not working : https://gist.github.com/kndt84/5be8e86a15468ed1c8fc3699429003ad
    // Working     : https://github.com/awslabs/aws-cognito-angular-quickstart/issues/39
    let cognitoUser = this.getCurrentUser();
    cognitoUser.getSession((err, res) =>
    {
      if(res)
        return res;
      console.error('CognitoService : refreshSession -> getSession', err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Authentication ----------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public authenticateUserPool(username : string, password : string) : Observable<any>
  {
    let authenticationData = {
      Username : username,
      Password : password,
    };
    let authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);
    let cognitoUser = this.getCognitoUser(username);

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.authenticateUser(authenticationDetails,
      {
        // TODO: Add MFA
        newPasswordRequired : (userAttributes, requiredAttributes) =>
        {
          reject(-1);
        },
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          let tokens : any = null;
          this.setTokens(session);
          tokens = this.getTokens();
          this.setIdToken(tokens.idToken);
          resolve(session);
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : authenticateUserPool -> authenticateUser', err);
          reject(-2);
        }
      });
    }));
  }

  // public authenticateFacebook(authResult : any, region : string, profile : any) : void
  // {
  //   // Add the Facebook access token to the Cognito credentials login map.
  //   AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //     IdentityPoolId : this.identityPool,
  //     Logins : {
  //       'graph.facebook.com': authResult['id_token']
  //     }
  //   });

  //   // Obtain AWS credentials
  //   AWS.config.getCredentials(() =>
  //   {
  //     // Access AWS resources here.
  //     let creds = {
  //       accessKey    : AWS.config.credentials.accessKeyId,
  //       secretKey    : AWS.config.credentials.secretAccessKey,
  //       sessionToken : AWS.config.credentials.sessionToken
  //     };
  //     // let googleData = {
  //     //   awsCreds      : creds,
  //     //   googleProfile : profile
  //     // };
  //     // // TODO: To store with localstorage
  //     // this.googleData    = googleData;
  //     // this.googleCreds   = creds;
  //     // this.googleProfile = profile;
  //   });
  // }

  // public authenticateGoogle(authResult : any, region : string, profile : any) : void
  // {
  //   // Add the Google access token to the Cognito credentials login map.
  //   AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //     IdentityPoolId : this.identityPool,
  //     Logins : {
  //       'accounts.google.com': authResult['id_token']
  //     }
  //   });

  //   // Obtain AWS credentials
  //   AWS.config.getCredentials(() =>
  //   {
  //     // Access AWS resources here.
  //     let creds = {
  //       accessKey    : AWS.config.credentials.accessKeyId,
  //       secretKey    : AWS.config.credentials.secretAccessKey,
  //       sessionToken : AWS.config.credentials.sessionToken
  //     };
  //     let googleData = {
  //       awsCreds      : creds,
  //       googleProfile : profile
  //     };
  //     // TODO: To store with localstorage
  //     this.googleData    = googleData;
  //     this.googleCreds   = creds;
  //     this.googleProfile = profile;
  //   });
  // }

  public signOut() : void
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.signOut();
    localStorage.removeItem(this.storagePrefix + 'IdToken');
    localStorage.removeItem(this.storagePrefix + 'SessionTokens');
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Password ----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public confirmPassword(newPassword : string, verificationCode : string) : Observable<any>
  {
    let cognitoUser = this.getCurrentUser();
    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.confirmPassword(verificationCode, newPassword,
      {
        onSuccess()
        {
          resolve();
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : confirmPassword -> confirmPassword', err);
          reject(err);
        }
      });
    }));
  }

  public changePassword(newPassword : string, requiredAttributeData : any = {}) : Observable<any>
  {
    let cognitoUser = this.getCurrentUser();
    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributeData,
      {
        onSuccess : (session : AWSCognito.CognitoUserSession) =>
        {
          resolve(session);
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : changePassword -> completeNewPasswordChallenge', err);
          reject(err);
        }
        // TODO: Add MFA
      });
    }));
  }

  public forgotPassword(username : string) : Observable<any>
  {
    let cognitoUser = this.getCognitoUser(username);
    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoUser.forgotPassword({
        onSuccess : (res) =>
        {
          console.log('CognitoService : forgotPassword -> forgotPassword', res);
          resolve(res);
        },
        onFailure : (err) =>
        {
          console.error('CognitoService : forgotPassword -> forgotPassword', err);
          reject(err);
        },
        inputVerificationCode()
        {
          resolve(1);
        }
      });
    }));
  }

  public resendConfirmationCode() : any
  {
    let cognitoUser = this.getCurrentUser();
    cognitoUser.resendConfirmationCode((err, res) =>
    {
      if(res)
        return res;
      console.error('CognitoService : resendConfirmationCode -> resendConfirmationCode', err);
    });
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Admin -------------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  public adminCreateUser(username : string, password : string) : Observable<any>
  {
    this.setAdmin();
    var params = {
      UserPoolId        : this.poolData.UserPoolId,
      Username          : username,
      TemporaryPassword : password,
    };

    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoidentityserviceprovider.adminCreateUser(params, (err, res) =>
      {
        if(res)
        {
          resolve(res);
        }
        else
        {
          console.error('CognitoService : adminCreateUser -> adminCreateUser', err);
          reject(err);
        }
      });
    }));
  }

  public adminDeleteUser(username : string) : Observable<any>
  {
    this.setAdmin();
    let params = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoidentityserviceprovider.adminDeleteUser(params, (err, res) =>
      {
        if(res)
        {
          resolve(res);
        }
        else
        {
          console.error('CognitoService : adminDeleteUser -> adminDeleteUser', err);
          reject(err);
        }
      });
    }));
  }

  public adminResetUserPassword(username : string) : Observable<any>
  {
    this.setAdmin();
    var params = {
      UserPoolId : this.poolData.UserPoolId,
      Username   : username
    };

    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoidentityserviceprovider.adminResetUserPassword(params, (err, res) =>
      {
        if(res)
        {
          resolve(res);
        }
        else
        {
          console.error('CognitoService : adminResetUserPassword -> adminResetUserPassword', err);
          reject(err);
        }
      });
    }));
  }

  public adminUpdateUserAttributes(username : string, userAttributes : AWS.CognitoIdentityServiceProvider.Types.AttributeListType) : Observable<any>
  {
    this.setAdmin();
    var params = {
      UserPoolId     : this.poolData.UserPoolId,
      Username       : username,
      UserAttributes : userAttributes
    };

    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    return Observable.fromPromise(new Promise((resolve, reject) =>
    {
      cognitoidentityserviceprovider.adminUpdateUserAttributes(params, (err, res) =>
      {
        if(res)
        {
          resolve(res);
        }
        else
        {
          console.error('CognitoService : adminUpdateUserAttributes -> adminUpdateUserAttributes', err);
          reject(err);
        }
      });
    }));
  }

  public resetExpiredAccount(usernameKey : string, username : string) : void
  {
    let attributes : any = [];
    attributes.push({Name: usernameKey, Value : username});
    this.adminUpdateUserAttributes(username, attributes);
  }

  public setAdmin() : void
  {
    let creds = new AWS.Credentials(this.adminAccessKeyId, this.adminSecretKeyId);
    AWS.config.region = this.region;
    AWS.config.credentials = creds;
  }

  // -------------------------------------------------------------------------------------------
  // TODO: Helpers -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // public getProvider() : void
  // {
  //   //
  // }

  // public getCredentials() : void
  // {
  //   //
  // }
}
