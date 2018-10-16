// Angular modules
import { Injectable }         from '@angular/core';
import { PreloadingStrategy } from '@angular/router';
import { Route }              from '@angular/router';

// External modules
import { Observable }         from 'rxjs';
import { of }                 from 'rxjs';

@Injectable()
export class PreloadingStrategyHelper implements PreloadingStrategy
{
  preloadedModules : string[] = [];

  preload(route : Route, load : () => Observable<any>) : Observable<any>
  {
    if (route.data && route.data['preload'])
    {
      // add the route path to our preloaded module array
      this.preloadedModules.push(route.path);

      // log the route path to the console
      console.log('Preloaded : ' + route.path);

      return load();
    }

    return of(null);
  }
}
