// Angular modules
import { NgModule }                 from '@angular/core';
import { RouterModule }             from '@angular/router';
import { Routes }                   from '@angular/router';

// Components
import { NotFoundComponent }        from './static/not-found/not-found.component';

// Helpers
import { AuthGuardDeactivate }      from './shared/helpers/auth-guard-deactivate.helper';
import { AuthGuardHelper }          from './shared/helpers/auth-guard.helper';
import { PreloadingStrategyHelper } from './shared/helpers/preloading-strategy.helper';

const routes : Routes = [
  {
    path         : 'login',
    loadChildren : './login/login.module#LoginModule',
  },
  {
    path         : 'home',
    loadChildren : './home/home.module#HomeModule',
    canLoad      : [ AuthGuardHelper ]
  },
  { path : '',   redirectTo : '/login', pathMatch : 'full' },
  { path : '**', component  : NotFoundComponent }
];

@NgModule({
  imports   :
  [
    RouterModule.forRoot(routes,
    {
      preloadingStrategy : PreloadingStrategyHelper
    })
  ],
  exports   :
  [
    RouterModule
  ],
  providers :
  [
    AuthGuardDeactivate,
    PreloadingStrategyHelper,
    AuthGuardHelper
  ]
})
export class AppRoutingModule { }
