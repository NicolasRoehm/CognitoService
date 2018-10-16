// Angular modules
import { Injectable }             from '@angular/core';
import { Router }                 from '@angular/router';
import { Route }                  from '@angular/router';
import { CanLoad }                from '@angular/router';
import { CanActivate }            from '@angular/router';
import { CanActivateChild }       from '@angular/router';
import { RouterStateSnapshot }    from '@angular/router';
import { ActivatedRouteSnapshot } from '@angular/router';

// Helpers
import { CognitoHelper }          from '../../shared/helpers/cognito.helper';

@Injectable()
export class AuthGuardHelper implements CanActivate, CanActivateChild, CanLoad
{

  constructor
  (
    private router        : Router,
    private cognitoHelper : CognitoHelper,
  )
  {
  }

  public canActivate(route : ActivatedRouteSnapshot, state : RouterStateSnapshot) : boolean
  {
    return this.isAuthenticated();
  }

  public canActivateChild(route : ActivatedRouteSnapshot, state : RouterStateSnapshot) : boolean
  {
    return this.isAuthenticated();
  }

  public canLoad(route : Route) : boolean
  {
    return this.isAuthenticated();
  }

  private isAuthenticated() : boolean
  {
    let isAuthenticated : boolean = false;
    isAuthenticated = this.cognitoHelper.cognitoService.isAuthenticated();

    if(!isAuthenticated)
      this.router.navigate(['/login']);

    return isAuthenticated;
  }

}
