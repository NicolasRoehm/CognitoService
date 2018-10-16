// Angular modules
import { NgModule }                from '@angular/core';
import { HttpModule }              from '@angular/http';
import { HttpClient }              from '@angular/common/http';
import { HttpClientModule }        from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule }           from '@angular/platform-browser';

// External modules
import { TranslateModule }         from '@ngx-translate/core';
import { TranslateLoader }         from '@ngx-translate/core';
import { TranslateHttpLoader }     from '@ngx-translate/http-loader';
import { NgIdleKeepaliveModule }   from '@ng-idle/keepalive';
import { MomentModule }            from 'angular2-moment';

// Helpers
import { CognitoHelper }           from './shared/helpers/cognito.helper';

// Internal modules
import { SharedModule }            from './shared';
import { StaticModule }            from './static';
import { AppRoutingModule }        from './app-routing.module';

// Services
import { CognitoService }          from 'cognito-service'; // NOTE: Do not import the service into your project

// Components
import { AppComponent }            from './app.component';

@NgModule({
  imports: [
    // Angular modules
    HttpModule,
    HttpClientModule,
    BrowserAnimationsModule,
    BrowserModule,

    // TODO: Modules to import into your project
    NgIdleKeepaliveModule.forRoot(),
    MomentModule,

    // External modules
    TranslateModule.forRoot({
      loader :
      {
        provide    : TranslateLoader,
        useFactory : (createTranslateLoader),
        deps       : [HttpClient]
      }
    }),

    // Internal modules
    StaticModule,
    SharedModule,
    AppRoutingModule
  ],
  declarations :
  [
    AppComponent
  ],
  providers    :
  [
    CognitoService, // NOTE: Do not import the service into your project
    CognitoHelper   // TODO: Helper to import into your project
  ],
  bootstrap    :
  [
    AppComponent
  ]
})
export class AppModule { }

export function createTranslateLoader(http : HttpClient) {
  return new TranslateHttpLoader(http, './../assets/i18n/', '.json');
}
