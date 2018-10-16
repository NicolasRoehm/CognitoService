// Angular modules
import { NgModule }            from '@angular/core';

// Internal modules
import { SharedModule }        from '../shared';

// Components
import { StaticRoutingModule } from './static-routing.module';
import { NotFoundComponent }   from './not-found/not-found.component';

@NgModule({
  imports         :
  [
    SharedModule,
    StaticRoutingModule
  ],
  declarations    :
  [
    NotFoundComponent
  ],
  exports         :
  [

  ],
  entryComponents :
  [

  ]
})
export class StaticModule {}
