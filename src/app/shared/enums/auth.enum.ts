export enum AuthError
{
  // Amazon
  VERIF_CODE            = 'CodeMismatchException',
  VERIF_USER            = 'UsernameExistsException',
  VERIF_PWD             = 'InvalidPasswordException',
  FORGOT_PWD_VERIF_USER = 'UserNotFoundException',
  FORGOT_PWD_VERIF_INIT = 'InvalidParameterException',
  VERIF_LIMIT           = 'LimitExceededException',
  VERIF_AUTHORIZATION   = 'NotAuthorizedException',
}
