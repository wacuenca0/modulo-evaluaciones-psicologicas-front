
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/user.service';
import { PsicologoGestionService, PsicologoGestionDTO } from '../../services/psicologo-gestion.service';
import { RoleService } from '../../services/role.service';
import { UsersTabsComponent } from '../users-tabs.component';
import { CreateUserRequestDTO, RoleDTO } from '../../models/auth.models';

type RegisterFormValue = {
  username: string;
  email: string;
  password: string;
  roleId: number | null;
  activo: boolean;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  celular: string;
  grado: string;
  especialidad: string;
  unidadMilitar: string;
};

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, UsersTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  // ...existing code...

  goToList() {
    this.router.navigate(['/users']);
  }
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userService = inject(UserService);
  private readonly psicologoGestionService = inject(PsicologoGestionService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<RoleDTO[]>([]);
  readonly mensajeExito = signal<string | null>(null);
  readonly esPsicologoSeleccionado = signal(false);

  readonly form = this.fb.group({
    username: this.fb.control('', { validators: [Validators.required, Validators.minLength(4), Validators.maxLength(60)] }),
    email: this.fb.control('', { validators: [Validators.required, Validators.email], updateOn: 'blur' }),
    password: this.fb.control('', { validators: [Validators.required, Validators.minLength(8), Validators.maxLength(80)] }),
    roleId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    activo: this.fb.control(true),
    cedula: this.fb.control('', { validators: [Validators.maxLength(15)] }),
    nombres: this.fb.control('', { validators: [Validators.maxLength(120)] }),
    apellidos: this.fb.control('', { validators: [Validators.maxLength(120)] }),
    telefono: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    celular: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    grado: this.fb.control('', { validators: [Validators.maxLength(60)] }),
    especialidad: this.fb.control('', { validators: [Validators.maxLength(120)] }),
    unidadMilitar: this.fb.control('', { validators: [Validators.maxLength(150)] })
  });

  constructor() {
    this.roleService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.roles.set(list));

    effect(() => {
      const roleId = this.form.controls.roleId.value;
      const esPsicologo = this.isPsicologoRole(roleId);
      if (this.esPsicologoSeleccionado() !== esPsicologo) {
        this.esPsicologoSeleccionado.set(esPsicologo);
        this.togglePsicologoValidators(esPsicologo);
      }
    });
  }

  readonly rolSeleccionado = computed(() => {
    const id = this.form.controls.roleId.value;
    if (id == null) {
      return null;
    }
    return this.roles().find(role => role.id === id) ?? null;
  });

  readonly rolEsPsicologo = computed(() => this.esPsicologoSeleccionado());

  submit() {
    this.error.set(null);
    this.mensajeExito.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa la informacion ingresada. Algunos campos requieren atencion.');
      return;
    }

    const raw = this.form.getRawValue() as RegisterFormValue;
    const roleId = this.normalizeRoleId(raw.roleId);
    if (roleId == null) {
      this.error.set('Debes seleccionar un rol para continuar.');
      return;
    }

    if (this.requiresPsicologo(roleId) && !this.validarDatosPsicologo(raw)) {
      return;
    }

    this.loading.set(true);


    // Siempre enviar el objeto psicologo, aunque no sea requerido por el rol
    const payload: CreateUserRequestDTO = {
      username: this.normalize(raw.username),
      email: this.normalize(raw.email),
      password: raw.password,
      roleId,
      psicologo: {
        cedula: this.normalize(raw.cedula),
        nombres: this.normalize(raw.nombres),
        apellidos: this.normalize(raw.apellidos),
        telefono: this.normalize(raw.telefono),
        celular: this.normalize(raw.celular),
        grado: this.normalize(raw.grado),
        unidadMilitar: this.normalize(raw.unidadMilitar),
        especialidad: this.normalize(raw.especialidad)
      }
    };


    // Siempre usar el servicio de usuarios y enviar el JSON con psicologo anidado
    this.userService.create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(err => {
          const mensaje = err?.error?.message as string | undefined;
          this.error.set(mensaje?.trim().length ? mensaje : 'No fue posible completar el registro. Intenta nuevamente.');
          return of(null);
        })
      )
      .subscribe(resultado => {
        if (!resultado) {
          return;
        }
        this.mensajeExito.set('Usuario creado correctamente.');
        this.router.navigate(['/users']).catch(() => {});
      });
  }

  limpiar() {
    this.form.reset({
      username: '',
      email: '',
      password: '',
      roleId: null,
      activo: true,
      cedula: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      celular: '',
      grado: '',
      especialidad: '',
      unidadMilitar: ''
    });
    this.error.set(null);
    this.mensajeExito.set(null);
  }

  campoInvalido(controlName: keyof RegisterFormValue): boolean {
    const control = this.form.get(controlName as string);
    if (!control) {
      return false;
    }
    return control.invalid && (control.dirty || control.touched);
  }

  private togglePsicologoValidators(habilitar: boolean) {
    const controls = this.form.controls;
    const requiredNombreValidators = [Validators.required, Validators.maxLength(120)];

    if (habilitar) {
      controls.cedula.setValidators([Validators.required, Validators.pattern(/^\d{6,15}$/)]);
      controls.nombres.setValidators(requiredNombreValidators);
      controls.apellidos.setValidators(requiredNombreValidators);
      controls.telefono.setValidators([Validators.required, Validators.maxLength(20)]);
      controls.celular.setValidators([Validators.required, Validators.maxLength(20)]);
      controls.grado.setValidators([Validators.required, Validators.maxLength(60)]);
      controls.especialidad.setValidators([Validators.required, Validators.maxLength(120)]);
      controls.unidadMilitar.setValidators([Validators.required, Validators.maxLength(150)]);
    } else {
      controls.cedula.setValidators([Validators.maxLength(15)]);
      controls.nombres.setValidators([Validators.maxLength(120)]);
      controls.apellidos.setValidators([Validators.maxLength(120)]);
      controls.telefono.setValidators([Validators.maxLength(20)]);
      controls.celular.setValidators([Validators.maxLength(20)]);
      controls.grado.setValidators([Validators.maxLength(60)]);
      controls.especialidad.setValidators([Validators.maxLength(120)]);
      controls.unidadMilitar.setValidators([Validators.maxLength(150)]);
    }

    controls.cedula.updateValueAndValidity({ emitEvent: false });
    controls.nombres.updateValueAndValidity({ emitEvent: false });
    controls.apellidos.updateValueAndValidity({ emitEvent: false });
    controls.telefono.updateValueAndValidity({ emitEvent: false });
    controls.celular.updateValueAndValidity({ emitEvent: false });
    controls.grado.updateValueAndValidity({ emitEvent: false });
    controls.especialidad.updateValueAndValidity({ emitEvent: false });
    controls.unidadMilitar.updateValueAndValidity({ emitEvent: false });
  }

  private normalize(value: string | null | undefined): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

  private tieneValor(value: string | null | undefined): boolean {
    return this.normalize(value).length > 0;
  }

  private validarDatosPsicologo(raw: RegisterFormValue): boolean {
    const faltantes: string[] = [];
    if (!this.tieneValor(raw.cedula)) faltantes.push('cédula');
    if (!this.tieneValor(raw.nombres)) faltantes.push('nombres');
    if (!this.tieneValor(raw.apellidos)) faltantes.push('apellidos');
    if (!this.tieneValor(raw.telefono)) faltantes.push('teléfono');
    if (!this.tieneValor(raw.celular)) faltantes.push('celular');
    if (!this.tieneValor(raw.grado)) faltantes.push('grado');
    if (!this.tieneValor(raw.especialidad)) faltantes.push('especialidad');
    if (!this.tieneValor(raw.unidadMilitar)) faltantes.push('unidad militar');

    if (faltantes.length) {
      this.error.set(`Completa los siguientes campos del perfil del psicólogo: ${faltantes.join(', ')}.`);
      return false;
    }
    return true;
  }

  private armarPsicologo(roleId: number, raw: RegisterFormValue): { psicologo?: CreateUserRequestDTO['psicologo'] } {
    if (!this.requiresPsicologo(roleId)) {
      return {};
    }
    return {
      psicologo: {
        cedula: this.normalize(raw.cedula),
        nombres: this.normalize(raw.nombres),
        apellidos: this.normalize(raw.apellidos),
        telefono: this.normalize(raw.telefono),
        celular: this.normalize(raw.celular),
        grado: this.normalize(raw.grado),
        unidadMilitar: this.normalize(raw.unidadMilitar),
        especialidad: this.normalize(raw.especialidad)
      }
    };
  }

  private isPsicologoRole(roleId: number | null): boolean {
    if (roleId == null) {
      return false;
    }
    const normalizedId = this.normalizeRoleId(roleId);
    if (this.requiresPsicologo(normalizedId ?? null)) {
      return true;
    }
    const role = this.roles().find(item => item.id === normalizedId);
    if (!role) {
      return false;
    }
    const name = role.name?.toUpperCase?.() ?? '';
    return name.includes('PSICOLOG');
  }

  private normalizeRoleId(value: number | string | null): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private requiresPsicologo(roleId: number | null): boolean {
    if (roleId == null) {
      return false;
    }
    if (roleId === 2) {
      return true;
    }
    const role = this.roles().find(item => item.id === roleId);
    const normalizedName = role?.name?.toUpperCase?.() ?? '';
    return normalizedName.includes('PSICOLOG');
  }
}
