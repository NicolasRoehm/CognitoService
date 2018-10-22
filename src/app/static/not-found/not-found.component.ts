// Angular modules
import { Component }     from '@angular/core';

// Helpers
import { CognitoHelper } from '../../shared/helpers/cognito.helper';

@Component({
  selector    : 'app-not-found',
  templateUrl : './not-found.component.html',
  styleUrls   : ['./not-found.component.scss']
})
export class NotFoundComponent
{
  constructor(public cognitoHelper : CognitoHelper) { }
}
