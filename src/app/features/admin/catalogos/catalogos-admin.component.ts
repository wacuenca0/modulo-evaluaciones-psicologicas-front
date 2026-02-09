
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogosService } from '../../../services/catalogos.service';
import { CatalogoCIE10DTO, UpdateCatalogoCIE10Payload } from '../../../models/catalogo.models';

interface CatalogoJerarquiaEntry {
  item: CatalogoCIE10DTO;
  depth: number;
}

interface JerarquiaResumen {
  titulo: string;
  detalle: string;
  ruta: string[];
  listo: boolean;
}

@Component({
  selector: 'app-catalogos-admin',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-col gap-2">
        <p class="text-xs uppercase tracking-widest text-slate-500">Configuración del sistema</p>
        <h1 class="text-2xl font-semibold text-slate-900">Catálogo CIE-10</h1>
        <p class="text-sm text-slate-500">Administra los diagnósticos clínicos permitidos en las fichas psicológicas.</p>
      </header>

      <section class="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <header class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">Diagnósticos registrados</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" [checked]="soloActivos()" (change)="toggleSoloActivos($any($event.target).checked)" class="h-4 w-4 rounded border border-slate-300 text-militar-primary focus:ring-militar-accent"/>
                Solo activos
              </label>
            </div>
            <div class="flex gap-3">
              <input
                #busquedaInput
                type="text"
                [value]="busqueda()"
                (input)="actualizarBusqueda(busquedaInput.value)"
                placeholder="Buscar por código, nombre o descripción"
                class="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-militar-accent focus:outline-none focus:ring"
              />
              <button type="button" (click)="recargar()" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">Buscar</button>
            </div>
          </header>

          @if (loading()) {
            <p class="py-6 text-center text-sm text-slate-500">Cargando diagnósticos...</p>
          } @else if (!cie10Listado().length) {
            <p class="py-6 text-center text-sm text-slate-500">No se encontraron diagnósticos que coincidan con la búsqueda.</p>
          } @else {
            <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200">
              @for (entrada of cie10Jerarquia(); track entrada.item.id ?? entrada.item.codigo) {
                <li class="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                  <div class="flex-1 flex flex-col gap-0.5" [style.paddingLeft.px]="entrada.depth * 20">
                    <span class="font-semibold text-slate-900">{{ entrada.item.codigo }} • {{ entrada.item.nombre }}</span>
                    <span class="text-xs text-slate-600">{{ entrada.item.descripcion || 'Sin descripción' }}</span>
                    <div class="text-[11px] text-slate-500 flex flex-wrap gap-2">
                      <span>{{ nivelEtiqueta(entrada.item.nivel) }}</span>
                      @if (entrada.item.categoriaPadre) {
                        <span>Depende de {{ entrada.item.categoriaPadre }}</span>
                      }
                      <span>{{ entrada.item.activo ? 'Activo' : 'Inactivo' }}</span>
                    </div>
                  </div>
                  <div class="ml-4 flex shrink-0 items-center gap-2">
                    <button type="button" (click)="prepararNuevoHijo(entrada.item)" class="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-militar-primary hover:text-militar-primary transition">Agregar hijo</button>
                    <button type="button" (click)="seleccionar(entrada.item)" class="rounded-md border border-militar-primary px-3 py-1 text-xs font-semibold text-militar-primary hover:bg-militar-primary hover:text-white transition">Editar</button>
                  </div>
                </li>
              }
            </ul>
          }
            <!-- Pagination Controls -->
            <div class="flex items-center justify-between mt-4" *ngIf="totalItems() > pageSize()">
              <div class="flex items-center gap-2">
                <button type="button" (click)="cambiarPagina(page() - 1)" [disabled]="page() === 0" class="px-2 py-1 border rounded disabled:opacity-50">Anterior</button>
                <span>Página {{ page() + 1 }} de {{ totalPaginas() }}</span>
                <button type="button" (click)="cambiarPagina(page() + 1)" [disabled]="page() >= totalPaginas() - 1" class="px-2 py-1 border rounded disabled:opacity-50">Siguiente</button>
              </div>
              <div class="flex items-center gap-2">
                <label for="pageSizeSelect">Por página:</label>
                <select id="pageSizeSelect" [value]="pageSize()" (change)="cambiarTamanioPagina($any($event.target).value)" class="border rounded px-2 py-1">
                  <option *ngFor="let size of [10, 20, 50, 100]" [value]="size">{{ size }}</option>
                </select>
              </div>
            </div>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <header class="flex flex-col gap-1">
            <h2 class="text-lg font-semibold text-slate-900">{{ modoEdicion() ? 'Editar diagnóstico' : 'Nuevo diagnóstico' }}</h2>
            <p class="text-xs text-slate-500">Completa los campos obligatorios según la especificación CIE-10.</p>
          </header>

          <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-3">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Código
              <input formControlName="codigo" type="text" maxlength="10" class="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-militar-accent focus:outline-none focus:ring" />
            </label>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nombre
              <input formControlName="nombre" type="text" maxlength="150" class="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-militar-accent focus:outline-none focus:ring" />
            </label>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descripción
              <textarea formControlName="descripcion" rows="4" class="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-militar-accent focus:outline-none focus:ring"></textarea>
            </label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Paso 1 · Selecciona dónde se ubicará el diagnóstico</span>
                <button type="button" (click)="prepararNuevoPrincipal()" class="text-xs font-semibold text-militar-primary hover:underline">Crear como principal</button>
              </div>
              <select formControlName="categoriaPadre" class="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-militar-accent focus:outline-none focus:ring">
                <option value="">Sin diagnóstico padre (nivel 0)</option>
                @for (op of opcionesCategoriaPadre(); track op.codigo) {
                  <option [value]="op.codigo ?? ''" [disabled]="op.disabled">{{ op.etiqueta }}</option>
                }
              </select>
              <p class="text-[11px] text-slate-500">Selecciona un diagnóstico existente para crear un hijo. El nivel se calculará automáticamente.</p>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p class="font-semibold text-slate-700">{{ resumenUbicacion().titulo }}</p>
              <p class="mt-1 text-[11px] text-slate-500">{{ resumenUbicacion().detalle }}</p>
              @if (resumenUbicacion().ruta.length) {
                <ul class="mt-2 space-y-1 text-[11px]">
                  @for (segmento of resumenUbicacion().ruta; track segmento) {
                    <li>• {{ segmento }}</li>
                  }
                </ul>
              }
            </div>

            <p class="text-[11px] text-slate-500">Nivel asignado automáticamente: {{ nivelDescripcion() }}</p>
            <label class="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" formControlName="activo" class="h-4 w-4 rounded border border-slate-300 text-militar-primary focus:ring-militar-accent" /> Activo
            </label>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="reset()" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">Cancelar</button>
              <button type="submit" [disabled]="saving()" class="rounded-md bg-militar-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-militar-accent transition disabled:cursor-not-allowed disabled:opacity-60">
                {{ saving() ? 'Guardando…' : (modoEdicion() ? 'Actualizar' : 'Crear') }}
              </button>
            </div>
          </form>
        </article>
      </section>
    </section>
  `
})
export class CatalogosAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogosService = inject(CatalogosService);

  readonly cie10Listado = signal<CatalogoCIE10DTO[]>([]);
  readonly totalItems = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly seleccionado = signal<CatalogoCIE10DTO | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly soloActivos = signal(true);
  readonly busqueda = signal('');
  readonly modoEdicion = computed(() => this.seleccionado() !== null);
  readonly categoriaPadreSeleccionada = signal<string | null>(null);
  readonly nombreDraft = signal('');
  readonly cie10Jerarquia = computed(() => this.buildJerarquia(this.cie10Listado()));
  readonly hijosPorCodigo = computed(() => this.buildChildrenMap(this.cie10Listado()));
  readonly depthPorCodigo = computed(() => {
    const mapa = new Map<string, number>();
    this.cie10Jerarquia().forEach(entry => {
      const codigo = this.sanitizeCodigo(entry.item.codigo);
      if (codigo) {
        mapa.set(codigo, entry.depth);
      }
    });
    return mapa;
  });
  readonly opcionesCategoriaPadre = computed(() => {
    const actuales = this.seleccionado();
    const codigoActual = actuales ? this.sanitizeCodigo(actuales.codigo) : null;
    return this.cie10Jerarquia().map(entry => {
      const codigo = this.sanitizeCodigo(entry.item.codigo);
      const indent = '— '.repeat(Math.max(0, entry.depth));
      return {
        codigo,
        etiqueta: `${indent}${entry.item.codigo} • ${entry.item.nombre}`,
        disabled: codigo !== null && codigo === codigoActual,
        item: entry.item
      };
    });
  });
  readonly nivelCalculado = computed(() => {
    const categoria = this.categoriaPadreSeleccionada();
    if (!categoria) {
      return 0;
    }
    const listado = this.cie10Listado();
    const parent = this.findByCodigo(categoria, listado) ?? null;
    if (parent?.nivel !== null && parent?.nivel !== undefined) {
      return parent.nivel + 1;
    }
    const depth = this.depthPorCodigo().get(this.sanitizeCodigo(categoria) ?? '') ?? 0;
    return depth + 1;
  });
  readonly nivelDescripcion = computed(() => {
    const nivel = this.nivelCalculado();
    const etiqueta = this.nivelEtiqueta(nivel);
    return `Nivel ${nivel} • ${etiqueta}`;
  });
  readonly resumenUbicacion = computed<JerarquiaResumen>(() => {
    const categoriaPadre = this.categoriaPadreSeleccionada();
    const parent = categoriaPadre ? this.findByCodigo(categoriaPadre, this.cie10Listado()) ?? null : null;
    const rutaPadres = this.buildRutaDesde(categoriaPadre);
    const nivel = this.nivelCalculado();
    const nombre = this.nombreDraft().trim() || 'Nuevo diagnóstico';

    if (this.modoEdicion() && this.seleccionado()) {
      const item = this.seleccionado()!;
      const rutaActual = this.buildRutaParaItem(item);
      return {
        titulo: `Editando ${item.codigo} • ${item.nombre}`,
        detalle: 'Actualiza los datos del diagnóstico y su posición en el catálogo.',
        ruta: rutaActual,
        listo: true
      };
    }

    if (!categoriaPadre) {
      return {
        titulo: 'Se registrará como diagnóstico principal (Nivel 0)',
        detalle: 'Este diagnóstico quedará disponible como raíz para que otros items se asocien.',
        ruta: ['Nivel 0 • Diagnóstico principal'],
        listo: true
      };
    }

    if (!parent) {
      return {
        titulo: 'Selecciona un diagnóstico existente como padre',
        detalle: 'La ubicación depende del diagnóstico seleccionado. Busca en la lista de la izquierda.',
        ruta: [],
        listo: false
      };
    }

    const rutaCompleta = [...rutaPadres, `Nivel ${nivel} • ${nombre}`];
    return {
      titulo: `Se registrará debajo de ${parent.codigo} • ${parent.nombre}`,
      detalle: 'La jerarquía se actualiza automáticamente para que el psicólogo identifique dónde registrar el diagnóstico.',
      ruta: rutaCompleta,
      listo: true
    };
  });

  form: FormGroup = this.fb.group({
    id: [null as number | null],
    categoriaPadre: [null as string | null],
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    nivel: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
    activo: [true]
  });

  constructor(/* ...otros inyectables... */) {
    // ...otros inits...
    const categoriaControl = this.form.get('categoriaPadre');
    categoriaControl?.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      this.categoriaPadreSeleccionada.set(this.sanitizeCodigo(valor));
      this.actualizarNivelSegunSeleccion();
    });

    const nombreControl = this.form.get('nombre');
    nombreControl?.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      this.nombreDraft.set(typeof valor === 'string' ? valor : '');
    });
  }

  ngOnInit(): void {
    this.recargar();
    this.form.get('nivel')?.disable({ emitEvent: false });
    const categoriaControl = this.form.get('categoriaPadre');
    const nombreControl = this.form.get('nombre');
    this.categoriaPadreSeleccionada.set(this.sanitizeCodigo(categoriaControl?.value ?? null));
    this.nombreDraft.set(typeof nombreControl?.value === 'string' ? nombreControl.value : '');
    this.actualizarNivelSegunSeleccion();
  }

  recargar(page: number = this.page(), size: number = this.pageSize()) {
    this.loading.set(true);
    this.catalogosService.listarCIE10({
      soloActivos: this.soloActivos(),
      search: this.busqueda().trim() || undefined,
      page,
      size
    }).subscribe({
      next: (result) => {
        this.cie10Listado.set(result.items);
        this.totalItems.set(result.total);
        this.page.set(page);
        this.pageSize.set(size);
        this.loading.set(false);
      },
      error: () => {
        this.cie10Listado.set([]);
        this.totalItems.set(0);
        this.loading.set(false);
      }
    });
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina < 0 || nuevaPagina > this.totalPaginas() - 1) return;
    this.recargar(nuevaPagina, this.pageSize());
  }

  cambiarTamanioPagina(nuevoSize: number) {
    this.recargar(0, Number(nuevoSize));
  }

  totalPaginas(): number {
    return Math.ceil(this.totalItems() / this.pageSize()) || 1;
  }

  seleccionar(item: CatalogoCIE10DTO) {
    this.seleccionado.set(item);
    const categoriaPadre = this.sanitizeCodigo(item.categoriaPadre ?? null);
    this.form.patchValue({
      id: (item as any)?.id ?? null,
      categoriaPadre,
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion,
      nivel: item.nivel ?? this.depthPorCodigo().get(this.sanitizeCodigo(item.codigo) ?? '') ?? 0,
      activo: item.activo ?? true
    }, { emitEvent: false });
    this.categoriaPadreSeleccionada.set(categoriaPadre);
    this.nombreDraft.set(item.nombre);
    this.actualizarNivelSegunSeleccion();
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const categoriaPadre = this.normalizeParentCode(value.categoriaPadre ?? null);
    const nivelCalculado = this.nivelCalculado();
    const payloadBase = {
      codigo: this.normalizeCodigo(value.codigo),
      nombre: this.normalizeNombre(value.nombre),
      descripcion: this.normalizeDescripcion(value.descripcion),
      categoriaPadre,
      nivel: nivelCalculado,
      activo: Boolean(value.activo)
    };

    const request = value.id
      ? this.catalogosService.actualizarCIE10(value.id, this.toUpdatePayload(payloadBase))
      : this.catalogosService.crearCIE10(this.toCreatePayload(payloadBase));

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.recargar();
      },
      error: () => this.saving.set(false)
    });
  }

  reset() {
    this.seleccionado.set(null);
    this.form.reset({
      id: null,
      categoriaPadre: null,
      codigo: '',
      nombre: '',
      descripcion: '',
      nivel: 0,
      activo: true
    }, { emitEvent: false });
    this.form.get('nivel')?.disable({ emitEvent: false });
    this.categoriaPadreSeleccionada.set(null);
    this.nombreDraft.set('');
    this.actualizarNivelSegunSeleccion();
  }

  actualizarBusqueda(valor: string) {
    this.busqueda.set(valor);
  }

  toggleSoloActivos(valor: boolean | undefined | null) {
    this.soloActivos.set(!!valor);
    this.recargar(0, this.pageSize());
  }

  prepararNuevoPrincipal(): void {
    if (this.modoEdicion()) {
      this.seleccionado.set(null);
      this.form.patchValue({ id: null }, { emitEvent: false });
    }
    this.form.patchValue({ categoriaPadre: null }, { emitEvent: false });
    this.categoriaPadreSeleccionada.set(null);
    this.actualizarNivelSegunSeleccion();
  }

  prepararNuevoHijo(base: CatalogoCIE10DTO): void {
    const codigoPadre = this.sanitizeCodigo(base.codigo);
    if (!codigoPadre) {
      return;
    }
    this.seleccionado.set(null);
    this.form.reset({
      id: null,
      categoriaPadre: codigoPadre,
      codigo: '',
      nombre: '',
      descripcion: '',
      nivel: (base.nivel ?? this.depthPorCodigo().get(codigoPadre) ?? 0) + 1,
      activo: true
    }, { emitEvent: false });
    this.form.get('nivel')?.disable({ emitEvent: false });
    this.categoriaPadreSeleccionada.set(codigoPadre);
    this.nombreDraft.set('');
    this.actualizarNivelSegunSeleccion();
  }

  private actualizarNivelSegunSeleccion(): void {
    const nivelControl = this.form.get('nivel');
    let nivel = this.nivelCalculado();
    const seleccionado = this.seleccionado();
    const categoriaActual = this.categoriaPadreSeleccionada();
    if (seleccionado) {
      const parentOriginal = this.sanitizeCodigo(seleccionado.categoriaPadre ?? null);
      if (parentOriginal === categoriaActual && seleccionado.nivel !== null && seleccionado.nivel !== undefined) {
        nivel = seleccionado.nivel;
      }
    }
    nivelControl?.setValue(nivel, { emitEvent: false });
  }

  protected nivelEtiqueta(nivel: number | null | undefined): string {
    if (nivel === 0) {
      return 'Principal';
    }
    if (nivel === 1) {
      return 'Item';
    }
    if (nivel === 2) {
      return 'Item del item';
    }
    if (typeof nivel === 'number' && Number.isFinite(nivel)) {
      return `Nivel ${nivel}`;
    }
    return 'Sin nivel asignado';
  }

  private normalizeParentCode(valor: string | null): string | null {
    if (valor === null) {
      return null;
    }
    if (typeof valor !== 'string') {
      return null;
    }
    const normalized = valor.trim().toUpperCase();
    return normalized.length ? normalized : null;
  }

  private sanitizeCodigo(valor: unknown): string | null {
    if (typeof valor !== 'string') {
      return null;
    }
    const normalized = valor.trim().toUpperCase();
    return normalized.length ? normalized : null;
  }

  private buildRutaDesde(categoria: string | null): string[] {
    const ruta: string[] = [];
    let actual = this.sanitizeCodigo(categoria);
    const listado = this.cie10Listado();
    let guard = 0;
    while (actual) {
      const item = this.findByCodigo(actual, listado);
      if (!item) {
        break;
      }
      const nivel = item.nivel ?? this.depthPorCodigo().get(actual) ?? ruta.length;
      ruta.unshift(`Nivel ${nivel} • ${item.codigo} • ${item.nombre}`);
      actual = this.sanitizeCodigo(item.categoriaPadre ?? null);
      if (guard++ > 50) {
        break;
      }
    }
    return ruta;
  }

  private buildRutaParaItem(item: CatalogoCIE10DTO): string[] {
    const rutaPadres = this.buildRutaDesde(item.categoriaPadre ?? null);
    const codigo = this.sanitizeCodigo(item.codigo) ?? '';
    const nivel = item.nivel ?? this.depthPorCodigo().get(codigo) ?? rutaPadres.length;
    return [...rutaPadres, `Nivel ${nivel} • ${item.codigo} • ${item.nombre}`];
  }

  private findByCodigo(codigo: string | null | undefined, listado: CatalogoCIE10DTO[]): CatalogoCIE10DTO | undefined {
    const normalized = this.sanitizeCodigo(codigo ?? null);
    if (!normalized) {
      return undefined;
    }
    return listado.find(item => this.sanitizeCodigo(item.codigo) === normalized);
  }

  private buildJerarquia(listado: CatalogoCIE10DTO[]): CatalogoJerarquiaEntry[] {
    if (!Array.isArray(listado) || !listado.length) {
      return [];
    }

    const ordenados = listado.slice().sort((a, b) => a.codigo.localeCompare(b.codigo));
    const codigoMap = new Map<string, CatalogoCIE10DTO>();
    ordenados.forEach(item => {
      const codigo = this.sanitizeCodigo(item.codigo);
      if (codigo) {
        codigoMap.set(codigo, item);
      }
    });

    const childrenMap = this.buildChildrenMap(ordenados);
    const visitados = new Set<string>();
    const resultado: CatalogoJerarquiaEntry[] = [];

    const visitar = (item: CatalogoCIE10DTO, depth: number) => {
      const codigo = this.sanitizeCodigo(item.codigo);
      if (!codigo || visitados.has(codigo)) {
        return;
      }
      visitados.add(codigo);
      resultado.push({ item, depth });
      const hijos = childrenMap.get(codigo) ?? [];
      hijos.forEach(hijo => visitar(hijo, depth + 1));
    };

    const raices = ordenados
      .filter(item => {
        const parent = this.sanitizeCodigo(item.categoriaPadre ?? null);
        return !parent || !codigoMap.has(parent);
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    raices.forEach(root => visitar(root, 0));

    ordenados.forEach(item => {
      const codigo = this.sanitizeCodigo(item.codigo);
      if (codigo && !visitados.has(codigo)) {
        visitar(item, 0);
      }
    });

    return resultado;
  }

  private buildChildrenMap(listado: CatalogoCIE10DTO[]): Map<string, CatalogoCIE10DTO[]> {
    const mapa = new Map<string, CatalogoCIE10DTO[]>();
    const codigoMap = new Map<string, CatalogoCIE10DTO>();

    listado.forEach(item => {
      const codigo = this.sanitizeCodigo(item.codigo);
      if (codigo) {
        codigoMap.set(codigo, item);
      }
    });

    listado.forEach(item => {
      const parent = this.sanitizeCodigo(item.categoriaPadre ?? null);
      if (!parent || !codigoMap.has(parent)) {
        return;
      }
      const children = mapa.get(parent);
      if (children) {
        children.push(item);
      } else {
        mapa.set(parent, [item]);
      }
    });

    for (const children of mapa.values()) {
      children.sort((a, b) => a.codigo.localeCompare(b.codigo));
    }
    return mapa;
  }

  private normalizeCodigo(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toUpperCase();
  }


  private normalizeNombre(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

  private normalizeDescripcion(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }



  private toCreatePayload(base: { codigo: string; nombre: string; descripcion: string; categoriaPadre: string | null; nivel: number; activo: boolean }): any {
    return {
      codigo: base.codigo,
      nombre: base.nombre,
      descripcion: base.descripcion,
      categoriaPadre: base.categoriaPadre ?? undefined,
      nivel: base.nivel,
      activo: base.activo
    };
  }



  private toUpdatePayload(base: { codigo: string; nombre: string; descripcion: string; categoriaPadre: string | null; nivel: number; activo: boolean }): UpdateCatalogoCIE10Payload {
    return {
      codigo: base.codigo,
      nombre: base.nombre,
      descripcion: base.descripcion,
      categoriaPadre: base.categoriaPadre ?? undefined,
      nivel: base.nivel,
      activo: base.activo
    };
  }





}
