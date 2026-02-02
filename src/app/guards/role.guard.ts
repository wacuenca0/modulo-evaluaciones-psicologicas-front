import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, Router, UrlSegment, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return evaluateRoles(route.data?.['roles'], auth, router);
};

export const RoleMatchGuard: CanMatchFn = (route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return evaluateRoles(route.data?.['roles'], auth, router);
};

function evaluateRoles(roles: unknown, auth: AuthService, router: Router): boolean | UrlTree {
  const allowed = Array.isArray(roles) ? roles as string[] : [];
  if (!allowed.length) {
    return true;
  }
  if (auth.hasAnyRole(allowed)) {
    return true;
  }
  const fallback = auth.hasRole('ROLE_PSICOLOGO')
    ? '/psicologo/personal'
    : auth.hasRole('ROLE_ADMINISTRADOR')
      ? '/admin/catalogos'
      : '/login';
  return router.parseUrl(fallback);
}
