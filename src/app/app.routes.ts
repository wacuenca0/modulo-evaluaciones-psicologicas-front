import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard, RoleMatchGuard } from './guards/role.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
      path: 'dashboard',
      canActivate: [AuthGuard],
      loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
  {
    path: 'login',
    canMatch: [GuestGuard],
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'users',
    canActivate: [AuthGuard, RoleGuard],
    canMatch: [AuthGuard, RoleMatchGuard],
    data: { roles: ['ROLE_ADMINISTRADOR'] },
    children: [
      { path: '', loadComponent: () => import('./users/user-list/user-list.component').then(m => m.UserListComponent) },
      { path: 'new', loadComponent: () => import('./users/register/register.component').then(m => m.RegisterComponent) },
      {
        path: 'password-requests',
        loadComponent: () => import('./users/password-requests/password-requests.component').then(m => m.PasswordRequestsComponent)
      },
      { path: ':id/edit', loadComponent: () => import('./users/user-form/user-form.component').then(m => m.UserFormComponent) },
      { path: ':id/edit-user', loadComponent: () => import('./users/edit-user/edit-user.component').then(m => m.EditUserComponent) },
      { path: ':id/change-password', loadComponent: () => import('./users/change-password/change-password.component').then(m => m.ChangePasswordComponent) }
    ]
  },
  {
    path: 'psicologo',
    canActivate: [AuthGuard, RoleGuard],
    canMatch: [AuthGuard, RoleMatchGuard],
    data: { roles: ['ROLE_PSICOLOGO'] },
    children: [
      { path: '', redirectTo: 'personal', pathMatch: 'full' },
      { path: 'personal', loadComponent: () => import('./psicologo/personal-search/personal-search.component').then(m => m.PersonalSearchComponent) },
      { path: 'personal/nuevo', loadComponent: () => import('./psicologo/personal-detail/personal-detail.component').then(m => m.PersonalDetailComponent) },
      { path: 'personal/:personalId', loadComponent: () => import('./psicologo/personal-detail/personal-detail.component').then(m => m.PersonalDetailComponent) },
      { path: 'personal/:personalId/historial', loadComponent: () => import('./psicologo/personal-historial/personal-historial.component').then(m => m.PersonalHistorialComponent) },
      { path: 'valoracion/nueva/:personalId', loadComponent: () => import('./psicologo/ficha-form/ficha-psicologica-form.component').then(m => m.FichaPsicologicaFormComponent) },
      { path: 'valoracion/:fichaId/condicion-final', loadComponent: () => import('./psicologo/ficha-condicion/ficha-condicion-final.component').then(m => m.FichaCondicionFinalComponent) },
      { path: 'atenciones', loadComponent: () => import('./psicologo/atenciones/atenciones.component').then(m => m.AtencionesComponent) },
      { path: 'atenciones/detalle/:id', loadComponent: () => import('./psicologo/atenciones/detalle/atencion-detalle.component').then(m => m.AtencionDetalleComponent) },
      { path: 'atenciones/programar', loadComponent: () => import('./psicologo/atenciones/programar/programar-atencion.component').then(m => m.ProgramarAtencionComponent) }
    ]
  },
  { path: 'psicologo/edit/:id', canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_ADMINISTRADOR'] }, loadComponent: () => import('./psicologo/psicologo-edit-page.component').then(m => m.PsicologoEditPageComponent) },
  {
    path: 'reportes',
    canActivate: [AuthGuard, RoleGuard],
    canMatch: [AuthGuard, RoleMatchGuard],
    data: { roles: ['ROLE_ADMINISTRADOR', 'ROLE_PSICOLOGO', 'ROLE_OBSERVADOR'] },
    loadComponent: () => import('./reports/reports-shell.component').then(m => m.ReportsShellComponent),
    children: [
      { path: '', redirectTo: 'atenciones-psicologos', pathMatch: 'full' },
      { path: 'atenciones-psicologos', loadComponent: () => import('./reports/atenciones-psicologos/atenciones-psicologos-report.component').then(m => m.AtencionesPsicologosReportComponent) },
      { path: 'personal-diagnosticos', loadComponent: () => import('./reports/personal-diagnosticos/personal-diagnosticos-report.component').then(m => m.PersonalDiagnosticosReportComponent) },
      { path: 'historial-fichas', loadComponent: () => import('./reports/historial-fichas/historial-fichas-report.component').then(m => m.HistorialFichasReportComponent) },
      { path: 'condicion-seguimiento', loadComponent: () => import('./reports/condicion-seguimiento/condicion-seguimiento-report.component').then(m => m.CondicionSeguimientoReportComponent) }
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    canMatch: [AuthGuard, RoleMatchGuard],
    data: { roles: ['ROLE_ADMINISTRADOR'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: '**', redirectTo: 'dashboard' }
];
