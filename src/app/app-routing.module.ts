// Angular modules
import { NgModule }          from '@angular/core';
import { RouterModule }      from '@angular/router';
import { Routes }            from '@angular/router';

// Components
import { NotFoundComponent } from './static/not-found/not-found.component';

// Helpers
import { AuthGuardHelper }   from './shared/helpers/auth-guard.helper';

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
  imports   : [ RouterModule.forRoot(routes) ],
  exports   : [ RouterModule ],
  providers : [ AuthGuardHelper ]
})
export class AppRoutingModule { }
