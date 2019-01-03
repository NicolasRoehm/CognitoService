export enum RespType
{
  ON_SUCCESS                       = 'onSuccess',
  ON_FAILURE                       = 'onFailure',
  ON_ERROR                         = 'onError',
  ON_TIMEOUT                       = 'onTimeout',
  ON_REJECTED                      = 'onRejected',
  NEW_PASSWORD_REQUIRED            = 'newPasswordRequired',
  INPUT_VERIFICATION_CODE          = 'inputVerificationCode',
  MFA_REQUIRED                     = 'mfaRequired',
  MFA_SETUP_ASSOCIATE_SECRETE_CODE = 'mfaSetup associateSecretCode',
  MFA_SETUP_ON_FAILURE             = 'mfaSetup onFailure',
  EXPIRED_TOKEN                    = 'expiredToken'
}
