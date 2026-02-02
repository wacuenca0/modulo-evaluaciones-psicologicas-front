import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AtencionDetalleComponent } from './detalle/atencion-detalle.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PacienteAutocompleteComponent } from '../../shared/paciente-autocomplete.component';
import { ProgramarAtencionModalComponent } from './programar-atencion-modal.component';
import { ProgramarSeguimientoModalComponent } from './programar-seguimiento-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AtencionPsicologicaService } from '../../services/atenciones-psicologicas.service';
import { PersonalMilitarService } from '../../services/personal-militar.service';
import { PsicologosService } from '../../services/psicologos.service';
import { CatalogosService } from '../../services/catalogos.service';
import { AuthService } from '../../services/auth.service';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';
import { AtencionPsicologicaRequestDTO, AtencionPsicologicaResponseDTO } from '../../models/atenciones-psicologicas.models';
import { of } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-atenciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PacienteAutocompleteComponent,
    ProgramarAtencionModalComponent,
    ProgramarSeguimientoModalComponent,
    AtencionDetalleComponent
  ],
  templateUrl: './atenciones.component.html',
  styleUrls: ['./atenciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtencionesComponent implements OnInit {
  // Inyección de dependencias
  private readonly atencionService = inject(AtencionPsicologicaService);
  private readonly personalService = inject(PersonalMilitarService);
  private readonly psicologosService = inject(PsicologosService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  // Estados de la UI
  readonly cargando = signal(true);
  readonly cargandoAccion = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Datos principales
  readonly atenciones = signal<AtencionPsicologicaResponseDTO[]>([]);
  readonly psicologos = signal<any[]>([]);
  readonly todosDiagnosticosCIE10 = signal<CatalogoCIE10DTO[]>([]);
  readonly cargandoDiagnosticos = signal(false);

  // Filtros de la lista principal - SOLO ESTOS 3 FILTROS
  readonly filtroEstado = signal<string>('TODAS');  // Valor por defecto "TODAS"
  readonly filtroNombrePaciente = signal<string>('');  // Buscar por nombre
  readonly filtroFecha = signal<string>('');  // Fecha específica

  // --- PAGINACIÓN ---
  readonly page = signal(0);
  readonly size = signal(10);  // Cambié de 6 a 10 que es lo que usa tu backend
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);

  // --- Modal Principal (Crear/Editar) ---
  readonly showModal = signal(false);
  readonly modoEdicion = signal(false);
  readonly atencionSeleccionada = signal<AtencionPsicologicaResponseDTO | null>(null);
  readonly modoProgramada = signal(false);

  // Modelo del formulario
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

  // --- Búsqueda de Diagnósticos CIE-10 ---
  readonly cie10SearchTerm = signal<string>('');
  readonly diagnosticosFiltrados = signal<CatalogoCIE10DTO[]>([]);

  // --- Modal de Cancelación ---
  readonly showCancelModal = signal(false);
  readonly atencionParaCancelar = signal<AtencionPsicologicaResponseDTO | null>(null);
  readonly razonCancelacion = signal('');

  // Información del usuario y paciente
  readonly psicologoActual = computed(() => {
    const user = this.authService.getCurrentUser?.();
    if (!user) return null;
    
    const psicologo = this.psicologos().find(p => p.id === user.id || p.username === user.username);
    if (psicologo) {
      return { 
        id: psicologo.id, 
        nombre: `${psicologo.nombres || ''} ${psicologo.apellidos || ''}`.trim() 
      };
    }
    return { id: user.id, nombre: user.fullName || user.username || '' };
  });

  pacienteSeleccionado: PersonalMilitarDTO | null = null;

  // --- Modal Programar Atención ---
  showProgramarModal = signal(false);
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
  programarPacienteSeleccionado: PersonalMilitarDTO | null = null;
  programarCargandoAccion = signal(false);
  programarError = signal<string | null>(null);
  programarMensajeExito = signal<string | null>(null);

  // --- Modal Programar Seguimiento ---
  showProgramarSeguimientoModal = signal(false);
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
  programarSeguimientoCargandoAccion = signal(false);
  programarSeguimientoError = signal<string | null>(null);
  programarSeguimientoMensajeExito = signal<string | null>(null);

  // --- Modal Eliminar ---
  showDeleteModal = signal(false);
  atencionIdParaEliminar = signal<number | null>(null);

  // --- Modal Detalle ---
  showDetalleModal = signal(false);
  detalleAtencionId = signal<number | null>(null);

  // Mapeo de fichaId a tipoEvaluacion
  tipoEvaluacionPorFicha: Record<number, string> = {};

  // --- NUEVAS PROPIEDADES SOLICITADAS ---
  programarSeguimientoPsicologo: { id: number | null, nombre: string } | null = null;
  programarSeguimientoDiagnosticos: any[] = [];

  constructor() {
    // Configurar búsqueda CIE10
    this.setupCie10Search();

    // Efecto para recargar solo cuando cambian los filtros
    let filtrosPrevios = {
      estado: this.filtroEstado(),
      nombre: this.filtroNombrePaciente(),
      fecha: this.filtroFecha()
    };
    effect(() => {
      const estado = this.filtroEstado();
      const nombre = this.filtroNombrePaciente();
      const fecha = this.filtroFecha();
      if (
        estado !== filtrosPrevios.estado ||
        nombre !== filtrosPrevios.nombre ||
        fecha !== filtrosPrevios.fecha
      ) {
        this.page.set(0);
        this.cargarAtencionesFiltradas();
        filtrosPrevios = { estado, nombre, fecha };
      }
    }, { allowSignalWrites: true });

    // Efecto para recargar cuando cambia la página
    effect(() => {
      this.page();
      this.cargarAtencionesFiltradas();
    });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
    
    // Verificar si viene de programar seguimiento
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['programarSeguimiento'] === 'true' && queryParams['fichaId']) {
      const fichaId = Number(queryParams['fichaId']);
      const pacienteId = queryParams['pacienteId'] ? Number(queryParams['pacienteId']) : undefined;
      
      setTimeout(() => {
        this.abrirProgramarSeguimiento(fichaId, pacienteId);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }, 500);
    }
  }

  // ========== MÉTODOS DE CARGA DE DATOS ==========

  private cargarDatosIniciales(): void {
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

  // ******* CORRECCIÓN PRINCIPAL: MÉTODO DE FILTRADO *******
  private cargarAtencionesFiltradas(): void {
    this.cargando.set(true);

    // Preparar los parámetros para el filtro
    // El backend espera: estadoAtencion, nombre, fecha, page, size
    const filtros: any = {
      page: this.page(),
      size: this.size()
    };

    // Solo agregar filtros si tienen valor
    if (this.filtroEstado() && this.filtroEstado() !== 'TODAS') {
      filtros.estadoAtencion = this.filtroEstado();
    }

    if (this.filtroNombrePaciente() && this.filtroNombrePaciente().trim() !== '') {
      filtros.nombre = this.filtroNombrePaciente();
    }

    if (this.filtroFecha() && this.filtroFecha().trim() !== '') {
      filtros.fecha = this.filtroFecha();
    }

    this.atencionService.filtrarAtenciones(filtros).subscribe({
      next: (res: any) => {
        const atencionesAdaptadas = this.adaptarAtencionesBackend(res.content || []);
        this.atenciones.set(atencionesAdaptadas);
        this.totalPages.set(res.totalPages || 1);
        this.totalElements.set(res.totalElements || 0);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(this.obtenerMensajeError(err));
        this.cargando.set(false);
      }
    });
  }

  // Adapta los datos del backend para que la UI siempre tenga los campos y valores esperados
  private adaptarAtencionesBackend(atenciones: any[]): AtencionPsicologicaResponseDTO[] {
    return atenciones.map(a => ({
      ...a,
      estado: a.estado === 'ABIERTA' ? 'PROGRAMADA' : a.estado,
      psicologoNombreCompleto: a.psicologoNombreCompleto || a.psicologoNombre || '',
      pacienteNombreCompleto: a.pacienteNombreCompleto || a.pacienteNombre || '',
      pacienteGrado: a.pacienteGrado || '',
      pacienteUnidadMilitar: a.pacienteUnidadMilitar || '',
      diagnosticos: a.diagnosticos || [],
      // Puedes agregar otros campos que puedan faltar aquí
    }));
  }

  private cargarPsicologos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.psicologosService.list().subscribe({
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
      this.catalogosService.listarCIE10({ soloActivos: true, size: 1000 }).subscribe({
        next: (res) => {
          this.todosDiagnosticosCIE10.set(res.items);
          this.diagnosticosFiltrados.set(res.items.slice(0, 50));
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

  private setupCie10Search() {
    toObservable(this.cie10SearchTerm).pipe(
      debounceTime(300),
      tap(() => this.cargandoDiagnosticos.set(true)),
      switchMap(term => {
        const lowerTerm = term.toLowerCase();
        if (!lowerTerm) {
          this.diagnosticosFiltrados.set(this.todosDiagnosticosCIE10().slice(0, 50));
          return of(null);
        }
        const filtrados = this.todosDiagnosticosCIE10().filter(d =>
          d.descripcion.toLowerCase().includes(lowerTerm) ||
          d.codigo.toLowerCase().includes(lowerTerm)
        );
        this.diagnosticosFiltrados.set(filtrados.slice(0, 50));
        return of(null);
      })
    ).subscribe();
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

  getPageNumbers(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i);
  }

  getAtencionStart(): number {
    if (this.totalElements() === 0) return 0;
    return (this.page() * this.size()) + 1;
  }

  getAtencionEnd(): number {
    return Math.min((this.page() + 1) * this.size(), this.totalElements());
  }

  // ========== MÉTODOS PARA TIPO DE EVALUACIÓN (mantenidos) ==========

  obtenerTipoEvaluacion(fichaId: number): string {
    if (!fichaId) return 'No disponible';
    const tipo = this.tipoEvaluacionPorFicha[fichaId];
    if (!tipo) {
      setTimeout(() => {
        this.cargarTipoEvaluacionIndividual(fichaId);
      }, 0);
      return 'Cargando...';
    }
    return tipo;
  }

  private cargarTipoEvaluacionIndividual(fichaId: number) {
    if (this.tipoEvaluacionPorFicha[fichaId] && this.tipoEvaluacionPorFicha[fichaId] !== 'Cargando...') {
      return;
    }
    
    this.tipoEvaluacionPorFicha[fichaId] = 'Cargando...';
    
    this.http.get<any>(`http://localhost:8080/api/fichas-psicologicas/tipo-evaluacion/${fichaId}`)
      .subscribe({
        next: (data) => {
          this.tipoEvaluacionPorFicha[fichaId] = data?.tipoEvaluacion || 'No especificado';
          this.atenciones.update(current => [...current]);
        },
        error: (error) => {
          console.error('Error al cargar tipo de evaluación:', error);
          this.tipoEvaluacionPorFicha[fichaId] = 'Error al cargar';
          this.atenciones.update(current => [...current]);
        }
      });
  }

  // ========== MÉTODOS DEL MODAL PRINCIPAL (mantenidos) ==========

  abrirModalCrear(modo: 'ABIERTA' | 'PROGRAMADA' = 'ABIERTA'): void {
    this.modoEdicion.set(false);
    this.atencionSeleccionada.set(null);
    this.modoProgramada.set(modo === 'PROGRAMADA');
    this.resetForm();
    this.showModal.set(true);
  }

  abrirModalEditar(atencion: AtencionPsicologicaResponseDTO): void {
    this.modoEdicion.set(true);
    this.atencionSeleccionada.set(atencion);
    this.formModel = {
      ...this.getInitialFormModel(),
      ...atencion,
      diagnosticoIds: atencion.diagnosticos?.map(d => d.id) || [],
      personalMilitarId: atencion.personalMilitarId,
      psicologoId: atencion.psicologoId
    };
    
    this.personalService.obtenerPorId(atencion.personalMilitarId).subscribe({
      next: paciente => this.pacienteSeleccionado = paciente,
      error: err => console.error('Error al cargar paciente:', err)
    });
    
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  private getInitialFormModel(): AtencionPsicologicaRequestDTO {
    return {
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
  }

  resetForm(): void {
    this.pacienteSeleccionado = null;
    this.formModel = this.getInitialFormModel();
    
    const psicologo = this.psicologoActual();
    if (psicologo) {
      this.formModel.psicologoId = psicologo.id;
    }
    
    if (this.modoProgramada()) {
      this.formModel.estado = 'PROGRAMADA';
    } else {
      this.formModel.estado = 'EN_CURSO';
    }
  }

  asignarPaciente(paciente: PersonalMilitarDTO): void {
    this.pacienteSeleccionado = paciente;
    this.formModel.personalMilitarId = paciente?.id ?? null;
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

  guardarAtencion(): void {
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

    this.formModel.estado = 'FINALIZADA';
    this.cargandoAccion.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);
    
    const formData = { ...this.formModel };

    const accion = this.modoEdicion()
      ? this.atencionService.actualizarAtencion(this.atencionSeleccionada()!.id, formData)
      : this.atencionService.crearAtencion(formData);

    accion.subscribe({
      next: (atencionGuardada) => {
        this.mensajeExito.set(`Atención ${this.modoEdicion() ? 'actualizada' : 'creada'} correctamente`);
        
        if (this.modoEdicion()) {
          this.atenciones.update(list => list.map(a => a.id === atencionGuardada.id ? atencionGuardada : a));
        } else {
          this.atenciones.update(list => [atencionGuardada, ...list]);
        }
        
        this.cerrarModal();
      },
      error: (err) => {
        this.error.set(this.obtenerMensajeError(err));
        this.cargandoAccion.set(false);
      },
      complete: () => this.cargandoAccion.set(false)
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
    
    this.atencionService.crearAtencion(formData).subscribe({
      next: (atencionGuardada) => {
        this.mensajeExito.set('Atención guardada en curso');
        this.atenciones.update(list => [atencionGuardada, ...list]);
        this.cerrarModal();
      },
      error: (err) => {
        this.error.set(this.obtenerMensajeError(err));
        this.cargandoAccion.set(false);
      },
      complete: () => this.cargandoAccion.set(false)
    });
  }

  // ========== MODAL PROGRAMAR ATENCIÓN (mantenido) ==========

  programarAtencion(): void {
    this.showProgramarModal.set(true);
    this.programarError.set(null);
    this.programarMensajeExito.set(null);
    
    this.programarFormModel = {
      ...this.getInitialFormModel(),
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
    if (!this.programarFormModel.psicologoId) {
      this.programarFormModel.psicologoId = this.psicologoActual()?.id ?? null;
    }
    
    if (!this.programarFormModel.personalMilitarId) {
      this.programarError.set('Debe seleccionar un paciente.');
      return;
    }
    
    if (!this.programarFormModel.motivoConsulta) {
      this.programarError.set('El motivo de consulta es obligatorio.');
      return;
    }

    this.programarFormModel.estado = 'PROGRAMADA';
    this.programarCargandoAccion.set(true);
    this.programarError.set(null);
    this.programarMensajeExito.set(null);
    
    const formData = { ...this.programarFormModel };
    
    this.atencionService.crearAtencion(formData).subscribe({
      next: (atencionGuardada) => {
        this.programarMensajeExito.set('Atención programada correctamente');
        this.atenciones.update(list => [atencionGuardada, ...list]);
        
        setTimeout(() => {
          this.showProgramarModal.set(false);
        }, 1000);
      },
      error: (err) => {
        this.programarError.set(this.obtenerMensajeError(err));
        this.programarCargandoAccion.set(false);
      },
      complete: () => this.programarCargandoAccion.set(false)
    });
  }

  // ========== MODAL PROGRAMAR SEGUIMIENTO (mantenido) ==========

  async abrirProgramarSeguimiento(fichaPsicologicaId: number, pacienteId?: number): Promise<void> {
    this.showProgramarSeguimientoModal.set(true);
    this.programarSeguimientoError.set(null);
    this.programarSeguimientoMensajeExito.set(null);
    
    let tipoEvaluacion = '';
    
    try {
      const resp = await fetch(
        `http://localhost:8080/api/fichas-psicologicas/tipo-evaluacion/${fichaPsicologicaId}`
      );
      
      if (resp.ok) {
        const data = await resp.json();
        tipoEvaluacion = data?.tipoEvaluacion || '';
      } else if (resp.status === 401) {
        this.programarSeguimientoError.set('No autorizado (401). Por favor inicie sesión nuevamente.');
      } else {
        this.programarSeguimientoError.set(`Error ${resp.status}: ${resp.statusText}`);
      }
    } catch (e) {
      console.error('Error de red:', e);
      this.programarSeguimientoError.set('Error de red al consultar tipo de evaluación');
    }
    
    this.programarSeguimientoFormModel = {
      fichaPsicologicaId,
      tipoEvaluacion,
      psicologoId: this.psicologoActual()?.id ?? null,
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
      razonCancelacion: ''
    };
    
    if (pacienteId) {
      this.personalService.obtenerPorId(pacienteId).subscribe({
        next: paciente => console.log('Paciente cargado para seguimiento:', paciente),
        error: err => console.error('Error al cargar paciente:', err)
      });
    }
  }

  cerrarProgramarSeguimientoModal(): void {
    this.showProgramarSeguimientoModal.set(false);
  }

  guardarSeguimientoProgramado(): void {
    if (!this.programarSeguimientoFormModel.fichaPsicologicaId) {
      this.programarSeguimientoError.set('No se ha especificado la ficha psicológica.');
      return;
    }
    
    if (!this.programarSeguimientoFormModel.motivoConsulta) {
      this.programarSeguimientoError.set('El motivo de consulta es obligatorio.');
      return;
    }

    this.programarSeguimientoCargandoAccion.set(true);
    this.programarSeguimientoError.set(null);
    this.programarSeguimientoMensajeExito.set(null);
    
    const formData: AtencionPsicologicaRequestDTO = {
      personalMilitarId: null,
      psicologoId: this.programarSeguimientoFormModel.psicologoId || this.psicologoActual()?.id,
      fechaAtencion: this.programarSeguimientoFormModel.fechaAtencion,
      horaInicio: this.programarSeguimientoFormModel.horaInicio,
      horaFin: this.programarSeguimientoFormModel.horaFin,
      tipoAtencion: this.programarSeguimientoFormModel.tipoAtencion,
      tipoConsulta: 'SEGUIMIENTO',
      motivoConsulta: this.programarSeguimientoFormModel.motivoConsulta,
      anamnesis: '',
      examenMental: '',
      impresionDiagnostica: '',
      planIntervencion: this.programarSeguimientoFormModel.planIntervencion,
      recomendaciones: this.programarSeguimientoFormModel.recomendaciones,
      derivacion: '',
      diagnosticoIds: this.programarSeguimientoFormModel.diagnosticoIds,
      proximaCita: this.programarSeguimientoFormModel.proximaCita,
      observacionesProximaCita: this.programarSeguimientoFormModel.observacionesProximaCita,
      estado: 'PROGRAMADA',
      razonCancelacion: this.programarSeguimientoFormModel.razonCancelacion,
      fichaPsicologicaId: this.programarSeguimientoFormModel.fichaPsicologicaId
    };
    
    this.atencionService.crearAtencion(formData).subscribe({
      next: (seguimientoGuardado) => {
        this.programarSeguimientoMensajeExito.set('Seguimiento programado correctamente');
        this.atenciones.update(list => [seguimientoGuardado, ...list]);
        
        setTimeout(() => {
          this.showProgramarSeguimientoModal.set(false);
        }, 1500);
      },
      error: (err) => {
        this.programarSeguimientoError.set(this.obtenerMensajeError(err));
        this.programarSeguimientoCargandoAccion.set(false);
      },
      complete: () => this.programarSeguimientoCargandoAccion.set(false)
    });
  }

  // ========== MODAL CANCELACIÓN (mantenido) ==========

  abrirModalCancelar(atencion: AtencionPsicologicaResponseDTO): void {
    this.atencionParaCancelar.set(atencion);
    this.razonCancelacion.set('');
    this.showCancelModal.set(true);
  }

  cerrarModalCancelar(): void {
    this.showCancelModal.set(false);
    this.atencionParaCancelar.set(null);
    this.razonCancelacion.set('');
  }

  confirmarCancelacion(): void {
    const atencion = this.atencionParaCancelar();
    const razon = this.razonCancelacion();
    
    if (!atencion || !razon.trim()) {
      return;
    }

    this.cargandoAccion.set(true);
    this.error.set(null);
    
    this.atencionService.cancelarAtencion(atencion.id, razon).subscribe({
      next: (atencionCancelada) => {
        this.atenciones.update(list => list.map(a => a.id === atencionCancelada.id ? atencionCancelada : a));
        this.mensajeExito.set('Atención cancelada correctamente.');
        setTimeout(() => this.mensajeExito.set(null), 3000);
        this.cerrarModalCancelar();
      },
      error: (err) => {
        this.error.set(this.obtenerMensajeError(err));
        this.cargandoAccion.set(false);
      },
      complete: () => this.cargandoAccion.set(false)
    });
  }

  // ========== MODAL ELIMINAR (mantenido) ==========

  abrirModalEliminar(id: number): void {
    this.atencionIdParaEliminar.set(id);
    this.showDeleteModal.set(true);
  }

  cerrarModalEliminar(): void {
    this.showDeleteModal.set(false);
    this.atencionIdParaEliminar.set(null);
  }

  confirmarEliminarAtencion(): void {
    const id = this.atencionIdParaEliminar();
    if (!id) return;

    this.cargandoAccion.set(true);
    this.error.set(null);
    
    this.atencionService.eliminarAtencion(id).subscribe({
      next: () => {
        this.atenciones.update(list => list.filter(a => a.id !== id));
        this.mensajeExito.set('Atención eliminada correctamente.');
        setTimeout(() => this.mensajeExito.set(null), 3000);
        this.cerrarModalEliminar();
      },
      error: (err) => {
        this.error.set(this.obtenerMensajeError(err));
        this.cerrarModalEliminar();
      },
      complete: () => this.cargandoAccion.set(false)
    });
  }

  // ========== MODAL DETALLE (mantenido) ==========

  verDetalle(atencionId: number): void {
    this.detalleAtencionId.set(atencionId);
    this.showDetalleModal.set(true);
  }

  cerrarDetalleModal(): void {
    this.showDetalleModal.set(false);
    this.detalleAtencionId.set(null);
  }

  // ========== ACCIONES RÁPIDAS (mantenidas) ==========

  finalizarAtencion(atencion: AtencionPsicologicaResponseDTO): void {
    if (!confirm('¿Está seguro de finalizar esta atención? Esta acción no se puede deshacer.')) return;
    
    const request: AtencionPsicologicaRequestDTO = {
      ...this.getInitialFormModel(),
      ...atencion,
      diagnosticoIds: atencion.diagnosticos?.map(d => d.id) || [],
      estado: 'FINALIZADA'
    };
    
    this.realizarAccion(
      this.atencionService.finalizarAtencion(atencion.id, request), 
      'Atención finalizada correctamente.'
    );
  }

  registrarNoAsistencia(atencion: AtencionPsicologicaResponseDTO): void {
    const request: AtencionPsicologicaRequestDTO = {
      ...this.getInitialFormModel(),
      ...atencion,
      diagnosticoIds: atencion.diagnosticos?.map(d => d.id) || [],
      estado: 'NO_ASISTIO'
    };
    
    this.realizarAccion(
      this.atencionService.actualizarAtencion(atencion.id, request),
      'No asistencia registrada.'
    );
  }

  private realizarAccion(accion$: any, mensajeExito: string): void {
    this.cargandoAccion.set(true);
    this.error.set(null);
    
    accion$.subscribe({
      next: (actualizada: AtencionPsicologicaResponseDTO) => {
        this.atenciones.update(list => list.map(a => a.id === actualizada.id ? actualizada : a));
        this.mensajeExito.set(mensajeExito);
        setTimeout(() => this.mensajeExito.set(null), 3000);
      },
      error: (err: any) => this.error.set(this.obtenerMensajeError(err)),
      complete: () => this.cargandoAccion.set(false)
    });
  }

  // ========== UTILIDADES ==========

  limpiarFiltros(): void {
    this.filtroEstado.set('TODAS');
    this.filtroNombrePaciente.set('');
    this.filtroFecha.set('');
    this.page.set(0);
    this.cargarAtencionesFiltradas();
  }

  obtenerMensajeError = (err: any): string => 
    err?.error?.message || err?.message || 'Ocurrió un error inesperado.';

  getEstadoColor = (estado: string): string => {
    const clases = {
      PROGRAMADA: 'bg-blue-100 text-blue-800 border-blue-200',
      EN_CURSO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      FINALIZADA: 'bg-green-100 text-green-800 border-green-200',
      CANCELADA: 'bg-red-100 text-red-800 border-red-200',
      NO_ASISTIO: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return clases[estado as keyof typeof clases] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  getEstadoIcon(estado: string): string {
    const iconos = {
      PROGRAMADA: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
      EN_CURSO: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      FINALIZADA: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      CANCELADA: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      NO_ASISTIO: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z'
    };
    return iconos[estado as keyof typeof iconos] || 'M8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z';
  };

  formatearFecha = (fecha: string): string => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  public tipoConsultaBadge(tipo: string): { icon: string; color: string; label: string } {
    switch (tipo) {
      case 'PRIMERA_VEZ':
        return {
          icon: 'star',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Primera Vez'
        };
      case 'SEGUIMIENTO':
        return {
          icon: 'refresh',
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Seguimiento'
        };
      case 'URGENCIA':
        return {
          icon: 'warning',
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'Urgencia'
        };
      case 'CONTROL':
        return {
          icon: 'check',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Control'
        };
      default:
        return {
          icon: 'question',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: tipo || 'Desconocido'
        };
    }
  }

  // ========== COMPUTED PROPERTIES ==========

  readonly atencionesFiltradas = computed(() => {
    return this.atenciones();
  });

  readonly atencionesProgramadasHoy = computed(() => {
    const hoy = new Date().toISOString().split('T')[0];
    return this.atenciones().filter(a => a.fechaAtencion === hoy && a.estado === 'PROGRAMADA' && a.activo).length;
  });

  readonly atencionesFinalizadas = computed(() => 
    this.atenciones().filter(a => a.estado === 'FINALIZADA').length
  );

  readonly estadosDisponibles = computed(() => 
    ['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA', 'NO_ASISTIO']
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
}