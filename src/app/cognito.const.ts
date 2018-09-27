export const CognitoConst = {
  googleId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
  poolData : {
    UserPoolId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPool
    ClientId   : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoUserPoolClient
    Paranoia   : 7 // an integer between 1 - 10
  },
  // identityPool : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoIdentityPool
  // Admin (optional)
  region           : 'eu-west-1', // Region matching CognitoUserPool region
  adminAccessKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  adminSecretKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
