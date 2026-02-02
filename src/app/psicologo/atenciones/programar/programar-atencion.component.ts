import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PacienteAutocompleteComponent } from '../../../shared/paciente-autocomplete.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AtencionPsicologicaService } from '../../../services/atenciones-psicologicas.service';
import { PersonalMilitarService } from '../../../services/personal-militar.service';
import { PsicologosService } from '../../../services/psicologos.service';
import { AuthService } from '../../../services/auth.service';
import { PersonalMilitarDTO } from '../../../models/personal-militar.models';
import { AtencionPsicologicaRequestDTO } from '../../../models/atenciones-psicologicas.models';

@Component({
  selector: 'app-programar-atencion',
  standalone: true,
  imports: [CommonModule, FormsModule, PacienteAutocompleteComponent],
  templateUrl: './programar-atencion.component.html',
  styleUrls: ['./programar-atencion.component.scss']
})
export class ProgramarAtencionComponent implements OnInit {
  // Inyección de dependencias
  private readonly atencionService = inject(AtencionPsicologicaService);
  private readonly personalService = inject(PersonalMilitarService);
  private readonly psicologosService = inject(PsicologosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Estados de la UI
  readonly cargandoAccion = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Información del usuario
  psicologoActual: { id: number | null, nombre: string } | null = null;
  psicologos: any[] = [];
  pacienteSeleccionado: PersonalMilitarDTO | null = null;

  // Modelo del formulario - SOLO CAMPOS MÍNIMOS PARA ATENCIÓN PROGRAMADA
  formModel: AtencionPsicologicaRequestDTO = {
    personalMilitarId: null,
    psicologoId: null,
    fechaAtencion: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFin: '10:00',
    tipoAtencion: 'PRESENCIAL',
    tipoConsulta: 'PRIMERA_VEZ',
    motivoConsulta: '',
    anamnesis: '',
    examenMental: '',
    impresionDiagnostica: '',
    planIntervencion: '',
    recomendaciones: '',
    derivacion: '',
    diagnosticoIds: [],
    proximaCita: null,
    observacionesProximaCita: '',
    estado: 'PROGRAMADA', // ESTADO FIJO PARA ATENCIÓN PROGRAMADA
    razonCancelacion: ''
  };

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    // Cargar lista de psicólogos primero
    this.psicologosService.list().subscribe({
      next: (psicologos: any[]) => {
        this.psicologos = psicologos;
        this.asignarPsicologoActual();
      },
      error: (err: any) => {
        this.psicologos = [];
        this.asignarPsicologoActual();
      }
    });

    // Verificar si viene paciente de URL
    const pacienteId = this.route.snapshot.queryParamMap.get('pacienteId');
    if (pacienteId) {
      this.formModel.personalMilitarId = Number(pacienteId);
      this.personalService.obtenerPorId(Number(pacienteId)).subscribe({
        next: paciente => {
          this.pacienteSeleccionado = paciente;
        },
        error: err => console.error('Error al cargar paciente:', err)
      });
    }
  }

  private asignarPsicologoActual(): void {
    const user = this.authService.getCurrentUser?.();
    if (!user) {
      this.psicologoActual = null;
      this.formModel.psicologoId = null;
      return;
    }
    const psicologo = this.psicologos.find(p => p.id === user.id || p.username === user.username);
    if (psicologo) {
      this.psicologoActual = {
        id: psicologo.id,
        nombre: `${psicologo.nombres || ''} ${psicologo.apellidos || ''}`.trim()
      };
      this.formModel.psicologoId = psicologo.id;
    } else {
      this.psicologoActual = {
        id: user.id ?? null,
        nombre: user.fullName || user.username || ''
      };
      this.formModel.psicologoId = user.id ?? null;
    }
  }

  // ========== LÓGICA DE CREACIÓN (ADAPTADA DEL COMPONENTE ORIGINAL) ==========

  asignarPaciente(paciente: PersonalMilitarDTO): void {
    this.pacienteSeleccionado = paciente;
    this.formModel.personalMilitarId = paciente?.id ?? null;
  }

  guardarAtencionProgramada(): void {
    // Asignar psicólogo si no está asignado (por seguridad)
    if (!this.formModel.psicologoId) {
      this.asignarPsicologoActual();
    }

    // Validaciones (igual que en el componente original)
    if (!this.formModel.personalMilitarId) {
      this.error.set('Debe seleccionar un paciente.');
      this.scrollToError();
      return;
    }
    
    if (!this.formModel.motivoConsulta) {
      this.error.set('El motivo de consulta es obligatorio.');
      this.scrollToError();
      return;
    }

    // Asegurar que el estado sea PROGRAMADA
    this.formModel.estado = 'PROGRAMADA';

    // Mostrar carga
    this.cargandoAccion.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    // Crear copia del modelo para enviar (igual que en el original)
    const formData = { ...this.formModel };

    // Llamar al servicio (misma lógica que en el original)
    this.atencionService.crearAtencion(formData).subscribe({
      next: (atencionGuardada) => {
        this.mensajeExito.set('Atención programada correctamente');
        
        // Redirigir después de éxito (igual que la lógica de navegación)
        setTimeout(() => {
          this.router.navigate(['/psicologo/atenciones']);
        }, 1500);
      },
      error: (err) => {
        // Manejo de errores (igual que en el original)
        this.error.set(this.obtenerMensajeError(err));
        this.cargandoAccion.set(false);
        this.scrollToError();
      },
      complete: () => this.cargandoAccion.set(false)
    });
  }

  cancelar(): void {
    this.router.navigate(['/psicologo/atenciones']);
  }

  // ========== UTILIDADES (COPIADAS DEL COMPONENTE ORIGINAL) ==========

  private scrollToError(): void {
    setTimeout(() => {
      const errorEl = document.querySelector('.mb-4.rounded-xl');
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  private obtenerMensajeError = (err: any): string => 
    err?.error?.message || err?.message || 'Ocurrió un error inesperado al crear la atención.';

  // Tipos de consulta (igual que en el original)
  readonly tiposConsulta = [
    { valor: 'PRIMERA_VEZ', label: 'Primera Vez' }, 
    { valor: 'SEGUIMIENTO', label: 'Seguimiento' },
    { valor: 'URGENCIA', label: 'Urgencia' }, 
    { valor: 'CONTROL', label: 'Control' }
  ];

  // Tipos de atención (igual que en el original)
  readonly tiposAtencion = [
    { valor: 'PRESENCIAL', label: 'Presencial' }, 
    { valor: 'TELEFONICA', label: 'Telefónica' },
    { valor: 'VIRTUAL', label: 'Virtual' }
  ];
}