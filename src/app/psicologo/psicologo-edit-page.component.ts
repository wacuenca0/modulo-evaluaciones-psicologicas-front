
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PsicologoEditFormComponent } from './psicologo-edit-form.component';
import { PsicologoGestionService, PsicologoGestionDTO } from '../services/psicologo-gestion.service';

@Component({
  selector: 'app-psicologo-edit-page',
  standalone: true,
  imports: [CommonModule, PsicologoEditFormComponent],
  template: `
    <div class="container mx-auto p-6">
      <h2 class="text-xl font-bold mb-4">
        {{ psicologo() ? 'Editar perfil profesional del psicólogo' : 'Crear perfil profesional del psicólogo' }}
      </h2>
      <div style="background:#f3f3f3;padding:8px;margin-bottom:8px;">
        <strong>Debug:</strong>
        <div>usuarioId: {{ usuarioId() }}</div>
        <div>loading: {{ loading() }}</div>
        <div>error: {{ error() }}</div>
        <div>psicologoData: {{ psicologoData() | json }}</div>
      </div>
      <ng-container *ngIf="usuarioId() > 0; else invalidIdBlock">
        <app-psicologo-edit-form 
          [usuarioId]="usuarioId()"
          [psicologoData]="psicologoData()"
          (updated)="onPsicologoUpdated()">
        </app-psicologo-edit-form>
      </ng-container>
      <ng-template #invalidIdBlock>
        <div class="mt-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-center">
          <strong>Error:</strong> No se proporcionó un ID de usuario válido.<br>
          No es posible mostrar el formulario de psicólogo.<br>
          <a href="/users" class="underline text-blue-700">Volver a la lista de usuarios</a>
        </div>
      </ng-template>

      <ng-container *ngIf="loading()">
        <p class="mt-4 text-sm text-slate-500">Cargando datos...</p>
      </ng-container>

      <ng-container *ngIf="error() && usuarioId() > 0">
        <p class="mt-4 text-sm text-red-500">{{ error() }}</p>
      </ng-container>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PsicologoEditPageComponent implements OnInit {
  psicologo = signal<PsicologoGestionDTO | null>(null);
  psicologoData = signal<any>(null);
  usuarioId = signal<number>(0);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly psicologoGestionService = inject(PsicologoGestionService);

  ngOnInit(): void {
    // Siempre usar el id de usuario (NO el id del psicólogo) para cargar y editar el perfil profesional
    const usuarioId = Number(this.route.snapshot.paramMap.get('id'));
    console.log('[PsicologoEditPage] ID recibido en ruta (usuarioId):', usuarioId);
    if (usuarioId && usuarioId > 0) {
      this.usuarioId.set(usuarioId);
      this.cargarDatosPsicologo(usuarioId);
    } else {
      this.error.set('ID de usuario no válido');
      this.loading.set(false);
    }
  }

  private cargarDatosPsicologo(usuarioId: number) {
    this.loading.set(true);
    this.error.set(null);
    console.log('[PsicologoEditPage] Buscar datos de psicólogo para usuarioId:', usuarioId);
    // Solo para edición, usar el endpoint por-usuario
    this.psicologoGestionService.buscarPorUsuarioId(usuarioId).subscribe({
      next: (p) => {
        console.log('[PsicologoEditPage] Respuesta buscarPorUsuarioId:', p);
        if (p && p.id) {
          this.psicologo.set(p);
          this.psicologoData.set({
            id: p.id,
            cedula: p.cedula,
            nombres: p.nombres,
            apellidos: p.apellidos,
            apellidosNombres: p.apellidosNombres,
            email: p.email,
            telefono: p.telefono,
            celular: p.celular,
            grado: p.grado,
            unidadMilitar: p.unidadMilitar,
            especialidad: p.especialidad,
            activo: p.activo
          });
        } else {
          this.psicologo.set(null);
          this.psicologoData.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[PsicologoEditPage] Error al cargar datos del psicólogo:', err);
        this.error.set('Error al cargar los datos del psicólogo');
        this.loading.set(false);
      }
    });
  }

  onPsicologoUpdated() {
    // Redirigir a la lista de usuarios o mostrar mensaje de éxito
    alert('Datos del psicólogo guardados exitosamente');
    this.router.navigate(['/users']);
  }
}
