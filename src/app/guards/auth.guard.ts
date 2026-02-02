import { inject, Injectable } from '@angular/core';
import { CanActivate, CanMatch, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanMatch {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  canActivate(): boolean | UrlTree {
    return this.ensureAuthenticated();
  }

  canMatch(_route: Route, _segments: UrlSegment[]): boolean | UrlTree {
    return this.ensureAuthenticated();
  }

  private ensureAuthenticated(): boolean | UrlTree {
    if (this.auth.isAuthenticated()) return true;
    this.auth.clearAllTokens();
    return this.router.createUrlTree(['/login']);
  }
}
