// Angular modules
import { Injectable }     from '@angular/core';

// External modules
import { CognitoService } from 'cognito-service'; // TODO: Change the location to '@caliatys/cognito-service'
import { AuthType }       from 'cognito-service';
import { RespType }       from 'cognito-service';

// Consts
import { CognitoConst }   from '../consts/cognito.const';

@Injectable()
export class CognitoHelper
{
  // Services
  public cognitoService : CognitoService = new CognitoService(CognitoConst);

  // Consts
  public cognitoConst                    = CognitoConst;

  // Enums
  public authType                        = AuthType;
  public respType                        = RespType;
}
