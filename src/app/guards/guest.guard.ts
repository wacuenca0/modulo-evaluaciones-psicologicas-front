import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const GuestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const fallback = auth.hasRole('ROLE_PSICOLOGO')
    ? '/psicologo/personal'
    : auth.hasRole('ROLE_ADMINISTRADOR')
      ? '/admin/catalogos'
      : '/login';

  return router.parseUrl(fallback);
};
