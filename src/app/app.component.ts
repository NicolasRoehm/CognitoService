// Angular modules
import { Component }                from '@angular/core';
import { OnInit }                   from '@angular/core';
import { OnDestroy }                from '@angular/core';
import { Router }                   from '@angular/router';

// External modules
import { Subscription }             from 'rxjs';
import { TranslateService }         from '@ngx-translate/core';
import { Idle }                     from '@ng-idle/core';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive }                from '@ng-idle/keepalive';

// Helpers
import { CognitoHelper }            from './shared/helpers/cognito.helper';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy
{
  public  isAuthenticated : boolean = false;

  // Session with : @ng-idle/core - @ng-idle/keepalive - @caliatys/cognito-service
  public  idleState : string  = 'Not started.';
  public  timedOut  : boolean = null;
  public  lastPing ?: Date    = null;

  // Subscriptions
  private signInSub        : Subscription;
  private signOutSub       : Subscription;

  constructor
  (
    private cognitoHelper    : CognitoHelper,
    private router           : Router,
    private translateService : TranslateService,
    private idle             : Idle,
    private keepalive        : Keepalive
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

    this.setIdle();

    this.signInSub  = this.signInSubscription();
    this.signOutSub = this.signOutSubscription();
  }

  public ngOnDestroy() : void
  {
    this.signInSub.unsubscribe();
    this.signOutSub.unsubscribe();
  }

  // -------------------------------------------------------------------------------------------
  // NOTE: Session management ------------------------------------------------------------------
  // -------------------------------------------------------------------------------------------

  private setIdle() : void
  {
    this.timedOut = false;

    this.idle.setIdle(5); // Sets an idle timeout of 5 seconds
    this.idle.setTimeout(this.cognitoHelper.cognitoConst.sessionTime); // After X seconds (+ 5 idle seconds) of inactivity, the user will be considered timed out

    this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES); // Sets the default interrupts, in this case, things like clicks, scrolls, touches to the document

    this.idle.onIdleEnd.subscribe(() => this.idleState = 'No longer idle.');

    this.idle.onIdleStart.subscribe(() => this.idleState = 'You\'ve gone idle!');
    this.idle.onTimeoutWarning.subscribe((countdown) => this.idleState = 'You will time out in ' + countdown + ' seconds!');

    this.keepalive.interval(5); // Sets the ping interval to 5 seconds

    this.keepalive.onPing.subscribe(() =>
    {
      this.cognitoHelper.cognitoService.updateSessionTime();
      this.lastPing = new Date();
    });

    this.idle.onTimeout.subscribe(() =>
    {
      this.idleState = 'Timed out!';
      this.timedOut  = true;
      if(this.cognitoHelper.cognitoService.isAuthenticated())
        this.cognitoHelper.cognitoService.signOut();
      this.resetIdle();
    });

    this.resetIdle();
  }

  private resetIdle() : void
  {
    this.idle.watch();
    this.idleState = 'Started.';
    this.timedOut  = false;
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
      this.router.navigate([ '/login' ]);
    });
    return signOutSub;
  }

}
