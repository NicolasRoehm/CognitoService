// Angular modules
import { NgModule }          from '@angular/core';
import { CommonModule }      from '@angular/common';

// Internal modules
import { HomeRoutingModule } from './home-routing.module';
import { SharedModule }      from '../shared/shared.module';

// Components
import { HomeComponent }     from './home.component';

@NgModule({
  imports         :
  [
    CommonModule,
    HomeRoutingModule,
    SharedModule
  ],
  declarations    :
  [
    HomeComponent
  ],
  entryComponents :
  [

  ],
  exports         :
  [
    HomeComponent
  ]
})
export class HomeModule { }
