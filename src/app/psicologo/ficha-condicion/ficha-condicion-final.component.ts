import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FichasPsicologicasService } from '../../services/fichas-psicologicas.service';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { FichaCondicionFinal, FichaCondicionFinalPayload, FichaPsicologicaHistorialDTO, FICHA_CONDICION_FINAL_OPCIONES } from '../../models/fichas-psicologicas.models';
import { CatalogosService } from '../../services/catalogos.service';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';

type AgendaItem = { titulo: string; detalle: string };

@Component({
  selector: 'app-ficha-condicion-final',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Gestion clinica</p>
        <h1 class="text-3xl font-semibold text-slate-900">Condicion clinica final</h1>
        @if (persona()) {
          <p class="text-sm text-slate-500">
            Selecciona la condicion final para {{ persona()?.apellidos || 'Sin apellidos' }}, {{ persona()?.nombres || 'Sin nombres' }}.
          </p>
        } @else {
          <p class="text-sm text-slate-500">Selecciona la condicion final registrada en la ficha psicologica.</p>
        }
      </header>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <a routerLink="/psicologo/personal" class="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">Volver a la busqueda</a>
        @if (success()) {
          <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Condicion registrada</span>
        }
      </div>

      @if (error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <section class="space-y-4">
          @for (option of opciones; track option.value) {
            <label class="flex cursor-pointer flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400">
              <div class="flex items-center gap-3">
                <input type="radio" [value]="option.value" formControlName="condicion" class="h-4 w-4 text-slate-900 focus:ring-slate-900" />
                <div>
                  <p class="text-base font-semibold text-slate-900">{{ option.label }}</p>
                  <p class="text-sm text-slate-500">{{ option.description }}</p>
                </div>
              </div>
            </label>
          }
          @if (hasError('condicion')) {
            <p class="text-xs text-red-600">Selecciona una condicion para continuar.</p>
          }
        </section>

        @if (requiereDiagnostico()) {
          <section class="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label class="block text-sm font-semibold text-slate-700">
                Buscar en catalogo CIE-10
                <input type="search" [value]="cie10Query()" (input)="onCie10Search($any($event.target).value)" autocomplete="off"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring" placeholder="Ej.: F33" />
              </label>
              <p class="mt-1 text-xs text-slate-500">Escribe al menos 3 caracteres para buscar un diagnostico CIE-10.</p>
            </div>

            @if (cie10Error()) {
              <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{{ cie10Error() }}</div>
            }

            @if (cie10Loading()) {
              <p class="text-xs text-slate-500">Buscando diagnosticos...</p>
            }

            @if (!cie10Loading()) {
              @let resultados = cie10Resultados();
              @if (resultados.length) {
                <ul class="space-y-2">
                  @for (item of resultados; track item.id ?? item.codigo) {
                    <li>
                      <button type="button" (click)="seleccionarDiagnostico(item)"
                        class="flex w-full flex-col gap-1 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm transition hover:border-slate-400">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <span class="text-sm font-semibold text-slate-900">{{ item.codigo }}</span>
                          @if (item?.nivel !== null && item?.nivel !== undefined) {
                            <span class="text-xs text-slate-500">Nivel {{ item?.nivel }}</span>
                          }
                        </div>
                        @if (item?.nombre) {
                          <p class="text-sm text-slate-700">{{ item?.nombre }}</p>
                        }
                        @if (item?.descripcion) {
                          <p class="text-xs text-slate-600">{{ item?.descripcion }}</p>
                        }
                        @if (item?.categoriaPadre) {
                          <p class="text-[11px] text-slate-500">Categoria: {{ item?.categoriaPadre }}</p>
                        }
                      </button>
                    </li>
                  }
                </ul>
              } @else if (cie10Query().trim().length >= 3 && !cie10Error()) {
                <p class="text-xs text-slate-500">No se encontraron coincidencias con la busqueda realizada.</p>
              }
            }

            @if (diagnosticoSeleccionado()) {
              @let seleccionado = diagnosticoSeleccionado();
              <article class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnostico seleccionado</p>
                  <p class="text-sm font-semibold text-slate-900">{{ seleccionado?.codigo }}</p>
                  @if (seleccionado?.nombre) {
                    <p class="text-sm text-slate-700">{{ seleccionado?.nombre }}</p>
                  }
                  @if (seleccionado?.descripcion) {
                    <p class="text-xs text-slate-600">{{ seleccionado?.descripcion }}</p>
                  }
                  <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    @if (seleccionado?.nivel !== null && seleccionado?.nivel !== undefined) {
                      <span>Nivel {{ seleccionado?.nivel }}</span>
                    }
                  </div>
                </div>
                <button type="button" (click)="limpiarDiagnosticoSeleccionado()" class="text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
                  Cambiar
                </button>
              </article>
            }

            @if (hasError('cie10Codigo') || hasError('cie10Nombre') || hasError('cie10Descripcion') || hasError('cie10Nivel')) {
              <p class="text-xs text-red-600">Selecciona un diagnostico del catalogo CIE-10.</p>
            }
          </section>
        }

        @if (agendaRecomendada().length) {
          <section class="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header class="text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda sugerida</header>
            <ul class="space-y-2">
              @for (item of agendaRecomendada(); track item.titulo) {
                <li class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-sm font-semibold text-slate-900">{{ item.titulo }}</p>
                  <p class="text-xs text-slate-600">{{ item.detalle }}</p>
                </li>
              }
            </ul>
          </section>
        }

        <footer class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="text-xs text-slate-500">
            @if (requiereDiagnostico()) {
              <span>La condicion seleccionada requiere registrar un diagnostico CIE-10.</span>
            } @else {
              <span>"No presenta psicopatologia" no requiere diagnostico adicional.</span>
            }
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="submit"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              [disabled]="loading()">
              {{ loading() ? 'Guardando...' : 'Confirmar condicion' }}
            </button>
          </div>
        </footer>
      </form>
    </section>
  `
})
export class FichaCondicionFinalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(FichasPsicologicasService);
  private readonly catalogos = inject(CatalogosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly opciones = FICHA_CONDICION_FINAL_OPCIONES;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly persona = signal<PersonalMilitarDTO | null>(null);
  private readonly personalId = signal<number | null>(null);

  private readonly fichaId = signal<number | null>(null);

  readonly form = this.fb.group({
    condicion: ['ALTA', Validators.required],
    cie10Codigo: ['', []],
    cie10Nombre: ['', []],
    cie10Descripcion: ['', []],
    cie10CategoriaPadre: ['', []],
    cie10Nivel: ['', []]
  });

  private readonly condicionSeleccionada = signal<FichaCondicionFinal>('ALTA');
  readonly requiereDiagnostico = computed(() => {
    const condicion = this.condicionSeleccionada();
    return condicion === 'SEGUIMIENTO' || condicion === 'TRANSFERENCIA';
  });
  readonly cie10Query = signal('');
  readonly cie10Resultados = signal<readonly CatalogoCIE10DTO[]>([]);
  readonly cie10Loading = signal(false);
  readonly cie10Error = signal<string | null>(null);
  readonly diagnosticoSeleccionado = signal<CatalogoCIE10DTO | null>(null);
  readonly cie10Catalogo = signal<readonly CatalogoCIE10DTO[]>([]);
  readonly cie10CatalogoLoaded = signal(false);
  private readonly agendaConfig: Record<FichaCondicionFinal, ReadonlyArray<AgendaItem>> = {
    ALTA: [],
    SEGUIMIENTO: [
      { titulo: 'Control inicial (30 dias)', detalle: 'Programar una cita de seguimiento dentro de los proximos 30 dias.' },
      { titulo: 'Monitoreo trimestral', detalle: 'Mantener controles cada 90 dias hasta evidenciar estabilidad.' }
    ],
    TRANSFERENCIA: [
      { titulo: 'Coordinacion con unidad receptora', detalle: 'Generar cita con la unidad receptora dentro de los proximos 14 dias.' },
      { titulo: 'Verificacion de traslado', detalle: 'Confirmar seguimiento en la unidad receptora despues de 60 dias.' }
    ]
  };
  readonly agendaRecomendada = computed(() => this.agendaConfig[this.condicionSeleccionada()] ?? []);
  private cie10SearchHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const navigationState = (globalThis.history?.state ?? {}) as Record<string, unknown>;
    this.inicializarDesdeEstado(navigationState);

    const idParam = Number(this.route.snapshot.paramMap.get('fichaId') ?? Number.NaN);
    if (Number.isFinite(idParam)) {
      this.fichaId.set(Number(idParam));
      if (!Number.isFinite(this.personalId())) {
        this.cargarFichaContext(Number(idParam));
      }
    } else {
      this.error.set('No se recibio un identificador valido de ficha psicologica.');
    }

    const initialCondicion = this.normalizeCondicion(this.form.controls.condicion.value) ?? 'ALTA';
    this.condicionSeleccionada.set(initialCondicion);

    this.form.controls.condicion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      const condicion = this.normalizeCondicion(value) ?? 'ALTA';
      this.condicionSeleccionada.set(condicion);
      this.applyConditionalValidators(condicion);
    });

    this.applyConditionalValidators(initialCondicion);

    this.destroyRef.onDestroy(() => {
      if (this.cie10SearchHandle) {
        clearTimeout(this.cie10SearchHandle);
        this.cie10SearchHandle = null;
      }
    });
  }

  hasError(controlName: 'condicion' | 'cie10Codigo' | 'cie10Nombre' | 'cie10Descripcion' | 'cie10Nivel'): boolean {
    const control = this.form.controls[controlName];
    if (!control) {
      return false;
    }
    return control.invalid && (control.touched || control.dirty);
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const fichaId = this.fichaId();
    if (!Number.isFinite(fichaId)) {
      this.error.set('No se puede registrar la condicion sin identificar la ficha.');
      return;
    }

    const condicion = this.form.controls.condicion.value as FichaCondicionFinal;
    const confirmacion = this.buildConfirmacion(condicion);
    if (!globalThis.confirm(confirmacion)) {
      return;
    }

    const payload = this.buildPayload(condicion);
    if (!payload) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.service.registrarCondicionFinal(Number(fichaId), payload).subscribe({
      next: () => {
        this.loading.set(false);
        const destino = this.personalId();
        if (Number.isFinite(destino)) {
          this.redirigirAHistorial(Number(destino), this.buildCondicionMensaje(condicion));
        } else {
          this.success.set(true);
          this.form.disable();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.resolveError(err));
      }
    });
  }

  onCie10Search(rawValue = '') {
    const value = rawValue;
    const query = value.trim();
    this.cie10Query.set(value);
    this.cie10Error.set(null);

    if (this.cie10SearchHandle) {
      clearTimeout(this.cie10SearchHandle);
      this.cie10SearchHandle = null;
    }

    const catalogoPreviamenteCargado = this.cie10CatalogoLoaded();
    if (!catalogoPreviamenteCargado) {
      this.ensureCatalogoCargado();
    }

    if (query.length < 3) {
      if (catalogoPreviamenteCargado) {
        const locales = this.filtrarCatalogoLocal(query);
        this.cie10Resultados.set(locales);
        this.cie10Loading.set(false);
      }
      return;
    }

    this.cie10Loading.set(true);
    const currentQuery = query;
    this.cie10SearchHandle = setTimeout(() => {
      this.catalogos.buscarCIE10(currentQuery).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (items) => {
          if (this.cie10Query().trim() !== currentQuery) {
            return;
          }
          const listado = Array.isArray(items) ? items : [];
          this.cie10Resultados.set(listado);
          this.cie10Loading.set(false);
        },
        error: () => {
          if (this.cie10Query().trim() !== currentQuery) {
            return;
          }
          this.cie10Resultados.set(this.filtrarCatalogoLocal(currentQuery));
          this.cie10Loading.set(false);
          this.cie10Error.set('No se pudo ejecutar la busqueda en el catalogo CIE-10. Intenta nuevamente.');
        }
      });
    }, 300);
  }

  seleccionarDiagnostico(item: CatalogoCIE10DTO) {
    if (!item) {
      return;
    }
    this.diagnosticoSeleccionado.set(item);
    this.form.patchValue(
      {
        cie10Codigo: item.codigo ?? '',
        cie10Nombre: item.nombre ?? '',
        cie10Descripcion: item.descripcion ?? '',
        cie10CategoriaPadre: item.categoriaPadre ?? '',
        cie10Nivel: item.nivel != null ? String(item.nivel) : ''
      },
      { emitEvent: false }
    );
    this.form.controls.cie10Codigo.markAsDirty();
    this.form.controls.cie10Nombre.markAsDirty();
    this.form.controls.cie10Descripcion.markAsDirty();
    this.form.controls.cie10CategoriaPadre.markAsDirty();
    this.form.controls.cie10Nivel.markAsDirty();
    this.form.controls.cie10Codigo.markAsTouched();
    this.form.controls.cie10Nombre.markAsTouched();
    this.form.controls.cie10Descripcion.markAsTouched();
    this.form.controls.cie10CategoriaPadre.markAsTouched();
    this.form.controls.cie10Nivel.markAsTouched();
    this.form.controls.cie10Codigo.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Nombre.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Descripcion.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10CategoriaPadre.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Nivel.updateValueAndValidity({ emitEvent: false });
    this.cie10Loading.set(false);
    this.cie10Resultados.set([]);
    this.cie10Query.set(this.formatDiagnosticoResumen(item));
  }

  limpiarDiagnosticoSeleccionado() {
    this.diagnosticoSeleccionado.set(null);
    this.form.patchValue(
      { cie10Codigo: '', cie10Nombre: '', cie10Descripcion: '', cie10CategoriaPadre: '', cie10Nivel: '' },
      { emitEvent: false }
    );
    this.form.controls.cie10Codigo.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Nombre.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Descripcion.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10CategoriaPadre.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cie10Nivel.updateValueAndValidity({ emitEvent: false });
    if (this.requiereDiagnostico()) {
      this.cie10Query.set('');
      if (this.cie10CatalogoLoaded()) {
        this.cie10Resultados.set(this.filtrarCatalogoLocal(''));
        this.cie10Loading.set(false);
      } else {
        this.ensureCatalogoCargado();
      }
    } else {
      this.cie10Resultados.set([]);
    }
  }

  private normalizeCondicion(value: unknown): FichaCondicionFinal | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized.length) {
      return null;
    }
    if (normalized === 'ALTA' || normalized === 'NO PRESENTA PSICOPATOLOGIA') {
      return 'ALTA';
    }
    if (normalized === 'SEGUIMIENTO') {
      return 'SEGUIMIENTO';
    }
    if (normalized === 'TRANSFERENCIA') {
      return 'TRANSFERENCIA';
    }
    return null;
  }

  private ensureCatalogoCargado() {
    if (this.cie10CatalogoLoaded()) {
      this.cie10Resultados.set(this.filtrarCatalogoLocal(this.cie10Query()));
      return;
    }
    this.cie10Loading.set(true);
    this.catalogos.listarCIE10({ soloActivos: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        const listado = Array.isArray(items) ? items : [];
        this.cie10Catalogo.set(listado);
        this.cie10CatalogoLoaded.set(true);
        this.cie10Resultados.set(this.filtrarCatalogoLocal(this.cie10Query()));
        this.cie10Loading.set(false);
      },
      error: () => {
        this.cie10Catalogo.set([]);
        this.cie10CatalogoLoaded.set(false);
        this.cie10Resultados.set([]);
        this.cie10Loading.set(false);
        this.cie10Error.set('No se pudo cargar el catalogo CIE-10. Intenta nuevamente.');
      }
    });
  }

  private applyConditionalValidators(value: FichaCondicionFinal | '') {
    const codigoControl = this.form.controls.cie10Codigo;
    const nombreControl = this.form.controls.cie10Nombre;
    const descripcionControl = this.form.controls.cie10Descripcion;
    const categoriaControl = this.form.controls.cie10CategoriaPadre;
    const nivelControl = this.form.controls.cie10Nivel;
    const requiereDiagnostico = value === 'SEGUIMIENTO' || value === 'TRANSFERENCIA';

    if (requiereDiagnostico) {
      codigoControl.setValidators([Validators.required]);
      nombreControl.setValidators([Validators.required]);
      descripcionControl.setValidators([Validators.required]);
      nivelControl.setValidators([Validators.required]);
      nombreControl.enable({ emitEvent: false });
      categoriaControl.enable({ emitEvent: false });
      nivelControl.enable({ emitEvent: false });
      this.ensureCatalogoCargado();
    } else {
      codigoControl.clearValidators();
      nombreControl.clearValidators();
      descripcionControl.clearValidators();
      nivelControl.clearValidators();
      this.limpiarDiagnosticoSeleccionado();
      this.cie10Query.set('');
      this.cie10Resultados.set([]);
      this.cie10Error.set(null);
      nombreControl.disable({ emitEvent: false });
      categoriaControl.disable({ emitEvent: false });
      nivelControl.disable({ emitEvent: false });
    }

    codigoControl.updateValueAndValidity({ emitEvent: false });
    nombreControl.updateValueAndValidity({ emitEvent: false });
    descripcionControl.updateValueAndValidity({ emitEvent: false });
    categoriaControl.updateValueAndValidity({ emitEvent: false });
    nivelControl.updateValueAndValidity({ emitEvent: false });
  }

  private filtrarCatalogoLocal(queryRaw: string): readonly CatalogoCIE10DTO[] {
    const catalogo = this.cie10Catalogo();
    if (!catalogo.length) {
      return [];
    }
    const ordenado = [...catalogo].sort((a, b) => {
      const codigoA = a.codigo?.toUpperCase() ?? '';
      const codigoB = b.codigo?.toUpperCase() ?? '';
      return codigoA.localeCompare(codigoB, undefined, { numeric: true, sensitivity: 'base' });
    });
    const query = queryRaw?.trim().toLowerCase() ?? '';
    if (!query.length) {
      return ordenado.slice(0, 200);
    }
    return ordenado
      .filter((item) => {
        const codigo = item.codigo?.toLowerCase() ?? '';
        const descripcion = item.descripcion?.toLowerCase() ?? '';
        const nombre = item.nombre?.toLowerCase() ?? '';
        const categoria = item.categoriaPadre?.toLowerCase() ?? '';
        return codigo.includes(query) || descripcion.includes(query) || nombre.includes(query) || categoria.includes(query);
      })
      .slice(0, 200);
  }

  private buildPayload(condicion: FichaCondicionFinal): FichaCondicionFinalPayload | null {
    if (condicion === 'ALTA') {
      return {
        condicion,
        diagnosticoCie10Id: null,
        diagnosticoCie10Codigo: null,
        diagnosticoCie10Nombre: null,
        diagnosticoCie10Descripcion: null,
        diagnosticoCie10CategoriaPadre: null,
        diagnosticoCie10Nivel: null,
        planFrecuencia: null,
        planTipoSesion: null,
        planDetalle: null,
        proximoSeguimiento: null,
        transferenciaUnidad: null,
        transferenciaObservacion: null
      };
    }

    const codigo = this.cleanRequiredText(this.form.controls.cie10Codigo.value);
    const nombre = this.cleanRequiredText(this.form.controls.cie10Nombre.value);
    const descripcion = this.cleanOptionalText(this.form.controls.cie10Descripcion.value);
    const categoriaPadre = this.cleanOptionalText(this.form.controls.cie10CategoriaPadre.value);
    const nivelValor = this.normalizeDiagnosticoNivel(this.form.controls.cie10Nivel.value);

    if (!codigo || !nombre || !descripcion) {
      this.error.set('Selecciona un diagnostico CIE-10 valido.');
      return null;
    }
    if (nivelValor === undefined || nivelValor === null) {
      this.error.set('No se pudo determinar el nivel del diagnostico. Vuelve a seleccionarlo.');
      return null;
    }

    const diagnostico = this.diagnosticoSeleccionado();
    const diagnosticoId = this.parseNumeric((diagnostico as { id?: unknown })?.id);
    if (diagnosticoId === null) {
      this.error.set('Selecciona un diagnostico del catalogo CIE-10 antes de continuar.');
      return null;
    }

    return {
      condicion,
      diagnosticoCie10Id: diagnosticoId,
      diagnosticoCie10Codigo: codigo,
      diagnosticoCie10Nombre: nombre,
      diagnosticoCie10Descripcion: descripcion,
      diagnosticoCie10CategoriaPadre: categoriaPadre,
      diagnosticoCie10Nivel: nivelValor,
      planFrecuencia: null,
      planTipoSesion: null,
      planDetalle: null,
      proximoSeguimiento: null,
      transferenciaUnidad: null,
      transferenciaObservacion: null
    };
  }

  private cleanRequiredText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private cleanOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizeDiagnosticoNivel(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const entero = Math.trunc(value);
      return entero < 0 ? 0 : entero;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return undefined;
      }
      const entero = Math.trunc(parsed);
      return entero < 0 ? 0 : entero;
    }
    return undefined;
  }

  private formatDiagnosticoResumen(item: CatalogoCIE10DTO | null): string {
    if (!item) {
      return '';
    }
    const partes: string[] = [];
    const codigo = typeof item.codigo === 'string' ? item.codigo.trim() : '';
    const nombre = typeof item.nombre === 'string' ? item.nombre.trim() : '';
    const descripcion = typeof item.descripcion === 'string' ? item.descripcion.trim() : '';
    const categoria = typeof item.categoriaPadre === 'string' ? item.categoriaPadre.trim() : '';
    const nivel = typeof item.nivel === 'number' && Number.isFinite(item.nivel) ? item.nivel : null;
    if (codigo) {
      partes.push(codigo);
    }
    if (nombre) {
      partes.push(nombre);
    }
    if (descripcion) {
      partes.push(descripcion);
    }
    if (categoria) {
      partes.push(`Categoria ${categoria}`);
    }
    if (nivel !== null) {
      partes.push(`Nivel ${nivel}`);
    }
    return partes.join(' · ');
  }

  private buildConfirmacion(condicion: FichaCondicionFinal): string {
    if (condicion === 'ALTA') {
      return 'Confirmas registrar "No presenta psicopatologia (Alta)"? Se limpiara cualquier diagnostico asociado.';
    }
    if (condicion === 'SEGUIMIENTO') {
      return 'Confirmas registrar "Seguimiento"? Se almacenara el diagnostico CIE-10 y se habilitara la agenda de controles.';
    }
    return 'Confirmas registrar "Transferencia"? Se compartira el diagnostico CIE-10 para la unidad receptora.';
  }

  private inicializarDesdeEstado(navigationState: Record<string, unknown>) {
    const statePersona = navigationState['persona'] as PersonalMilitarDTO | null | undefined;
    if (statePersona && typeof statePersona === 'object') {
      this.persona.set(statePersona);
      const personaId = typeof statePersona.id === 'number' ? statePersona.id : undefined;
      if (personaId !== undefined) {
        this.personalId.set(personaId);
      }
    }

    const personalIdFromState = this.parseNumeric(navigationState['personalId']);
    if (personalIdFromState !== null) {
      this.personalId.set(personalIdFromState);
    }

    const fichaState = navigationState['ficha'] as FichaPsicologicaHistorialDTO | undefined;
    if (fichaState && typeof fichaState === 'object') {
      const fichaPersonalId = this.parseNumeric((fichaState as { personalMilitarId?: unknown }).personalMilitarId);
      if (fichaPersonalId !== null) {
        this.personalId.set(fichaPersonalId);
      }
      if (!this.persona() && fichaState.personalMilitar) {
        this.persona.set(fichaState.personalMilitar);
      }
    }
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private buildCondicionMensaje(condicion: FichaCondicionFinal): string {
    if (condicion === 'ALTA') {
      return 'Condicion registrada como Alta.';
    }
    if (condicion === 'TRANSFERENCIA') {
      return 'Condicion registrada como Transferencia.';
    }
    return 'Condicion clinica y plan de seguimiento actualizados.';
  }

  private redirigirAHistorial(personalId: number, mensaje: string) {
    const extras = { state: { mensaje } } as const;
    this.router.navigate(['/psicologo/personal', personalId, 'historial'], extras).catch(() => {
      this.success.set(true);
      this.form.disable();
      this.error.set('Condicion registrada, pero no fue posible volver al historial automaticamente.');
    });
  }

  private cargarFichaContext(fichaId: number) {
    this.service.obtenerFichaCompleta(fichaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ficha) => {
        const personalId = this.parseNumeric(ficha?.personalMilitarId);
        if (personalId !== null) {
          this.personalId.set(personalId);
        }
        if (!this.persona() && ficha?.personalMilitar) {
          this.persona.set(ficha.personalMilitar);
        }
      },
      error: () => {
        // sin bloqueo: la ficha se puede registrar incluso sin datos adicionales
      }
    });
  }

  private resolveError(err: unknown): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        return 'No se encontro la ficha psicologica especificada.';
      }
      if (status === 403) {
        return 'No cuentas con permisos para actualizar esta ficha.';
      }
      if (status === 400) {
        return 'Los datos proporcionados para la condicion final son invalidos.';
      }
    }
    if (err && typeof err === 'object' && 'error' in err) {
      const anyErr = err as { error?: any };
      const message = typeof anyErr.error === 'string' ? anyErr.error : anyErr.error?.message;
      if (typeof message === 'string' && message.trim().length) {
        return message;
      }
    }
    return 'No fue posible registrar la condicion final. Intenta nuevamente.';
  }
}
