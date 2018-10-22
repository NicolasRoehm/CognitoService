// Angular modules
import { NgModule }           from '@angular/core';
import { CommonModule }       from '@angular/common';

// External modules
// import { LoginFormModule }    from '@caliatys/login-form';

// Internal modules
import { LoginRoutingModule } from './login-routing.module';
import { SharedModule }       from '../shared/shared.module';

// Components
import { LoginComponent }     from './login.component';

@NgModule({
  imports         :
  [
    CommonModule,
    LoginRoutingModule,
    SharedModule,
    // LoginFormModule // TODO: Include it here or into SharedModule
  ],
  declarations    :
  [
    LoginComponent
  ]
})
export class LoginModule { }
