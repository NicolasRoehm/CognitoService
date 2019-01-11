export const CognitoConst = {
  storagePrefix    : 'AngularApp',
  googleId         : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
  googleScope      : '',
  poolData         : {
    UserPoolId     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPool
    ClientId       : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPoolClient
    Paranoia       : 7 // An integer between 1 - 10
  },
  identityPool     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoIdentityPool
  region           : 'eu-west-1', // Region matching CognitoUserPool region
  // Admin (optional)
  adminAccessKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  adminSecretKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
