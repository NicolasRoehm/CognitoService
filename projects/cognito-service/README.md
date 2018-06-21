# Cognito Service
> Angular service providing authentication using Amazon Cognito.

## Installation
```sh
npm install @caliatys/cognito-service --save
```

Copy/paste [src/app/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/cognito.const.ts) and replace the parameters with your resource identifiers.

Import `CognitoService` and `CognitoConst` inside a component :
```typescript
import { CognitoService } from '@caliatys/cognito-service';
import { CognitoConst }   from './cognito.const';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent
{
  public cognitoService : CognitoService;

  constructor()
  {
    this.cognitoService = new CognitoService(CognitoConst);
  }
}
```

Now you can use this service with your own components or with our [generic authentication component](https://github.com/Caliatys/LoginComponent/).

**Note**: This project already implements our [@caliatys/login-form](https://github.com/Caliatys/LoginComponent/) component for demo and tests.

## Demo

```sh
git clone https://github.com/Caliatys/CognitoService
cd CognitoService/
npm install
```

Don't forget to edit the parameters located in [src/app/cognito.const.ts](https://github.com/Caliatys/CognitoService/blob/master/src/app/cognito.const.ts).

```sh
ng build cognito-service --prod
ng serve
```

**Important Note**: This project uses the following dependencies :
```json
"@angular/common": "^6.0.0-rc.0 || ^6.0.0",
"@angular/core": "^6.0.0-rc.0 || ^6.0.0",
"@angular/http": "^6.0.3",
"rxjs": "^6.0.0",
"rxjs-compat": "^6.0.0",
"amazon-cognito-identity-js": "2.0.6",
"amazon-cognito-js": "1.1.0",
"aws-api-gateway-client": "0.2.12",
"aws-sdk": "2.247.1",
"@types/gapi": "0.0.35",
"@types/gapi.auth2": "0.0.47"
```

## Roadmap

### In Progress
- MFA

### Planning
- Facebook
- Google

### Contributions

Contributions are welcome, please open an issue and preferably submit a pull request.

## Development

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.0.5.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Library Build / NPM Package

Run `npm run package` to build the library and generate an [NPM](https://www.npmjs.com) package.
The build artifacts will be stored in the `dist/lib` folder.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).