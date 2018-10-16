// Angular modules
import { NgModule }          from '@angular/core';
import { Routes }            from '@angular/router';
import { RouterModule }      from '@angular/router';

// Components
import { NotFoundComponent } from './not-found/not-found.component';

const routes: Routes = [
  { path : 'not-found', component : NotFoundComponent }
];

@NgModule({
  imports : [ RouterModule.forChild(routes) ],
  exports : [ RouterModule ]
})
export class StaticRoutingModule {}
