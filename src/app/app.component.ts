// Angular modules
import { Component }        from '@angular/core';
import { OnInit }           from '@angular/core';
import { OnDestroy }        from '@angular/core';
import { Router }           from '@angular/router';

// External modules
import { Subscription }     from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

// Helpers
import { CognitoHelper }    from './shared/helpers/cognito.helper';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy
{
  public  isAuthenticated : boolean = false;

  // Subscriptions
  private signInSub        : Subscription;
  private signOutSub       : Subscription;

  constructor
  (
    private cognitoHelper    : CognitoHelper,
    private router           : Router,
    private translateService : TranslateService
  )
  {
    // This language will be used as a fallback when a translation isn't found in the current language
    this.translateService.setDefaultLang('en');
    // The lang to use, if the lang isn't available, it will use the current loader to get them
    this.translateService.use('en');
  }

  public ngOnInit() : void
  {
    this.isAuthenticated = this.cognitoHelper.cognitoService.isAuthenticated();
    if (this.isAuthenticated)
    {
      this.cognitoHelper.cognitoService.updateCredentials();
      this.cognitoHelper.cognitoService.autoRefreshSession();
    }

    this.signInSub  = this.signInSubscription();
    this.signOutSub = this.signOutSubscription();
  }

  public ngOnDestroy() : void
  {
    this.signInSub.unsubscribe();
    this.signOutSub.unsubscribe();
  }

  // -------------------------------------------------------------------------------------------
  // ---- NOTE: Subscription -------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private signInSubscription() : Subscription
  {
    let signInSub : Subscription = null;
    signInSub = this.cognitoHelper.cognitoService.onSignIn.subscribe(() =>
    {
      this.isAuthenticated = true;
    });
    return signInSub;
  }

  private signOutSubscription() : Subscription
  {
    let signOutSub : Subscription = null;
    signOutSub = this.cognitoHelper.cognitoService.onSignOut.subscribe(() =>
    {
      this.isAuthenticated = false;
      this.router.navigate(['/login']);
    });
    return signOutSub;
  }

}
