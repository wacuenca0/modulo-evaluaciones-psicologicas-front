import { ChangeDetectionStrategy, Component, DestroyRef, Input, Output, EventEmitter, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonalMilitarService } from '../../services/personal-militar.service';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FichasPsicologicasService } from '../../services/fichas-psicologicas.service';
import { FichaPsicologicaHistorialDTO } from '../../models/fichas-psicologicas.models';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface SearchState {
  mode: 'CEDULA' | 'APELLIDOS' | null;
  page: number;
  size: number;
  totalPages: number;
}

interface HistorialResumen {
  total: number;
  ultimaFecha: string | null;
  ultimaCondicion: string | null;
  ultimoEstado: string | null;
  cargando: boolean;
}

@Component({
  selector: 'app-personal-search',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './personal-search.component.html'
})
export class PersonalSearchComponent {
  @Input() modoAtenciones = false;
  @Output() verAtencion = new EventEmitter<PersonalMilitarDTO>();
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PersonalMilitarService);
  private readonly router = inject(Router);
  private readonly fichasService = inject(FichasPsicologicasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    cedula: ['', [Validators.maxLength(15)]],
    apellidos: ['', [Validators.maxLength(100)]]
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detail = signal<PersonalMilitarDTO | null>(null);
  readonly pageResult = signal<PersonalMilitarDTO[] | null>(null);
  readonly state = signal<SearchState>({ mode: null, page: 0, size: 10, totalPages: 0 });
  readonly sinResultados = signal(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly seleccionDestacadaId = signal<number | null>(null);
  readonly historialResumen = signal<Record<number, HistorialResumen>>({});

  readonly badgeBaseClass = 'rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

  readonly resultados = computed(() => {
    const mode = this.state().mode;
    if (mode === 'CEDULA') {
      const single = this.detail();
      return single ? [single] : [];
    }
    const paged = this.pageResult();
    return paged ?? [];
  });

  constructor() {
    this.resolverPersonaRegistrada();
  }

  esSeleccionDestacada(persona: PersonalMilitarDTO): boolean {
    const targetId = this.seleccionDestacadaId();
    if (typeof targetId !== 'number') {
      return false;
    }
    const personaId = this.idPara(persona);
    if (personaId !== null) {
      return Number(personaId) === Number(targetId);
    }
    const detalle = this.detail();
    if (!detalle?.cedula || !persona.cedula) {
      return false;
    }
    return detalle.cedula.trim() === persona.cedula.trim();
  }

  idPara(persona: PersonalMilitarDTO): number | null {
    if (typeof persona.id === 'number') {
      return Number(persona.id);
    }
    const parsed = Number((persona.id as unknown) ?? Number.NaN);
    return Number.isFinite(parsed) ? Number(parsed) : null;
  }

  private resolverPersonaRegistrada() {
    const navigationState = (this.router.lastSuccessfulNavigation?.extras?.state ?? {}) as Record<string, unknown>;
    const historyState = (globalThis.history?.state ?? {}) as Record<string, unknown>;
    const personaRegistrada = (navigationState['personaRegistrada'] ?? historyState['personaRegistrada'] ?? null) as PersonalMilitarDTO | null;

    if (!personaRegistrada) {
      return;
    }

    const normalizada = this.normalizarPersona(personaRegistrada);
    this.detail.set(normalizada);
    this.pageResult.set(null);
    this.state.set({ mode: 'CEDULA', page: 0, size: 1, totalPages: 1 });
    this.sinResultados.set(false);
    this.error.set(null);
    this.form.patchValue({ cedula: normalizada.cedula ?? '' });

    const id = this.idPara(normalizada);
    if (id !== null) {
      this.seleccionDestacadaId.set(Number(id));
    }

    this.mensajeExito.set('Personal registrado correctamente. Revisa su historial clinico para continuar.');
    this.actualizarResumenes([normalizada]);
    this.clearPersonaRegistradaState();
  }

  private clearPersonaRegistradaState() {
    const historyState = globalThis.history?.state;
    if (!historyState || typeof historyState !== 'object') {
      return;
    }
    const currentState = { ...(historyState as Record<string, unknown>) };
    if (!('personaRegistrada' in currentState)) {
      return;
    }
    delete currentState['personaRegistrada'];
    if ('mensaje' in currentState) {
      delete currentState['mensaje'];
    }
    if ('exitoRegistro' in currentState) {
      delete currentState['exitoRegistro'];
    }
    const href = globalThis.location?.href ?? '/';
    globalThis.history?.replaceState?.(currentState, '', href);
  }

  buscar(pageOverride?: number) {
    this.error.set(null);
    this.sinResultados.set(false);
    this.mensajeExito.set(null);
    this.seleccionDestacadaId.set(null);
    this.historialResumen.set({});
    const raw = this.form.getRawValue();
    const cedula = (raw.cedula ?? '').trim();
    const apellidos = (raw.apellidos ?? '').trim();

    if (!cedula && !apellidos) {
      this.error.set('Debes ingresar cédula o apellidos para realizar la búsqueda.');
      this.detail.set(null);
      this.pageResult.set(null);
      return;
    }

    if (cedula && apellidos) {
      this.error.set('Ingresa solo un criterio de búsqueda a la vez.');
      this.detail.set(null);
      this.pageResult.set(null);
      return;
    }

    if (cedula) {
      this.ejecutarBusquedaCedula(cedula);
      return;
    }

    if (apellidos) {
      const page = typeof pageOverride === 'number' ? pageOverride : 0;
      this.ejecutarBusquedaApellidos(apellidos, page);
    }
  }

  nombrePara(persona: PersonalMilitarDTO): string {
    const apellidosNombres = persona.apellidosNombres?.trim();
    if (apellidosNombres?.length) {
      return apellidosNombres;
    }
    const apellidos = persona.apellidos?.trim();
    const nombres = persona.nombres?.trim();
    if (apellidos && nombres) {
      return `${apellidos}, ${nombres}`;
    }
    if (apellidos) {
      return apellidos;
    }
    if (nombres) {
      return nombres;
    }
    return 'Sin nombres registrados';
  }

  resumenPara(persona: PersonalMilitarDTO): HistorialResumen | null {
    const id = this.idPara(persona);
    if (id === null) {
      return null;
    }
    return this.historialResumen()[id] ?? null;
  }

  tipoPersonaLabel(persona: PersonalMilitarDTO): string {
    const tipo = persona.tipoPersona?.trim();
    if (tipo?.length) {
      return tipo;
    }
    if (persona.esMilitar) {
      return 'Militar';
    }
    return 'Dependiente/Civil';
  }

  servicioEtiqueta(persona: PersonalMilitarDTO): string {
    const etiquetas = [persona.servicioActivo ? 'activo' : null, persona.servicioPasivo ? 'pasivo' : null]
      .filter((etiqueta): etiqueta is string => !!etiqueta);
    if (!etiquetas.length) {
      return 'Sin registro';
    }
    if (etiquetas.length === 2) {
      return 'Activo y pasivo';
    }
    const etiqueta = etiquetas[0];
    return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  }

  mostrarDato(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    return 'No registrado';
  }

  contactoLabel(persona: PersonalMilitarDTO): string {
    const telefono = persona.telefono?.trim();
    const celular = persona.celular?.trim();
    const email = persona.email?.trim();
    const partes = [telefono, celular, email].filter((part): part is string => !!part && part.length > 0);
    return partes.length ? partes.join(' · ') : 'Sin informacion de contacto';
  }

  direccionLabel(persona: PersonalMilitarDTO): string {
    const provincia = persona.provincia?.trim();
    const canton = persona.canton?.trim();
    const parroquia = persona.parroquia?.trim();
    const barrio = persona.barrioSector?.trim();
    const piezas = [provincia, canton, parroquia, barrio].filter((parte): parte is string => !!parte && parte.length > 0);
    return piezas.length ? piezas.join(' · ') : 'Sin direccion registrada';
  }

  fechaResumen(value?: string | null): string {
    if (!value) {
      return 'Sin registro';
    }
    const instante = new Date(value);
    if (!Number.isFinite(instante.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(instante);
  }

  condicionLabel(value?: string | null): string {
    if (!value) {
      return 'Sin condicion';
    }
    const normalized = value.trim().toUpperCase();
    if (normalized.includes('ALTA')) {
      return 'Alta';
    }
    if (normalized.includes('SEGUIMIENTO')) {
      return 'Seguimiento';
    }
    if (normalized.includes('TRANSFERENCIA') || normalized.includes('DERIV')) {
      return 'Transferencia';
    }
    return value.trim();
  }

  estadoLabel(value?: string | null): string {
    if (!value) {
      return 'Sin estado';
    }
    const normalized = value.trim().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  paginaAnterior() {
    const current = this.state();
    if (current.mode !== 'APELLIDOS' || current.page === 0) return;
    this.buscar(current.page - 1);
  }

  siguientePagina() {
    const current = this.state();
    if (current.mode !== 'APELLIDOS') return;
    if (current.page + 1 >= current.totalPages) return;
    this.buscar(current.page + 1);
  }

  limpiar() {
    this.form.reset({ cedula: '', apellidos: '' });
    this.error.set(null);
    this.detail.set(null);
    this.pageResult.set(null);
    this.state.set({ mode: null, page: 0, size: 10, totalPages: 0 });
    this.sinResultados.set(false);
    this.mensajeExito.set(null);
    this.seleccionDestacadaId.set(null);
    this.historialResumen.set({});
  }

  verDetalle(persona: PersonalMilitarDTO) {
    if (this.modoAtenciones) {
      this.verAtencion.emit(this.normalizarPersona(persona));
      return;
    }
    const identifier = typeof persona.id === 'number' ? persona.id : Number(persona.id ?? Number.NaN);
    if (!Number.isFinite(identifier)) {
      this.error.set('El registro seleccionado no contiene identificador valido.');
      return;
    }
    this.router.navigate(['/psicologo/personal', Number(identifier)], {
      state: { persona: this.normalizarPersona(persona) }
    }).catch(() => {});
  }

  irAlHistorial(persona: PersonalMilitarDTO) {
    const identifier = typeof persona.id === 'number' ? persona.id : Number(persona.id ?? Number.NaN);
    if (!Number.isFinite(identifier)) {
      this.error.set('No se puede abrir el historial sin un identificador valido.');
      return;
    }
    this.router.navigate(['/psicologo/personal', Number(identifier), 'historial'], {
      state: { persona: this.normalizarPersona(persona) }
    }).catch(() => {});
  }

  private ejecutarBusquedaCedula(cedula: string) {
    this.loading.set(true);
    this.state.set({ mode: 'CEDULA', page: 0, size: 1, totalPages: 1 });
    this.pageResult.set(null);
    this.detail.set(null);
    this.sinResultados.set(false);
    this.historialResumen.set({});

    // Usar la ruta /buscar-cedula/{cedula} (ajustado a método real del servicio)
    this.service.buscarPorCedula(cedula)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (persona: PersonalMilitarDTO) => {
          this.loading.set(false);
          this.sinResultados.set(false);
          const normalizada = persona ? this.normalizarPersona(persona) : null;
          this.detail.set(normalizada);
          if (normalizada) {
            this.actualizarResumenes([normalizada]);
            const id = this.idPara(normalizada);
            if (id !== null) {
              this.seleccionDestacadaId.set(Number(id));
            }
          } else {
            this.historialResumen.set({});
            this.seleccionDestacadaId.set(null);
          }
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.detail.set(null);
          this.historialResumen.set({});
          this.error.set(this.resolverError(err));
          this.sinResultados.set(true);
          this.seleccionDestacadaId.set(null);
        }
      });
  }

  private ejecutarBusquedaApellidos(apellidos: string, page: number) {
    this.loading.set(true);
    this.detail.set(null);
    this.historialResumen.set({});
      this.service.buscarPorTermino(apellidos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: PersonalMilitarDTO[]) => {
          this.loading.set(false);
          this.pageResult.set(res);
          this.state.set({ mode: 'APELLIDOS', page, size: res.length, totalPages: 1 });
          this.error.set(null);
          this.sinResultados.set(false);
          this.seleccionDestacadaId.set(null);
          this.actualizarResumenes(res);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.pageResult.set(null);
          this.state.set({ mode: 'APELLIDOS', page, size: this.state().size, totalPages: 0 });
          this.error.set(this.resolverError(err));
          this.historialResumen.set({});
          this.sinResultados.set(true);
        }
      });
  }

  private actualizarResumenes(personas: PersonalMilitarDTO[]) {
    const ids = personas
      .map((persona) => this.idPara(persona))
      .filter((id): id is number => id !== null);

    if (!ids.length) {
      this.historialResumen.set({});
      return;
    }

    const estadoInicial: Record<number, HistorialResumen> = {};
    ids.forEach((id) => {
      estadoInicial[id] = { total: 0, ultimaFecha: null, ultimaCondicion: null, ultimoEstado: null, cargando: true };
    });
    this.historialResumen.set(estadoInicial);

    const solicitudes = ids.map((id) =>
      this.fichasService.obtenerHistorial(id).pipe(
        map((items) => ({ id, resumen: this.crearResumen(items ?? []) })),
        catchError(() => of({ id, resumen: this.crearResumen([]) }))
      )
    );

    forkJoin(solicitudes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((respuestas) => {
        const actual = { ...this.historialResumen() };
        respuestas.forEach(({ id, resumen }) => {
          actual[id] = { ...resumen, cargando: false };
        });
        this.historialResumen.set(actual);
      });
  }

  private crearResumen(items: readonly FichaPsicologicaHistorialDTO[]): HistorialResumen {
    if (!items?.length) {
      return { total: 0, ultimaFecha: null, ultimaCondicion: null, ultimoEstado: null, cargando: false };
    }
    const ordenados = [...items].sort((a, b) => {
      const fechaA = a?.fechaEvaluacion ? new Date(a.fechaEvaluacion).getTime() : Number.NaN;
      const fechaB = b?.fechaEvaluacion ? new Date(b.fechaEvaluacion).getTime() : Number.NaN;
      return (Number.isFinite(fechaB) ? fechaB : 0) - (Number.isFinite(fechaA) ? fechaA : 0);
    });
    const ultimo = ordenados[0];
    return {
      total: items.length,
      ultimaFecha: ultimo?.fechaEvaluacion ?? null,
      ultimaCondicion: ultimo?.condicion ?? null,
      ultimoEstado: ultimo?.estado ?? null,
      cargando: false
    };
  }

  private resolverError(err: unknown): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        return 'No se encontro personal con los datos proporcionados.';
      }
      if (status === 400) {
        return 'Busqueda invalida. Revisa los criterios ingresados.';
      }
    }
    if (err && typeof err === 'object' && 'error' in err) {
      const anyErr = err as { error?: any };
      const message = typeof anyErr.error === 'string' ? anyErr.error : anyErr.error?.message;
      if (typeof message === 'string' && message.trim().length) {
        return message;
      }
    }
    return 'Ocurrio un error al realizar la busqueda.';
  }

  private normalizarPersona(persona: PersonalMilitarDTO): PersonalMilitarDTO {
    const apellidosNombres = persona.apellidosNombres?.trim();
    if (apellidosNombres?.length) {
      return persona;
    }
    return {
      ...persona,
      apellidosNombres: this.nombrePara(persona)
    };
  }

}
