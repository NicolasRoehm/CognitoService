// Angular modules
import { NgModule }                 from '@angular/core';
import { HttpModule }               from '@angular/http';
import { HttpClient }               from '@angular/common/http';
import { HttpClientModule }         from '@angular/common/http';
import { BrowserAnimationsModule }  from '@angular/platform-browser/animations';
import { BrowserModule }            from '@angular/platform-browser';

// External modules
import { LoginFormModule }          from '@caliatys/login-form';
import { TranslateModule }          from '@ngx-translate/core';
import { TranslateLoader }          from '@ngx-translate/core';
import { TranslateHttpLoader }      from '@ngx-translate/http-loader';
import { NgIdleKeepaliveModule }    from '@ng-idle/keepalive';
import { MomentModule }             from 'angular2-moment';

// Material modules
// import { MatProgressSpinnerModule } from '@angular/material';
// import { MatTableModule }           from '@angular/material';
// import { MatSortModule }            from '@angular/material';
import { MatButtonModule }          from '@angular/material';
// import { MatChipsModule }           from '@angular/material';
// import { MatCheckboxModule }        from '@angular/material';
// import { MatRadioModule }           from '@angular/material';
// import { MatSelectModule }          from '@angular/material';
// import { MatSlideToggleModule }     from '@angular/material';
// import { MatMenuModule }            from '@angular/material';
// import { MatSidenavModule }         from '@angular/material';
// import { MatToolbarModule }         from '@angular/material';
// import { MatGridListModule }        from '@angular/material';
// import { MatTooltipModule }         from '@angular/material';
// import { MatCardModule }            from '@angular/material';
// import { MatIconModule }            from '@angular/material';
// import { MatProgressBarModule }     from '@angular/material';
// import { MatListModule }            from '@angular/material';
// import { MatInputModule }           from '@angular/material';
// import { MatDatepickerModule }      from '@angular/material';
// import { MatNativeDateModule }      from '@angular/material';
// import { MatTabsModule }            from '@angular/material';
// import { MatAutocompleteModule }    from '@angular/material';
// import { MatStepperModule }         from '@angular/material';
// import { MatPaginatorModule }       from '@angular/material';
// import { MatDialogModule }          from '@angular/material';
import { MatSnackBarModule }        from '@angular/material';
// import { MatExpansionModule }       from '@angular/material';

// Services
import { CognitoService }           from 'cognito-service';

// Components
import { AppComponent }             from './app.component';

// NgModule that includes all Material modules that are required to serve the app.
@NgModule({
  exports: [
    // Material modules
    // MatTableModule,
    MatButtonModule,
    // MatChipsModule,
    // MatCheckboxModule,
    // MatInputModule,
    // MatRadioModule,
    // MatSelectModule,
    // MatSlideToggleModule,
    // MatMenuModule,
    // MatSidenavModule,
    // MatToolbarModule,
    // MatListModule,
    // MatGridListModule,
    // MatCardModule,
    // MatIconModule,
    // MatProgressBarModule,
    // MatDialogModule,
    MatSnackBarModule,
    // MatDatepickerModule,
    // MatNativeDateModule,
    // MatProgressSpinnerModule,
    // MatDatepickerModule,
    // MatTabsModule,
    // MatAutocompleteModule,
    // MatExpansionModule,
    // MatTooltipModule,
  ]
})
export class MaterialModule {}

@NgModule({
  imports: [
    // Angular modules
    HttpModule,
    HttpClientModule,
    BrowserAnimationsModule,
    BrowserModule,

    // Material modules
    MaterialModule,

    // TODO: Modules to import into your project
    LoginFormModule,
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
  ],
  declarations: [ AppComponent ],
  providers: [ CognitoService ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }

export function createTranslateLoader(http : HttpClient) {
  return new TranslateHttpLoader(http, './../assets/i18n/', '.json');
}
