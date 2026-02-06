import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { input, output } from '@angular/core';
import { AuthService } from '../../services/auth.service';

interface CurrentUserWithPsicologo {
  user: {
    id: number | null;
    username: string;
    email?: string | null;
    roleId?: number | null;
    roleName?: string | null;
  } | null;
  psicologo: {
    id: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    apellidosNombres: string;
    username: string;
    email?: string | null;
    telefono?: string | null;
    celular?: string | null;
    grado?: string | null;
    unidadMilitar?: string | null;
    especialidad?: string | null;
    activo?: boolean | null;
  } | null;
}

@Component({
  selector: 'app-user-profile-modal',
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div class="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Cuenta de usuario</p>
              <h2 class="text-lg font-semibold text-slate-900">Perfil e información del psicólogo</h2>
            </div>
            <button type="button" (click)="onClose()" class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="grid gap-6 px-6 py-5 md:grid-cols-2">
            <!-- Col 1: Información -->
            <section class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                  {{ initials() }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ displayName() }}</p>
                  <p class="text-xs text-slate-500">{{ roleLabel() }}</p>
                </div>
              </div>

              @if (perfilLoading()) {
                <div class="space-y-2">
                  <div class="h-3 w-40 animate-pulse rounded-full bg-slate-100"></div>
                  <div class="h-3 w-32 animate-pulse rounded-full bg-slate-100"></div>
                  <div class="h-3 w-48 animate-pulse rounded-full bg-slate-100"></div>
                </div>
              } @else {
                @if (perfilError()) {
                  <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {{ perfilError() }}
                  </div>
                }

                @if (perfil()) {
                  <div class="space-y-3 text-sm text-slate-700">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</p>
                      <p class="mt-0.5">{{ perfil()!.user?.username }}</p>
                      @if (perfil()!.user?.email) {
                        <p class="text-xs text-slate-500">{{ perfil()!.user?.email }}</p>
                      }
                    </div>

                    <div>
                      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</p>
                      <p class="mt-0.5">{{ perfil()!.user?.roleName ?? roleLabel() }}</p>
                    </div>

                    @if (perfil()!.psicologo) {
                      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Datos del psicólogo</p>
                        <p class="text-sm font-medium text-slate-900">
                          {{ perfil()!.psicologo!.apellidosNombres }}
                        </p>
                        <p class="text-xs text-slate-500">
                          Cédula: {{ perfil()!.psicologo!.cedula }}
                        </p>
                        @if (perfil()!.psicologo!.grado || perfil()!.psicologo!.unidadMilitar) {
                          <p class="mt-1 text-xs text-slate-500">
                            {{ perfil()!.psicologo!.grado }}
                            @if (perfil()!.psicologo!.unidadMilitar) {
                              · {{ perfil()!.psicologo!.unidadMilitar }}
                            }
                          </p>
                        }
                        @if (perfil()!.psicologo!.especialidad) {
                          <p class="mt-1 text-xs text-slate-500">Especialidad: {{ perfil()!.psicologo!.especialidad }}</p>
                        }
                        @if (perfil()!.psicologo!.telefono || perfil()!.psicologo!.celular) {
                          <p class="mt-1 text-xs text-slate-500">
                            Teléfono: {{ perfil()!.psicologo!.telefono || perfil()!.psicologo!.celular }}
                          </p>
                        }
                      </div>
                    } @else {
                      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        No hay información de psicólogo asociada al usuario actual.
                      </div>
                    }
                  </div>
                }
              }
            </section>

            <!-- Col 2: Cambio de contraseña -->
            <section class="space-y-3 border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Seguridad</p>
                <h3 class="text-sm font-semibold text-slate-900">Cambiar contraseña</h3>
                <p class="mt-1 text-xs text-slate-500">
                  Actualiza tu contraseña de acceso. Usa una combinación segura de letras, números y símbolos.
                </p>
              </div>

              <form [formGroup]="form" (ngSubmit)="onSubmitChangePassword()" class="space-y-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña actual</label>
                  <input
                    type="password"
                    formControlName="currentPassword"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Nueva contraseña</label>
                  <input
                    type="password"
                    formControlName="newPassword"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Nueva contraseña segura"
                  />
                  <p class="text-[11px] text-slate-400">Mínimo 8 caracteres. Combina mayúsculas, minúsculas, números y símbolos.</p>
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    formControlName="confirmPassword"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                @if (changeError()) {
                  <div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {{ changeError() }}
                  </div>
                }

                @if (changeSuccess()) {
                  <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {{ changeSuccess() }}
                  </div>
                }

                <button
                  type="submit"
                  [disabled]="changeLoading()"
                  class="mt-1 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  @if (changeLoading()) {
                    <span class="flex items-center justify-center gap-2">
                      <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Guardando cambios...
                    </span>
                  } @else {
                    Guardar nueva contraseña
                  }
                </button>
              </form>
            </section>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-3.5 text-xs text-slate-500">
            <p class="hidden md:block">Si olvidaste tu contraseña, solicita un restablecimiento al administrador del sistema.</p>
            <button type="button" (click)="onClose()" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileModalComponent {
  readonly visible = input(false);
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly perfil = signal<CurrentUserWithPsicologo | null>(null);
  readonly perfilLoading = signal(false);
  readonly perfilError = signal<string | null>(null);

  readonly changeLoading = signal(false);
  readonly changeError = signal<string | null>(null);
  readonly changeSuccess = signal<string | null>(null);

  readonly form = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(4)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      if (this.visible() && !this.perfil() && !this.perfilLoading()) {
        this.cargarPerfil();
      }
    });
  }

  private cargarPerfil(): void {
    this.perfilLoading.set(true);
    this.perfilError.set(null);

    this.auth.fetchCurrentUserWithPsicologo().subscribe({
      next: (data) => {
        this.perfil.set(data);
        this.perfilLoading.set(false);
      },
      error: () => {
        this.perfilLoading.set(false);
        this.perfilError.set('No se pudo cargar la información del usuario.');
      },
    });
  }

  readonly displayName = (): string => {
    const perfil = this.perfil();
    const user = perfil?.user;
    const psicologo = perfil?.psicologo;
    if (psicologo?.apellidosNombres) {
      return psicologo.apellidosNombres;
    }
    if (user?.username) {
      return user.username;
    }
    const current = this.auth.currentUser();
    return current?.username || 'Usuario';
  };

  readonly roleLabel = (): string => {
    const perfil = this.perfil();
    const user = perfil?.user;
    if (user?.roleName) return user.roleName;
    const roles = this.auth.roles();
    if (roles.includes('ROLE_ADMINISTRADOR')) return 'Administrador';
    if (roles.includes('ROLE_PSICOLOGO')) return 'Psicólogo';
    if (roles.includes('ROLE_OBSERVADOR')) return 'Observador';
    return 'Usuario';
  };

  readonly initials = (): string => {
    const name = this.displayName();
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  onSubmitChangePassword(): void {
    this.changeError.set(null);
    this.changeSuccess.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.changeError.set('Revisa los campos del formulario.');
      return;
    }

    const raw = this.form.getRawValue();
    const currentPassword = raw.currentPassword ?? '';
    const newPassword = raw.newPassword ?? '';
    const confirmPassword = raw.confirmPassword ?? '';

    if (newPassword !== confirmPassword) {
      this.changeError.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    this.changeLoading.set(true);

    this.auth.changeOwnPassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.changeLoading.set(false);
        this.changeSuccess.set('Contraseña actualizada correctamente.');
        this.form.reset();
      },
      error: (err) => {
        this.changeLoading.set(false);
        if (err?.status === 400 || err?.status === 401) {
          this.changeError.set('La contraseña actual es incorrecta.');
        } else {
          this.changeError.set('No se pudo actualizar la contraseña. Inténtalo nuevamente.');
        }
      },
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
