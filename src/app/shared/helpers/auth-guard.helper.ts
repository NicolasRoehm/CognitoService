// Angular modules
import { Injectable }    from '@angular/core';
import { Router }        from '@angular/router';
import { Route }         from '@angular/router';
import { CanLoad }       from '@angular/router';

// Helpers
import { CognitoHelper } from '../../shared/helpers/cognito.helper';

@Injectable()
export class AuthGuardHelper implements CanLoad
{
  constructor(private router : Router, private cognitoHelper : CognitoHelper) { }

  public canLoad(route : Route) : boolean
  {
    return this.isAuthenticated();
  }

  private isAuthenticated() : boolean
  {
    let isAuthenticated : boolean = false;
    isAuthenticated = this.cognitoHelper.cognitoService.isAuthenticated();

    if (!isAuthenticated)
      this.router.navigate(['/login']);

    return isAuthenticated;
  }
}