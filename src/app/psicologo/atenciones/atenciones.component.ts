import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

// Componentes
import { PacienteAutocompleteComponent } from '../../shared/paciente-autocomplete.component';

// Servicios
import { AtencionPsicologicaService } from '../../services/atenciones-psicologicas.service';
import { PersonalMilitarService } from '../../services/personal-militar.service';
import { PsicologosService } from '../../services/psicologos.service';
import { CatalogosService } from '../../services/catalogos.service';
import { AuthService } from '../../services/auth.service';

// Modelos
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { AtencionPsicologicaRequestDTO } from '../../models/atenciones-psicologicas.models';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';

// Componentes modales
import { ProgramarAtencionModalComponent } from './programar-atencion-modal.component';
import { ProgramarSeguimientoModalComponent } from './programar-seguimiento-modal.component';
import { AtencionDetalleComponent } from './detalle/atencion-detalle.component';

import { AtencionesListaComponent } from './atenciones-lista.component';
import { FinalizarAtencionModalComponent } from './finalizar-atencion-modal.component';

// Interfaces locales
interface EstadoBadgeConfig {
  color: string;
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

interface PsicologoInfo {
  id: number;
  nombre: string;
  username: string;
}

@Component({
  selector: 'app-atenciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PacienteAutocompleteComponent,
    ProgramarAtencionModalComponent,
    ProgramarSeguimientoModalComponent,
    AtencionDetalleComponent,
    AtencionesListaComponent,
    FinalizarAtencionModalComponent
  ],
  templateUrl: './atenciones.component.html',
  styleUrls: ['./atenciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtencionesComponent implements OnInit, OnDestroy {
    // Estado y datos para modales de acciones
    readonly showCancelarModal = signal(false);
    readonly showNoAsistioModal = signal(false);
    readonly showReprogramarModal = signal(false);
    razonCancelacion = '';
    nuevaFechaReprogramar = '';
    atencionAccion: any = null;

    // Abrir modales desde la lista
    cancelarAtencion(atencion: any): void {
      if (!atencion?.id) return;
      this.atencionAccion = atencion;
      this.razonCancelacion = '';
      this.showCancelarModal.set(true);
    }
    cerrarCancelarModal(): void {
      this.showCancelarModal.set(false);
      this.atencionAccion = null;
      this.razonCancelacion = '';
    }
    onCancelarAtencion(): void {
      // Aquí llamarías al servicio para cancelar
      // this.atencionService.cancelarAtencion(this.atencionAccion.id, { razonCancelacion: this.razonCancelacion })
      this.cerrarCancelarModal();
      this.cargarAtencionesFiltradas();
    }

    marcarNoAsistio(atencion: any): void {
      if (!atencion?.id) return;
      this.atencionAccion = atencion;
      this.showNoAsistioModal.set(true);
    }
    cerrarNoAsistioModal(): void {
      this.showNoAsistioModal.set(false);
      this.atencionAccion = null;
    }
    onNoAsistioAtencion(): void {
      // Aquí llamarías al servicio para marcar no asistió
      // this.atencionService.noAsistioAtencion(this.atencionAccion.id)
      this.cerrarNoAsistioModal();
      this.cargarAtencionesFiltradas();
    }

    reprogramarAtencion(atencion: any): void {
      if (!atencion?.id) return;
      this.atencionAccion = atencion;
      this.nuevaFechaReprogramar = '';
      this.showReprogramarModal.set(true);
    }
    cerrarReprogramarModal(): void {
      this.showReprogramarModal.set(false);
      this.atencionAccion = null;
      this.nuevaFechaReprogramar = '';
    }
    onReprogramarAtencion(): void {
      // Aquí llamarías al servicio para reprogramar
      // this.atencionService.reprogramarAtencion(this.atencionAccion.id, { nuevaFecha: this.nuevaFechaReprogramar })
      this.cerrarReprogramarModal();
      this.cargarAtencionesFiltradas();
    }
  // Estado para el modal de finalizar atención
  readonly showFinalizarModal = signal(false);
  atencionFinalizar: any = null;

  abrirFinalizarModal(atencion: any): void {
    if (!atencion?.id) return;
    this.atencionFinalizar = { ...atencion };
    this.showFinalizarModal.set(true);
  }

  cerrarFinalizarModal(): void {
    this.showFinalizarModal.set(false);
    this.atencionFinalizar = null;
  }

  onFinalizarAtencion(data: any): void {
    if (!this.atencionFinalizar) return;
    // Validar campos obligatorios
    const { anamnesis, examenMental, impresionDiagnostica, planIntervencion, recomendaciones, derivacion, diagnosticoIds } = data;
    if (!anamnesis || !examenMental || !impresionDiagnostica || !planIntervencion || !recomendaciones || !derivacion || !diagnosticoIds?.length) {
      this.error.set('Todos los campos son obligatorios para finalizar la atención.');
      return;
    }
    // Llamar al endpoint para finalizar
    // this.atencionService.finalizarAtencion(this.atencionFinalizar.id, data).subscribe(() => {
    //   this.cargarAtencionesFiltradas();
    //   this.cerrarFinalizarModal();
    // });
    this.cerrarFinalizarModal();
    this.cargarAtencionesFiltradas();
  }

  // Métodos para acciones de la lista
  abrirDetalleModal(atencionId: number): void {
    this.verDetalle(atencionId);
  }


      // Computed property for estadosDisponibles without 'TODAS'
      readonly estadosFiltrados = computed(() => this.estadosDisponibles().filter(e => e !== 'TODAS'));
    // Keyboard accessibility handlers for modals and diagnostico items
    onModalKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        if (this.showModal()) this.cerrarModal();
        if (this.showEliminarModal()) this.cerrarModalEliminar();
        if (this.showProgramarModal()) this.showProgramarModal.set(false);
        if (this.showProgramarSeguimientoModal()) this.showProgramarSeguimientoModal.set(false);
        if (this.showDetalleModal()) this.showDetalleModal.set(false);
      }
    }

    onDiagnosticoKeyDown(event: KeyboardEvent, diagnosticoId: number): void {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggleDiagnostico(diagnosticoId);
      }
    }
  // Inyección de dependencias
  private readonly atencionService = inject(AtencionPsicologicaService);
  private readonly personalService = inject(PersonalMilitarService);
  private readonly psicologosService = inject(PsicologosService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  
  // Subject para manejar la destrucción de suscripciones
  private readonly destroy$ = new Subject<void>();

  // ========== SEÑALES PARA EL ESTADO ==========
  readonly cargando = signal(true);
  readonly cargandoAccion = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeSinResultados = signal<string>('');

  // ========== SEÑALES PARA FILTROS ==========
  readonly filtroEstado = signal('TODAS');
  readonly filtroNombrePaciente = signal('');
  readonly filtroFecha = signal('');
  readonly filtroHoy = signal(false);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);

  // ========== SEÑALES PARA MODALES ==========
  readonly showModal = signal(false);
  readonly showEliminarModal = signal(false);
  readonly showProgramarModal = signal(false);
  readonly showProgramarSeguimientoModal = signal(false);
  readonly showDetalleModal = signal(false);

  // ========== MODOS Y MODELOS ==========
  readonly modoEdicion = signal(false);
  readonly modoProgramada = signal(false);
  pacienteSeleccionado: PersonalMilitarDTO | null = null;

  // Modelo para el formulario principal
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
    estado: 'PROGRAMADA',
    razonCancelacion: ''
  };

  // ========== DIAGNÓSTICOS CIE-10 ==========
  readonly cie10SearchTerm = signal<string>('');
  readonly diagnosticosFiltrados = signal<CatalogoCIE10DTO[]>([]);
  readonly todosDiagnosticosCIE10 = signal<CatalogoCIE10DTO[]>([]);
  readonly cargandoDiagnosticos = signal(false);

  // ========== MODAL PROGRAMAR ATENCIÓN ==========
  readonly programarCargandoAccion = signal(false);
  readonly programarError = signal<string | null>(null);
  readonly programarMensajeExito = signal<string | null>(null);
  programarPacienteSeleccionado: PersonalMilitarDTO | null = null;
  programarFormModel: AtencionPsicologicaRequestDTO = {
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
    estado: 'PROGRAMADA',
    razonCancelacion: ''
  };

  // ========== MODAL PROGRAMAR SEGUIMIENTO ==========
  readonly programarSeguimientoCargandoAccion = signal(false);
  readonly programarSeguimientoError = signal<string | null>(null);
  readonly programarSeguimientoMensajeExito = signal<string | null>(null);
  readonly detalleAtencionId = signal<number | null>(null);
  
  programarSeguimientoFormModel: any = {
    fichaPsicologicaId: null,
    psicologoId: null,
    fechaAtencion: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFin: '10:00',
    tipoAtencion: 'PRESENCIAL',
    tipoConsulta: 'SEGUIMIENTO',
    motivoConsulta: '',
    planIntervencion: '',
    recomendaciones: '',
    diagnosticoIds: [],
    proximaCita: null,
    observacionesProximaCita: '',
    estado: 'PROGRAMADA',
    razonCancelacion: '',
    tipoEvaluacion: undefined
  };

  // ========== DATOS ==========
  readonly atenciones = signal<any[]>([]);
  readonly psicologos = signal<any[]>([]);

  // ========== COMPUTED PROPERTIES ==========
  readonly psicologoActual = computed(() => {
    const user = this.authService.getCurrentUser?.();
    if (!user) return null;
    
    const psicologo = this.psicologos().find(p => p.id === user.id || p.username === user.username);
    if (psicologo) {
      return { 
        id: psicologo.id, 
        nombre: `${psicologo.nombres || ''} ${psicologo.apellidos || ''}`.trim(),
        username: psicologo.username
      };
    }
    return { 
      id: user.id, 
      nombre: user.fullName || user.username || '',
      username: user.username
    };
  });

  readonly estadosDisponibles = computed(() => 
    ['TODAS', 'PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA', 'NO_ASISTIO']
  );

  readonly tiposConsulta = computed(() => [
    { valor: 'PRIMERA_VEZ', label: 'Primera Vez' },
    { valor: 'SEGUIMIENTO', label: 'Seguimiento' },
    { valor: 'URGENCIA', label: 'Urgencia' },
    { valor: 'CONTROL', label: 'Control' }
  ]);

  readonly tiposAtencion = computed(() => [
    { valor: 'PRESENCIAL', label: 'Presencial' },
    { valor: 'TELEFONICA', label: 'Telefónica' },
    { valor: 'VIRTUAL', label: 'Virtual' }
  ]);

  readonly estadosConfig: Record<string, EstadoBadgeConfig> = {
    PROGRAMADA: {
      color: 'blue',
      icon: 'calendar',
      label: 'Programada',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200'
    },
    EN_CURSO: {
      color: 'yellow',
      icon: 'clock',
      label: 'En Curso',
      bgClass: 'bg-yellow-50',
      textClass: 'text-yellow-700',
      borderClass: 'border-yellow-200'
    },
    FINALIZADA: {
      color: 'green',
      icon: 'check-circle',
      label: 'Finalizada',
      bgClass: 'bg-green-50',
      textClass: 'text-green-700',
      borderClass: 'border-green-200'
    },
    CANCELADA: {
      color: 'red',
      icon: 'x-circle',
      label: 'Cancelada',
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      borderClass: 'border-red-200'
    },
    REPROGRAMADA: {
      color: 'purple',
      icon: 'refresh',
      label: 'Reprogramada',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-200'
    },
    NO_ASISTIO: {
      color: 'gray',
      icon: 'user-remove',
      label: 'No Asistió',
      bgClass: 'bg-gray-50',
      textClass: 'text-gray-700',
      borderClass: 'border-gray-200'
    }
  };

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== MÉTODOS PRINCIPALES ==========
  cargarDatosIniciales(): void {
    this.cargando.set(true);
    this.error.set(null);
    
    Promise.all([
      this.cargarPsicologos(),
      this.cargarTodosLosDiagnosticos()
    ])
    .then(() => {
      const psicologo = this.psicologoActual();
      if (psicologo) {
        this.formModel.psicologoId = psicologo.id;
        this.programarFormModel.psicologoId = psicologo.id;
      }
      this.cargarAtencionesFiltradas();
    })
    .catch(err => {
      this.error.set(this.obtenerMensajeError(err));
      this.cargando.set(false);
    });
  }

  cargarAtencionesFiltradas(): void {
    this.cargando.set(true);
    
    const filtros: any = {
      page: this.page(),
      size: this.size()
    };

    // Estado
    const estado = this.filtroEstado();
    if (estado && estado !== 'TODAS') {
      if (estado === 'REPROGRAMADA') {
        filtros.reprogramada = 'true';
      } else {
        filtros.estadoAtencion = estado;
      }
    }

    // Nombre
    const nombre = this.filtroNombrePaciente().trim();
    if (nombre) {
      filtros.nombre = nombre;
    }

    // Fecha
    if (this.filtroHoy()) {
      filtros.fecha = new Date().toISOString().split('T')[0];
    } else if (this.filtroFecha().trim()) {
      filtros.fecha = this.filtroFecha().trim();
    }

    this.atencionService.filtrarAtenciones(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          try {
            let atencionesArray: any[] = [];
            if (Array.isArray(res?.content)) {
              atencionesArray = res.content;
            } else if (Array.isArray(res)) {
              atencionesArray = res;
            } else if (Array.isArray(res?.items)) {
              atencionesArray = res.items;
            }

            const atencionesAdaptadas = this.adaptarAtencionesBackend(atencionesArray);

            // Aplicar filtro adicional de REPROGRAMADA si es necesario
            let atencionesFiltradas = atencionesAdaptadas;
            if (estado === 'REPROGRAMADA') {
              atencionesFiltradas = atencionesFiltradas.filter(a => a.reprogramada === true);
            }

            // Establecer mensaje si no hay resultados
            if (atencionesFiltradas.length === 0) {
              if (estado && estado !== 'TODAS') {
                this.mensajeSinResultados.set(`No existen atenciones ${this.estadosConfig[estado]?.label?.toLowerCase() || 'en este estado'}. Pruebe con otro filtro.`);
              } else {
                this.mensajeSinResultados.set('No se encontraron atenciones con los filtros aplicados.');
              }
            } else {
              this.mensajeSinResultados.set('');
            }

            this.atenciones.set(atencionesFiltradas);
            this.totalPages.set(res.totalPages || 1);
            this.totalElements.set(res.totalElements || atencionesFiltradas.length);
            this.cargando.set(false);
          } catch (error) {
            console.error('Error al procesar atenciones:', error);
            this.error.set('Error al procesar los datos de atenciones');
            this.cargando.set(false);
          }
        },
        error: (err) => {
          console.error('Error al cargar atenciones:', err);
          this.error.set(this.obtenerMensajeError(err));
          this.cargando.set(false);
          this.mensajeSinResultados.set('Error al cargar las atenciones');
        }
      });
  }

  private adaptarAtencionesBackend(atenciones: any[]): any[] {
    return atenciones.map(a => {
      const reprogramada = !!a.reprogramada || !!a.reprogramadoPor;
      
      return {
        ...a,
        id: a.id || 0,
        personalMilitarId: a.personalMilitarId || a.pacienteId || null,
        psicologoId: a.psicologoId || null,
        fechaAtencion: a.fechaAtencion || a.fecha || '',
        horaInicio: a.horaInicio || '09:00',
        horaFin: a.horaFin || '10:00',
        tipoAtencion: a.tipoAtencion || 'PRESENCIAL',
        tipoConsulta: a.tipoConsulta || 'PRIMERA_VEZ',
        motivoConsulta: a.motivoConsulta || '',
        estado: a.estado === 'ACTIVO' ? 'EN_CURSO' : (a.estado || 'PROGRAMADA'),
        reprogramada: reprogramada,
        motivoReprogramacion: a.motivoReprogramacion || '',
        pacienteNombreCompleto: a.pacienteNombreCompleto || a.pacienteNombre || 
                               `${a.paciente?.nombres || ''} ${a.paciente?.apellidos || ''}`.trim() || 'Sin nombre',
        psicologoNombreCompleto: a.psicologoNombreCompleto || a.psicologoNombre || 
                                 `${a.psicologo?.nombres || ''} ${a.psicologo?.apellidos || ''}`.trim() || 'Sin asignar',
        pacienteGrado: a.pacienteGrado || a.paciente?.grado?.abreviatura || '',
        pacienteUnidadMilitar: a.pacienteUnidadMilitar || a.paciente?.unidadMilitar?.nombre || 'Sin unidad',
        diagnosticos: Array.isArray(a.diagnosticos) ? a.diagnosticos : [],
        anamnesis: a.anamnesis || '',
        examenMental: a.examenMental || '',
        impresionDiagnostica: a.impresionDiagnostica || '',
        planIntervencion: a.planIntervencion || '',
        recomendaciones: a.recomendaciones || '',
        derivacion: a.derivacion || '',
        proximaCita: a.proximaCita || null,
        observacionesProximaCita: a.observacionesProximaCita || ''
      };
    });
  }

  // ========== MÉTODOS DEL FORMULARIO PRINCIPAL ==========
  abrirModalCrear(estado: string = 'ABIERTA'): void {
    this.modoEdicion.set(false);
    this.modoProgramada.set(estado === 'PROGRAMADA');
    this.resetForm();
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  cerrarModalEliminar() {
    this.showEliminarModal.set(false);
  }

  asignarPaciente(paciente: PersonalMilitarDTO): void {
    this.pacienteSeleccionado = paciente;
    this.formModel.personalMilitarId = paciente?.id ?? null;
  }

  guardarAtencion(): void {
    const psicologo = this.psicologoActual();
    if (psicologo) {
      this.formModel.psicologoId = psicologo.id;
    }

    // Validaciones
    if (!this.formModel.personalMilitarId) {
      this.error.set('Debe seleccionar un paciente.');
      return;
    }

    if (!this.formModel.motivoConsulta) {
      this.error.set('El motivo de consulta es obligatorio.');
      return;
    }

    if (!this.formModel.fechaAtencion) {
      this.error.set('La fecha de atención es obligatoria.');
      return;
    }

    if (!this.formModel.horaInicio || !this.formModel.horaFin) {
      this.error.set('Las horas de inicio y fin son obligatorias.');
      return;
    }

    if (this.formModel.horaInicio >= this.formModel.horaFin) {
      this.error.set('La hora de fin debe ser mayor a la hora de inicio.');
      return;
    }

    this.formModel.estado = 'FINALIZADA';
    this.cargandoAccion.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const formData = { ...this.formModel };

    this.atencionService.crearAtencion(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (atencionGuardada) => {
          this.mensajeExito.set('✓ Atención creada correctamente');
          this.atenciones.update(list => [atencionGuardada, ...list]);

          setTimeout(() => {
            this.cerrarModal();
            this.cargarAtencionesFiltradas();
          }, 1500);
        },
        error: (err) => {
          this.error.set(this.obtenerMensajeError(err));
          this.cargandoAccion.set(false);
        },
        complete: () => {
          this.cargandoAccion.set(false);
        }
      });
  }

  guardarEnCurso(): void {
    const psicologo = this.psicologoActual();
    if (psicologo) {
      this.formModel.psicologoId = psicologo.id;
    }

    if (!this.formModel.personalMilitarId) {
      this.error.set('Debe seleccionar un paciente.');
      return;
    }

    if (!this.formModel.motivoConsulta) {
      this.error.set('El motivo de consulta es obligatorio.');
      return;
    }

    this.formModel.estado = 'EN_CURSO';
    this.cargandoAccion.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const formData = { ...this.formModel };

    this.atencionService.crearAtencion(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (atencionGuardada) => {
          this.mensajeExito.set('✓ Atención guardada en curso');
          this.atenciones.update(list => [atencionGuardada, ...list]);
          
          setTimeout(() => {
            this.cerrarModal();
            this.cargarAtencionesFiltradas();
          }, 1500);
        },
        error: (err) => {
          this.error.set(this.obtenerMensajeError(err));
          this.cargandoAccion.set(false);
        },
        complete: () => {
          this.cargandoAccion.set(false);
        }
      });
  }

  toggleDiagnostico(id: number): void {
    const currentIds = this.formModel.diagnosticoIds || [];
    const index = currentIds.indexOf(id);

    if (index > -1) {
      this.formModel.diagnosticoIds = currentIds.filter(i => i !== id);
    } else {
      this.formModel.diagnosticoIds = [...currentIds, id];
      this.cie10SearchTerm.set('');
    }
  }

  getDiagnosticoCIE10ById(id: number): CatalogoCIE10DTO | undefined {
    return this.todosDiagnosticosCIE10().find(d => d.id === id);
  }

  // ========== MÉTODOS DE PROGRAMACIÓN ==========
  programarAtencion(): void {
    this.showProgramarModal.set(true);
    this.programarError.set(null);
    this.programarMensajeExito.set(null);

    this.programarFormModel = {
      ...this.programarFormModel,
      psicologoId: this.psicologoActual()?.id ?? null,
      estado: 'PROGRAMADA'
    };

    this.programarPacienteSeleccionado = null;
  }

  cerrarProgramarModal(): void {
    this.showProgramarModal.set(false);
  }

  asignarPacienteProgramar(paciente: PersonalMilitarDTO): void {
    this.programarPacienteSeleccionado = paciente;
    this.programarFormModel.personalMilitarId = paciente?.id ?? null;
  }

  guardarAtencionProgramada(): void {
    const psicologo = this.psicologoActual();
    if (!this.programarFormModel.psicologoId && psicologo) {
      this.programarFormModel.psicologoId = psicologo.id;
    }

    if (!this.programarFormModel.personalMilitarId) {
      this.programarError.set('Debe seleccionar un paciente.');
      return;
    }

    if (!this.programarFormModel.motivoConsulta) {
      this.programarError.set('El motivo de consulta es obligatorio.');
      return;
    }

    if (!this.programarFormModel.fechaAtencion || !this.programarFormModel.horaInicio || !this.programarFormModel.horaFin) {
      this.programarError.set('Fecha y hora son obligatorias.');
      return;
    }

    if (this.programarFormModel.horaInicio >= this.programarFormModel.horaFin) {
      this.programarError.set('La hora de fin debe ser mayor a la hora de inicio.');
      return;
    }

    this.programarFormModel.estado = 'PROGRAMADA';
    this.programarCargandoAccion.set(true);
    this.programarError.set(null);
    this.programarMensajeExito.set(null);

    const formData = { ...this.programarFormModel };

    this.atencionService.crearAtencion(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (atencionGuardada) => {
          this.programarMensajeExito.set('✓ Atención programada correctamente');
          this.atenciones.update(list => [atencionGuardada, ...list]);

          setTimeout(() => {
            this.showProgramarModal.set(false);
            this.cargarAtencionesFiltradas();
          }, 1000);
        },
        error: (err) => {
          this.programarError.set(this.obtenerMensajeError(err));
          this.programarCargandoAccion.set(false);
        },
        complete: () => {
          this.programarCargandoAccion.set(false);
        }
      });
  }

  cerrarProgramarSeguimientoModal(): void {
    this.showProgramarSeguimientoModal.set(false);
  }

  // ========== MÉTODOS DE DETALLE ==========
  verDetalle(atencionId: number): void {
    this.detalleAtencionId.set(atencionId);
    this.showDetalleModal.set(true);
  }

  cerrarDetalleModal(): void {
    this.showDetalleModal.set(false);
    this.detalleAtencionId.set(null);
  }

  // ========== PAGINACIÓN ==========
  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 0 || nuevaPagina >= this.totalPages()) return;
    this.page.set(nuevaPagina);
    this.cargarAtencionesFiltradas();
  }

  cambiarTamanioPagina(nuevoSize: number): void {
    this.size.set(Number(nuevoSize));
    this.page.set(0);
    this.cargarAtencionesFiltradas();
  }

  getAtencionStart(): number {
    if (this.totalElements() === 0) return 0;
    return (this.page() * this.size()) + 1;
  }

  getAtencionEnd(): number {
    return Math.min((this.page() + 1) * this.size(), this.totalElements());
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('TODAS');
    this.filtroNombrePaciente.set('');
    this.filtroFecha.set('');
    this.filtroHoy.set(false);
    this.page.set(0);
    this.cargarAtencionesFiltradas();
  }

  // ========== MÉTODOS AUXILIARES ==========
  private cargarPsicologos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.psicologosService.list()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (psicologos: any[]) => {
            this.psicologos.set(psicologos);
            resolve();
          },
          error: reject
        });
    });
  }

  private cargarTodosLosDiagnosticos(): Promise<void> {
    this.cargandoDiagnosticos.set(true);
    return new Promise((resolve, reject) => {
      this.catalogosService.listarCIE10({ soloActivos: true, size: 1000 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            const items = res.items || res.content || res || [];
            this.todosDiagnosticosCIE10.set(items);
            this.diagnosticosFiltrados.set(items.slice(0, 50));
            this.cargandoDiagnosticos.set(false);
            resolve();
          },
          error: (err) => {
            this.cargandoDiagnosticos.set(false);
            reject(err);
          }
        });
    });
  }

  private resetForm(): void {
    this.pacienteSeleccionado = null;
    this.formModel = {
      personalMilitarId: null,
      psicologoId: this.psicologoActual()?.id ?? null,
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
      estado: this.modoProgramada() ? 'PROGRAMADA' : 'EN_CURSO',
      razonCancelacion: ''
    };
  }

  obtenerMensajeError(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.message) {
      return err.message;
    }
    if (err?.status === 0) {
      return 'Error de conexión con el servidor. Verifique su conexión a internet.';
    }
    if (err?.status === 401) {
      return 'No autorizado. Por favor inicie sesión nuevamente.';
    }
    if (err?.status === 403) {
      return 'No tiene permisos para realizar esta acción.';
    }
    if (err?.status === 404) {
      return 'Recurso no encontrado.';
    }
    if (err?.status === 500) {
      return 'Error interno del servidor.';
    }
    return 'Ocurrió un error inesperado. Por favor intente nuevamente.';
  }

  confirmarEliminarAtencion() {
    // Implementa la lógica para eliminar la atención seleccionada
    // Por ejemplo, puedes llamar a un servicio y luego cerrar el modal
    this.cargandoAccion.set(true);
    // Aquí deberías tener la lógica para obtener el id de la atención a eliminar
    // y llamar al servicio correspondiente. Ejemplo:
    // this.atencionService.eliminarAtencion(this.atencionAEliminarId)
    //   .subscribe({
    //     next: () => {
    //       this.cargandoAccion.set(false);
    //       this.showEliminarModal.set(false);
    //       // Recargar lista si es necesario
    //     },
    //     error: (err) => {
    //       this.cargandoAccion.set(false);
    //       this.error.set('Error al eliminar la atención');
    //     }
    //   });
    this.showEliminarModal.set(false);
    this.cargandoAccion.set(false);
  }

  guardarSeguimientoProgramado() {
    // Implementa la lógica para guardar el seguimiento programado
    // Por ejemplo, puedes llamar a un servicio y luego cerrar el modal
    this.programarSeguimientoCargandoAccion.set(true);
    // Aquí deberías tener la lógica para enviar los datos del seguimiento
    // this.atencionService.guardarSeguimiento(this.programarSeguimientoFormModel)
    //   .subscribe({
    //     next: () => {
    //       this.programarSeguimientoCargandoAccion.set(false);
    //       this.showProgramarSeguimientoModal.set(false);
    //       // Recargar lista si es necesario
    //     },
    //     error: (err) => {
    //       this.programarSeguimientoCargandoAccion.set(false);
    //       this.programarSeguimientoError.set('Error al guardar el seguimiento');
    //     }
    //   });
    this.showProgramarSeguimientoModal.set(false);
    this.programarSeguimientoCargandoAccion.set(false);
  }
}