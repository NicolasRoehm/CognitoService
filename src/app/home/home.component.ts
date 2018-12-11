// Angular modules
import { Component }         from '@angular/core';
import { Router }            from '@angular/router';
import { HttpParams }        from '@angular/common/http';
import { HttpHeaders }       from '@angular/common/http';
import { HttpClient }        from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

// External modules
import { Observable }        from 'rxjs';
import { from }              from 'rxjs';

// Helpers
import { CognitoHelper }      from '../shared/helpers/cognito.helper';

@Component({
  moduleId    : module.id,
  templateUrl : 'home.component.html',
  styleUrls   : ['home.component.scss']
})
export class HomeComponent
{

  // NOTE: Authenticated request
  private apiURL : string = 'YOUR_API_URL';

  constructor
  (
    public  router        : Router,
    private http          : HttpClient,
    private cognitoHelper : CognitoHelper,
  )
  {
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Actions -----------------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  // NOTE: Logout ------------------------------------------------------------------------------

  public logout() : void
  {
    this.cognitoHelper.cognitoService.signOut();
    this.router.navigate([ '/login' ]);
  }

  // Do not add these two following functions inside your project !
  // You can use them to test the cognito service if you are logged in.

  // NOTE: Misc --------------------------------------------------------------------------------

  public sts() : void
  {
    this.cognitoHelper.cognitoService.sts().then(res =>
    {
      console.log(res);
    }).catch(err => {
      console.error(err);
    });
  }

  public getCredentials() : void
  {
    this.cognitoHelper.cognitoService.getCredentials().then(res =>
    {
      console.log(res);
    }).catch(err => {
      console.error(err);
    });
  }

  // NOTE: Refresh session ---------------------------------------------------------------------

  public refresh() : void
  {
    this.cognitoHelper.cognitoService.refreshSession().then(res => {
      console.log(res);
      console.log(new Date(res.data.expires_at));
    }).catch(err => {
      console.log(err);
    });
  }

  // NOTE: Api gateway request -----------------------------------------------------------------

  public request() : Observable<any>
  {
    let token = this.cognitoHelper.cognitoService.getIdToken();
    let params  : HttpParams  = null;
    let headers : HttpHeaders = null;
    let options : any         = {};
    params  = new HttpParams();
    headers = new HttpHeaders({
      'Content-Type'  : 'application/json',
      'Authorization' : token
    });
    options.headers = headers;
    options.params  = params;

    return from(new Promise((resolve, reject) =>
    {
      this.http.get(this.apiURL, options).subscribe((res : ArrayBuffer) => {
        console.log(res);
        return resolve(res);
      }, (err : HttpErrorResponse) => {
        console.error('HomeComponent : request', err);
        return reject(err);
      });
    }));
  }

}
