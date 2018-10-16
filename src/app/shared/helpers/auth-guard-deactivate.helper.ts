// Angular modules
import { Injectable }    from '@angular/core';
import { CanDeactivate } from '@angular/router';

// External modules
import { Observable }    from 'rxjs';

export interface CanComponentDeactivate
{
  canDeactivate : () => Observable<boolean> | Promise<boolean> | boolean;
}

@Injectable()
export class AuthGuardDeactivate implements CanDeactivate<CanComponentDeactivate>
{
  canDeactivate(component : CanComponentDeactivate)
  {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
