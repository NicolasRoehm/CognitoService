export const CognitoConst = {
  storagePrefix    : 'AngularApp',
  sessionTime      : 10000, // 58 min = 3500000 | 45 min = 2700000 | 15 min = 900000 | 30 sec = 30000
  googleId         : '674613532174-0lt4dn81oem535ohiqfiu0sc5mov62ae.apps.googleusercontent.com',
  googleScope      : '',
  poolData         : {
    UserPoolId     : 'eu-west-1_BDuKCcDjO', // CognitoUserPool
    ClientId       : '2drdu7lhjcus27ls13n7t5j6qt', // CognitoUserPoolClient
    Paranoia       : 7 // An integer between 1 - 10
  },
  // identityPool     : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', // CognitoIdentityPool
  // Admin (optional)
  region           : 'eu-west-1', // Region matching CognitoUserPool region
  adminAccessKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  adminSecretKeyId : 'XXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
