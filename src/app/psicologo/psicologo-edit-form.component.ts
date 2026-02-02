import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PsicologoGestionService, PsicologoGestionDTO } from '../services/psicologo-gestion.service';
import { PsicologoDTO } from '../models/psicologos.models';

@Component({
  selector: 'app-psicologo-edit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form()" (ngSubmit)="onSubmit()">
      <div>
        <label>Cédula:</label>
        <input type="text" formControlName="cedula" />
      </div>
      <div>
        <label>Nombres:</label>
        <input type="text" formControlName="nombres" />
      </div>
      <div>
        <label>Apellidos:</label>
        <input type="text" formControlName="apellidos" />
      </div>
      <div>
        <label>Especialidad:</label>
        <input type="text" formControlName="especialidad" />
      </div>
      <div>
        <label>Email:</label>
        <input type="email" formControlName="email" />
      </div>
      <div>
        <label>Teléfono:</label>
        <input type="text" formControlName="telefono" />
      </div>
      <div>
        <label>Celular:</label>
        <input type="text" formControlName="celular" />
      </div>
      <div>
        <label>Grado:</label>
        <input type="text" formControlName="grado" />
      </div>
      <div>
        <label>Unidad Militar:</label>
        <input type="text" formControlName="unidadMilitar" />
      </div>
      <button type="submit" [disabled]="form().invalid">
        {{ isEditMode() ? 'Actualizar' : 'Crear' }}
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PsicologoEditFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly psicologoGestionService = inject(PsicologoGestionService);

  // Recibe el usuario ID para crear/editar psicólogo
  usuarioId = input<number>(0);
  psicologoData = input<PsicologoDTO | null>(null);
  updated = output<void>();

  isEditMode = signal<boolean>(false);

  form = signal<FormGroup>(
    this.fb.group({
      cedula: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      apellidosNombres: [''],
      usuarioId: [0],
      username: [''],
      email: [''],
      telefono: [''],
      celular: [''],
      grado: [''],
      unidadMilitar: [''],
      especialidad: ['', Validators.required],
      activo: [true]
    })
  );

  constructor() {
    effect(() => {
      const usuarioId = this.usuarioId();
      const psicologoData = this.psicologoData();
      console.log('[PsicologoEditForm] usuarioId:', usuarioId, 'psicologoData:', psicologoData);
      if (usuarioId > 0) {
        if (psicologoData) {
          this.isEditMode.set(true);
          this.form().patchValue({
            ...psicologoData,
            usuarioId: usuarioId
          });
        } else {
          this.isEditMode.set(false);
          this.cargarDatosUsuario(usuarioId);
        }
      }
    });
  }

  private cargarDatosUsuario(usuarioId: number) {
    if (!usuarioId || usuarioId <= 0) {
      console.error('[PsicologoEditForm] usuarioId inválido para cargarDatosUsuario:', usuarioId);
      return;
    }
    this.psicologoGestionService.obtenerUsuario(usuarioId).subscribe({
      next: (usuario) => {
        this.form().patchValue({
          usuarioId: usuario.id,
          username: usuario.username,
          email: usuario.email
        });
      },
      error: (err) => {
        console.error('Error al cargar datos del usuario:', err);
      }
    });
  }

  onSubmit() {
    if (this.form().valid && this.usuarioId() > 0) {
      const formValue = this.form().getRawValue();
      if (!formValue.apellidosNombres && formValue.apellidos && formValue.nombres) {
        formValue.apellidosNombres = `${formValue.apellidos} ${formValue.nombres}`;
      }
      if (this.isEditMode() && this.psicologoData()) {
        const psicologoId = this.psicologoData()!.id;
        this.psicologoGestionService.actualizar(psicologoId, formValue).subscribe({
          next: () => this.updated.emit(),
          error: (err) => console.error('Error al actualizar psicólogo:', err)
        });
      } else {
        this.psicologoGestionService.crear(formValue).subscribe({
          next: () => this.updated.emit(),
          error: (err) => console.error('Error al crear psicólogo:', err)
        });
      }
    }
  }
}
