// Angular modules
import { NgModule }       from '@angular/core';
import { RouterModule }   from '@angular/router';

// Components
import { LoginComponent } from './login.component';

@NgModule({
  imports :
  [
    RouterModule.forChild([
      { path : '', component : LoginComponent }
    ])
  ],
  exports :
  [
    RouterModule
  ]
})
export class LoginRoutingModule { }
