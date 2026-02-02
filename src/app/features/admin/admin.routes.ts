import { Routes } from '@angular/router';
import { RoleGuard } from '../../guards/role.guard';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'catalogos', pathMatch: 'full' },
  {
    path: 'catalogos',
    canActivate: [RoleGuard],
    data: { roles: ['ROLE_ADMINISTRADOR'] },
    loadComponent: () => import('./catalogos/catalogos-admin.component').then(m => m.CatalogosAdminComponent)
  }
];
