import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PsicologoNombreService } from '../services/psicologo-nombre.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly _showModal = signal(true);
  readonly showModal = this._showModal.asReadonly();

  readonly user = this.auth.currentUser;
  readonly userId = computed(() => this.user()?.id ?? null);
  readonly psicologoNombre = signal<string>('');

  private readonly psicologoNombreService = inject(PsicologoNombreService);

  constructor() {
    effect(() => {
      const id = this.userId();
      const esPsicologo = this.auth.isPsicologo();

      // Sólo intentamos buscar nombre de psicólogo cuando el usuario tiene ese rol.
      if (!esPsicologo || !id) {
        this.psicologoNombre.set('');
        return;
      }

      this.psicologoNombreService.obtenerNombrePorUserId(id).subscribe({
        next: nombre => this.psicologoNombre.set(nombre),
        error: () => this.psicologoNombre.set('No registrado')
      });
    });
  }
  readonly rol = computed(() => {
    const roles = this.user()?.roles || [];
    if (roles.includes('ROLE_ADMINISTRADOR')) return 'administrador';
    if (roles.includes('ROLE_PSICOLOGO')) return 'psicologo';
    if (roles.includes('ROLE_OBSERVADOR')) return 'observador';
    return 'usuario';
  });

  readonly displayName = computed(() => {
    const user = this.user();
    if (!user) return '';
    const rol = this.rol();

    if (rol === 'psicologo') {
      const nombrePsicologo = this.psicologoNombre();
      if (nombrePsicologo && nombrePsicologo !== 'No registrado') {
        return nombrePsicologo;
      }
      return user.fullName || user.username || '';
    }

    return user.fullName || user.username || '';
  });

  mensajeLogout: string | null = null;

  aceptarTerminos() {
    this._showModal.set(false);
    // Aquí podrías guardar en localStorage/cookie que aceptó los términos
    // y redirigir si es necesario
    // this.router.navigate(['/dashboard']);
  }

  logout() {
    this.mensajeLogout = null;
    this.auth.logout().subscribe({
      complete: () => {
        this.mensajeLogout = 'Sesión cerrada correctamente.';
        setTimeout(() => globalThis.location.href = '/login', 1200);
      },
      error: () => {
        this.mensajeLogout = 'Error al cerrar sesión. Intenta nuevamente.';
        setTimeout(() => globalThis.location.href = '/login', 2000);
      }
    });
  }


  goToPsicologo() {
    this.router.navigate(['/psicologo/personal']);
  }

  goToAtenciones() {
    this.router.navigate(['/psicologo/atenciones']);
  }

  goToAdmin() {
    this.router.navigate(['/users']);
  }

  goToObservador() {
    this.router.navigate(['/reports']);
  }
}
