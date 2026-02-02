import { CommonModule } from '@angular/common';
import { 
  ChangeDetectionStrategy, 
  Component, 
  DestroyRef, 
  computed, 
  forwardRef, 
  inject, 
  signal, 
  input, 
  output 
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';
import { CatalogosService } from '../../services/catalogos.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { PaginatedResult } from '../../services/catalogos.service';

type PropagateChangeFn = (value: unknown) => void;
type PropagateTouchedFn = () => void;

@Component({
  selector: 'app-cie10-lookup',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Cie10LookupComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-2">
      <div class="relative">
        <input
          type="search"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-slate-900 focus:outline-none focus:ring disabled:cursor-not-allowed disabled:opacity-70"
          [attr.placeholder]="placeholder()"
          autocomplete="off"
          [value]="inputDisplay()"
          [disabled]="disabled()"
          (input)="onSearchInput($any($event.target).value)"
          (blur)="markAsTouched()"
        />
        @if (selectedItems().length && !disabled()) {
          <button
            type="button"
            (click)="clearSelection()"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
          >
            Limpiar
          </button>
        }
      </div>

      @if (helperText()) {
        <p class="text-xs text-slate-500">{{ helperText() }}</p>
      }

      @if (error()) {
        <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="text-xs text-slate-500">Buscando diagnósticos...</p>
      }

      @if (!loading() && query().trim().length >= 3) {
        @if (results().length) {
          <ul class="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            @for (item of results(); track item.id ?? item.codigo) {
              <li>
                <button
                  type="button"
                  (click)="selectOption(item)"
                  class="flex w-full flex-col gap-1 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm transition hover:border-slate-400"
                >
                  <span class="font-semibold text-slate-900">{{ item.codigo }}</span>
                  <span class="text-slate-600">{{ item.descripcion }}</span>
                </button>
              </li>
            }
          </ul>
        } @else if (!error()) {
          <p class="text-xs text-slate-500">No se encontraron coincidencias con la búsqueda realizada.</p>
        }
      }

      @if (selectedLabel()) {
        <div class="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span class="font-semibold text-slate-900">{{ selectedLabel() }}</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cie10LookupComponent implements ControlValueAccessor {
  private readonly cache = inject(CatalogosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input('Buscar diagnóstico CIE-10');
  readonly helperText = input<string | null>(null);
  readonly selectionChange = output<CatalogoCIE10DTO[] | null>();

  private propagateChange: PropagateChangeFn = () => {};
  private propagateTouched: PropagateTouchedFn = () => {};

  private searchHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly lastRequestedId: number | null = null;

  readonly disabled = signal(false);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly results = signal<readonly CatalogoCIE10DTO[]>([]);
  readonly selectedItems = signal<CatalogoCIE10DTO[]>([]);
  readonly catalogoInicial = signal<readonly CatalogoCIE10DTO[]>([]);

  readonly selectedLabel = computed(() => this.selectedItems().map(this.formatLabel).join(', '));
  readonly inputDisplay = computed(() => {
    const seleccionados = this.selectedItems();
    if (seleccionados.length) {
      return seleccionados.map(this.formatLabel).join(', ');
    }
    return this.query();
  });

  constructor() {
    this.cache
      .listarCIE10({ soloActivos: true })
      .pipe(
        map((result: PaginatedResult<CatalogoCIE10DTO>) => result.items),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((listado: CatalogoCIE10DTO[]) => {
        if (Array.isArray(listado)) {
          this.catalogoInicial.set(listado);
          if (!this.query().trim().length && this.selectedItems().length === 0) {
            this.results.set(this.filtrarLocal(''));
          }
        }
      });
  }

  writeValue(value: unknown): void {
    let ids: number[] = [];
    if (Array.isArray(value)) {
      ids = value.map(v => this.normalizeId(typeof v === 'object' && v !== null ? v.id : v)).filter((id): id is number => id !== null);
    } else {
      const id = this.normalizeId(value);
      if (id !== null) ids = [id];
    }
    if (!ids.length) {
      this.selectedItems.set([]);
      this.selectionChange.emit(null);
      return;
    }
    const found: CatalogoCIE10DTO[] = [];
    let loaded = 0;
    ids.forEach(id => {
      this.cache.obtenerCIE10(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((item: CatalogoCIE10DTO) => {
        if (item) found.push(item);
        loaded++;
        if (loaded === ids.length) {
          this.selectedItems.set(found);
          this.selectionChange.emit(found.length ? found : null);
        }
      });
    });
  }

  registerOnChange(fn: PropagateChangeFn): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: PropagateTouchedFn): void {
    this.propagateTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(Boolean(isDisabled));
  }

  onSearchInput(value: string): void {
    if (this.disabled()) {
      return;
    }
    const trimmed = value ?? '';
    this.query.set(trimmed);
    this.error.set(null);
    if (this.searchHandle) {
      clearTimeout(this.searchHandle);
      this.searchHandle = null;
    }
    const criterio = trimmed.trim();
    if (criterio.length < 3) {
      this.loading.set(false);
      this.results.set(this.filtrarLocal(criterio));
      return;
    }
    this.loading.set(true);
    this.searchHandle = setTimeout(() => {
      this.cache.buscarCIE10(criterio).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (items: CatalogoCIE10DTO[]) => {
          if (this.query().trim() !== criterio) {
            return;
          }
          this.results.set(Array.isArray(items) ? items : []);
          this.loading.set(false);
        },
        error: () => {
          if (this.query().trim() !== criterio) {
            return;
          }
          this.results.set([]);
          this.loading.set(false);
          this.error.set('No se pudo ejecutar la búsqueda. Intenta nuevamente.');
        }
      });
    }, 300);
  }

  selectOption(item: CatalogoCIE10DTO): void {
    if (this.disabled()) {
      return;
    }
    const current = this.selectedItems();
    const exists = current.some(i => i.id === item.id);
    let updated: CatalogoCIE10DTO[];
    if (exists) {
      updated = current.filter(i => i.id !== item.id);
    } else {
      updated = [item]; // Solo uno seleccionado
    }
    this.selectedItems.set(updated);
    this.selectionChange.emit(updated.length ? updated : null);
    this.query.set(''); // Oculta la lista de sugerencias
    this.results.set([]); // Limpia resultados
    this.propagateTouched();
  }

  clearSelection(): void {
    if (this.disabled()) {
      return;
    }
    this.selectedItems.set([]);
    this.selectionChange.emit(null);
    this.query.set('');
    this.results.set(this.filtrarLocal(''));
    this.error.set(null);
    this.propagateTouched();
  }

  markAsTouched(): void {
    this.propagateTouched();
  }

  private filtrarLocal(queryRaw: string): readonly CatalogoCIE10DTO[] {
    const catalogo = this.catalogoInicial();
    const listado = Array.isArray(catalogo) ? [...catalogo] : [];
    if (!listado.length) {
      return [];
    }
    const criterio = queryRaw?.trim().toUpperCase() ?? '';
    if (!criterio.length) {
      return listado.slice(0, 20);
    }
    return listado
      .filter(item => this.coincide(item, criterio))
      .slice(0, 20);
  }

  private coincide(item: CatalogoCIE10DTO, criterio: string): boolean {
    const codigo = item.codigo?.toUpperCase() ?? '';
    const descripcion = item.descripcion?.toUpperCase() ?? '';
    return codigo.includes(criterio) || descripcion.includes(criterio);
  }

  private normalizeId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private formatLabel(item: CatalogoCIE10DTO): string {
    if (!item) {
      return '';
    }
    const codigo = item.codigo?.trim() ?? '';
    const descripcion = item.descripcion?.trim() ?? '';
    return codigo && descripcion ? `${codigo} - ${descripcion}` : codigo || descripcion;
  }
}