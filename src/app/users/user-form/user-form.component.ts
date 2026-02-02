
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/user.service';
import { UsersTabsComponent } from '../users-tabs.component';
import { RoleService } from '../../services/role.service';
import { CreateUserPsicologoDTO, CreateUserRequestDTO, RoleDTO, UpdateUserRequestDTO, UserDTO } from '../../models/auth.models';
import { PsicologoGestionService, PsicologoGestionDTO } from '../../services/psicologo-gestion.service';

type PsicologoFormControls = {
  cedula: FormControl<string>;
  nombres: FormControl<string>;
  apellidos: FormControl<string>;
  telefono: FormControl<string>;
  celular: FormControl<string>;
  grado: FormControl<string>;
  unidadMilitar: FormControl<string>;
  especialidad: FormControl<string>;
};

type UserFormControls = {
  username: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  roleId: FormControl<number | null>;
  active: FormControl<boolean>;
  psicologo: FormGroup<PsicologoFormControls>;
};

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [CommonModule, ReactiveFormsModule, UsersTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent  {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly psicologoGestionService = inject(PsicologoGestionService);
  readonly route = inject(ActivatedRoute);
  // Getter para el id del usuario en edición
  get userId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  // Señal para el psicólogo cargado
  readonly psicologoLoaded = signal<PsicologoGestionDTO | null>(null);

  // Getter para el psicólogo a editar, usa el cargado si existe
  get psicologoEditDTO() {
    const p = this.psicologoLoaded();
    if (!p) return null;
    // Adaptar a PsicologoDTO: id nunca undefined, apellidosNombres nunca undefined
    return {
      ...p,
      id: p.id ?? 0,
      apellidosNombres: p.apellidosNombres ?? ''
    };
  }

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly roles = signal<RoleDTO[]>([]);
  readonly isEdit = signal(false);
  private readonly selectedRoleId = signal<number | null>(null);

  readonly form: FormGroup<UserFormControls> = this.buildForm();

  readonly showPsicologoSection = computed(() => this.isPsicologoRole(this.selectedRoleId()));

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.bindRoleWatcher();
    this.setPasswordRequirements(!id);
    if (id) {
      this.isEdit.set(true);
      this.load(id);
    }
    this.roleService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.roles.set(list);
        this.updatePsicologoValidators(this.selectedRoleId());
      });
    this.updatePsicologoValidators(this.selectedRoleId());
  }

  load(username: string) {
    this.userService
      .find(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u: UserDTO) => {
        this.form.patchValue({
          username: u.username,
          email: u.email ?? '',
          roleId: u.roleId ?? null,
          active: u.active ?? true,
          password: ''
        });
        const normalizedRole = this.normalizeRoleId(u.roleId ?? null);
        this.selectedRoleId.set(normalizedRole);
        this.updatePsicologoValidators(normalizedRole);

        // Cargar perfil profesional del psicólogo si el rol es psicólogo
        if (this.isPsicologoRole(normalizedRole) && u.id) {
          this.psicologoGestionService.buscarPorUsuarioId(u.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((psicologo: PsicologoGestionDTO | null) => {
              // Si el backend retorna un array, procesar manualmente aquí
              if (Array.isArray(psicologo)) {
                this.psicologoLoaded.set(psicologo.length > 0 ? psicologo[0] : null);
              } else {
                this.psicologoLoaded.set(psicologo && psicologo.id ? psicologo : null);
              }
            });
        } else {
          this.psicologoLoaded.set(null);
        }
      });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const roleId = this.normalizeRoleId(value.roleId);
    if (roleId == null) {
      this.loading.set(false);
      return;
    }
    const username = value.username.trim();
    const email = value.email.trim();
    const password = value.password.trim();
    const active = value.active;
    if (this.isEdit()) {
      // Incluir psicologo en update si corresponde
      const basePayload: UpdateUserRequestDTO & { psicologo?: CreateUserPsicologoDTO } = {
        username,
        email,
        roleId,
        active,
        ...(password ? { password } : {})
      };
      const psicologoPayload = this.embedPsicologoPayload();
      if (Object.keys(psicologoPayload).length > 0) {
        Object.assign(basePayload, psicologoPayload);
      }
      this.userService.update(basePayload).subscribe({
        next: () => { this.loading.set(false); this.router.navigate(['/users']); },
        error: (err: HttpErrorResponse) => this.handleSubmitError(err)
      });
    } else {
      const payload: CreateUserRequestDTO = {
        username,
        email,
        password,
        roleId,
        ...this.embedPsicologoPayload()
      };
      if (!active) {
        payload.active = false;
      }
      this.userService.create(payload).subscribe({
        next: () => { this.loading.set(false); this.router.navigate(['/users']); },
        error: (err: HttpErrorResponse) => this.handleSubmitError(err)
      });
    }
  }

  private buildForm(): FormGroup<UserFormControls> {
    const nn = this.fb.nonNullable;
    const psicologoGroup = this.fb.group({
      cedula: nn.control(''),
      nombres: nn.control(''),
      apellidos: nn.control(''),
      telefono: nn.control(''),
      celular: nn.control(''),
      grado: nn.control(''),
      unidadMilitar: nn.control(''),
      especialidad: nn.control('')
    }) as FormGroup<PsicologoFormControls>;
    return this.fb.group({
      username: nn.control('', { validators: [Validators.required, Validators.minLength(4)] }),
      email: nn.control('', { validators: [Validators.required, Validators.email] }),
      password: this.fb.control('', []),
      roleId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      active: nn.control(true),
      psicologo: psicologoGroup
    }) as FormGroup<UserFormControls>;
  }

  private bindRoleWatcher(): void {
    const roleControl = this.form.controls.roleId;
    this.selectedRoleId.set(this.normalizeRoleId(roleControl.value));
    roleControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(roleId => {
        const normalized = this.normalizeRoleId(roleId);
        this.selectedRoleId.set(normalized);
        this.updatePsicologoValidators(normalized);
      });
  }

  private setPasswordRequirements(required: boolean): void {
    const control = this.form.controls.password;
    control.setValidators(required ? [Validators.required, Validators.minLength(8)] : [this.optionalMinLength(8)]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private embedPsicologoPayload(): { psicologo?: CreateUserPsicologoDTO } {
    if (!this.showPsicologoSection()) {
      return {};
    }
    const psicologoGroup = this.form.controls.psicologo;
    const raw = psicologoGroup.getRawValue();
    const cedula = raw.cedula.trim();
    const nombres = raw.nombres.trim();
    const apellidos = raw.apellidos.trim();
    if (!cedula || !nombres || !apellidos) {
      return {};
    }
    const telefono = raw.telefono.trim();
    const celular = raw.celular.trim();
    const grado = raw.grado.trim();
    const unidadMilitar = raw.unidadMilitar.trim();
    const especialidad = raw.especialidad.trim();
    if (!telefono || !celular || !grado || !unidadMilitar || !especialidad) {
      return {};
    }
    const payload: CreateUserPsicologoDTO = {
      cedula,
      nombres,
      apellidos,
      telefono,
      celular,
      grado,
      unidadMilitar,
      especialidad
    };
    return { psicologo: payload };
  }

  private updatePsicologoValidators(roleId: number | null): void {
    const controls = this.form.controls.psicologo.controls;
    const isPsicologo = this.isPsicologoRole(roleId);
    this.setControlValidators(controls.cedula, isPsicologo ? [Validators.required, Validators.minLength(10)] : []);
    this.setControlValidators(controls.nombres, isPsicologo ? [Validators.required, Validators.minLength(2)] : []);
    this.setControlValidators(controls.apellidos, isPsicologo ? [Validators.required, Validators.minLength(2)] : []);
    this.setControlValidators(controls.telefono, isPsicologo ? [Validators.required, Validators.minLength(7)] : []);
    this.setControlValidators(controls.celular, isPsicologo ? [Validators.required, Validators.minLength(10)] : []);
    this.setControlValidators(controls.grado, isPsicologo ? [Validators.required, Validators.minLength(2)] : []);
    this.setControlValidators(controls.unidadMilitar, isPsicologo ? [Validators.required, Validators.minLength(2)] : []);
    this.setControlValidators(controls.especialidad, isPsicologo ? [Validators.required, Validators.minLength(3)] : []);
    if (!isPsicologo) {
      this.form.controls.psicologo.reset({
        cedula: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        celular: '',
        grado: '',
        unidadMilitar: '',
        especialidad: ''
      }, { emitEvent: false });
    }
  }

  private setControlValidators(control: FormControl<string>, validators: ValidatorFn[]): void {
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private isPsicologoRole(roleId: number | null): boolean {
    if (roleId == null) {
      return false;
    }
    const match = this.roles().find(r => r.id === roleId);
    const normalized = match?.name?.toLocaleLowerCase('es-EC') ?? '';
    return normalized.includes('psicolog');
  }

  private optionalMinLength(min: number): ValidatorFn {
    return control => {
      const rawValue = control.value as string | null | undefined;
      const value = (rawValue ?? '').trim();
      if (!value) {
        return null;
      }
      return value.length >= min ? null : { minlength: { requiredLength: min, actualLength: value.length } };
    };
  }

  private normalizeRoleId(roleId: number | string | null): number | null {
    if (typeof roleId === 'number') {
      return Number.isFinite(roleId) ? roleId : null;
    }
    if (typeof roleId === 'string' && roleId.trim().length) {
      const parsed = Number(roleId.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private handleSubmitError(err: HttpErrorResponse): void {
    this.loading.set(false);
    const serverMessage = this.extractServerMessage(err);
    this.errorMessage.set(serverMessage ?? 'No se pudo guardar el usuario. Revise los datos e intente nuevamente.');
    console.error('No se pudo guardar el usuario', err, serverMessage);
  }

  private extractServerMessage(err: HttpErrorResponse): string | null {
    if (!err) {
      return null;
    }
    const errorBody = err.error;
    if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message;
        }
      } catch {
        return errorBody;
      }
    }
    if (errorBody && typeof errorBody === 'object' && 'message' in errorBody) {
      const maybeMessage = (errorBody as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }
    }
    if (err.status === 400) {
      return 'El servicio rechazó la solicitud (400). Verifique que el usuario, correo y cédula no existan y que el rol sea correcto.';
    }
    return null;
  }

    goToPsicologoEdit(): void {
      const id = this.userId;
      if (id) {
        this.router.navigate(['/psicologo/edit', id]);
      }
    }
}
