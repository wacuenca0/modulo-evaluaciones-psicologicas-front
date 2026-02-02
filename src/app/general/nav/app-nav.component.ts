import { ChangeDetectionStrategy, Component, inject, computed, signal, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// ...existing code...
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PsicologoNombreService } from '../../services/psicologo-nombre.service';

interface NavLink {
  label: string;
  route: string;
  icon: string;
  role: string[];
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoggedIn()) {
      <nav class="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <!-- Logo y nombre -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <div class="rounded-lg bg-blue-600 p-2">
                  <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">El Sistema de Gestión Psicológica Militar</p>
                  <p class="text-sm font-bold text-slate-900">SIGEPM</p>
                </div>
              </div>
            </div>

            <!-- Navegación -->
            <div class="hidden md:flex items-center gap-1">
              @for (link of filteredLinks(); track link.route) {
                <a
                  [routerLink]="link.route"
                  routerLinkActive="bg-blue-50 text-blue-700 border-blue-300"
                  [routerLinkActiveOptions]="{ exact: false }"
                  class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 
                         border border-transparent transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="link.icon"/>
                  </svg>
                  {{ link.label }}
                </a>
              }
            </div>

            <!-- Usuario y logout -->
            <div class="flex items-center gap-4">
              <div class="hidden md:flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
                <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                <div class="text-sm">
                  <p class="font-medium text-slate-900">{{ psicologoNombre() || 'Usuario' }}</p>
                  <p class="text-xs text-slate-500">{{ userRole() }}</p>
                </div>
              </div>
              
              <button (click)="logout()" 
                      class="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold 
                             text-red-700 transition-all hover:bg-red-50 hover:border-red-400 active:scale-[0.98]">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span class="hidden md:inline">Cerrar sesión</span>
              </button>
            </div>

            <!-- Menú móvil -->
            <button (click)="toggleMobileMenu()" class="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <!-- Menú móvil desplegable -->
          @if (mobileMenuOpen()) {
            <div class="border-t border-slate-200 py-4 md:hidden">
              <div class="space-y-2">
                @for (link of filteredLinks(); track link.route) {
                  <a
                    [routerLink]="link.route"
                    routerLinkActive="bg-blue-50 text-blue-700"
                    [routerLinkActiveOptions]="{ exact: false }"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="link.icon"/>
                    </svg>
                    {{ link.label }}
                  </a>
                }
                
                <div class="mt-4 border-t border-slate-200 pt-4">
                  <div class="flex items-center gap-3 px-4 py-2">
                    <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ psicologoNombre() || 'Usuario' }}</p>
                      <p class="text-xs text-slate-500">{{ userRole() }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </nav>
    }
  `
})
export class AppNavComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mobileMenuOpen = signal(false);
  
  readonly isLoggedIn = this.auth.isAuthenticated;
  readonly currentUser = this.auth.currentUser;
  readonly userId = computed(() => this.currentUser()?.id ?? null);
  readonly psicologoNombre = signal<string>('');
  readonly username = computed(() => this.currentUser()?.username || 'Usuario'); // mantener para fallback

  private readonly psicologoNombreService = inject(PsicologoNombreService);

  constructor() {
    effect(() => {
      const id = this.userId();
      const roles = this.currentUser()?.roles || [];
      if (id && roles.includes('ROLE_PSICOLOGO')) {
        this.psicologoNombreService.obtenerNombrePorUserId(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: nombre => this.psicologoNombre.set(nombre),
            error: () => this.psicologoNombre.set('No registrado')
          });
      } else if (id) {
        // Para admin u observador, mostrar el username
        this.psicologoNombre.set(this.currentUser()?.username || 'Usuario');
      } else {
        this.psicologoNombre.set('No registrado');
      }
    });
  }
  readonly userRole = computed(() => {
    const roles = this.currentUser()?.roles || [];
    if (roles.includes('ROLE_ADMINISTRADOR')) return 'Administrador';
    if (roles.includes('ROLE_PSICOLOGO')) return 'Psicólogo';
    if (roles.includes('ROLE_OBSERVADOR')) return 'Observador';
    return 'Usuario';
  });

  // Todos los links disponibles con sus iconos y roles
  private readonly allLinks: NavLink[] = [
    { label: 'Inicio', route: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', role: ['ROLE_ADMINISTRADOR', 'ROLE_PSICOLOGO', 'ROLE_OBSERVADOR'] },
    { label: 'Catalogos', route: '/admin/catalogos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', role: ['ROLE_ADMINISTRADOR'] },
    { label: 'Usuarios', route: '/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0h-15', role: ['ROLE_ADMINISTRADOR'] },
    { label: 'Buscar Personal', route: '/psicologo/personal', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', role: ['ROLE_PSICOLOGO'] },
    { label: 'Evaluaciones', route: '/psicologo/fichas', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', role: ['ROLE_PSICOLOGO'] },
    { label: 'Atenciones', route: '/psicologo/atenciones', icon: 'M12 4v16m8-8H4', role: ['ROLE_PSICOLOGO'] },
    { label: 'Reportes', route: '/reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', role: ['ROLE_OBSERVADOR'] },
  ];

  // Filtrar links según el rol del usuario
  readonly filteredLinks = computed(() => {
    const userRoles = this.currentUser()?.roles || [];
    // Log para depuración de roles
    console.log('[AppNav] Roles usuario:', userRoles);
    return this.allLinks.filter(link => {
      // Si el link es de reportes, mostrar solo si el usuario tiene ROLE_OBSERVADOR
      if (link.route === '/reportes') {
        return userRoles.includes('ROLE_OBSERVADOR');
      }
      // Para los demás links, mantener la lógica original
      return link.role.some(role => userRoles.includes(role));
    });
  });

  toggleMobileMenu() {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  logout() {
    this.closeMobileMenu();
    this.auth.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']).catch(() => {});
      },
      error: () => {
        this.auth.clearAllTokens();
        this.router.navigate(['/login']).catch(() => {});
      }
    });
  }
}