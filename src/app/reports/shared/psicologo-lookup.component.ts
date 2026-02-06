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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { buildApiUrl } from '../../core/config/api.config';

interface PsicologoLookupDTO {
  id: number;
  nombre: string;
  cedula: string;
  username: string;
  unidadMilitar?: string;
}

type PropagateChangeFn = (value: unknown) => void;
type PropagateTouchedFn = () => void;

@Component({
  selector: 'app-psicologo-lookup',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PsicologoLookupComponent),
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
        @if (selectedItem()) {
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
        <p class="text-xs text-slate-500">Buscando psicólogos...</p>
      }

      @if (!loading() && query().trim().length >= 2) {
        @if (results().length) {
          <ul class="mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            @for (item of results(); track item.id) {
              <li class="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  (click)="selectOption(item)"
                  class="flex w-full cursor-pointer flex-col px-4 py-3 text-left text-sm transition hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none"
                >
                  <span class="text-[13px] font-semibold text-slate-800">{{ item.nombre }}</span>
                  <span class="mt-0.5 text-[12px] text-slate-500">{{ item.cedula }} · {{ item.username }}</span>
                  @if (item.unidadMilitar) {
                    <span class="mt-0.5 text-[11px] text-slate-400">{{ item.unidadMilitar }}</span>
                  }
                </button>
              </li>
            }
          </ul>
        } @else if (!error()) {
          <p class="text-xs text-slate-500">No se encontraron psicólogos con la búsqueda realizada.</p>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PsicologoLookupComponent implements ControlValueAccessor {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = buildApiUrl('gestion', '/psicologos/buscar');

  readonly placeholder = input('Buscar psicólogo por nombre, cédula o usuario');
  readonly helperText = input<string | null>(null);
  readonly selectionChange = output<PsicologoLookupDTO | null>();

  private propagateChange: PropagateChangeFn = () => {};
  private propagateTouched: PropagateTouchedFn = () => {};

  private searchHandle: ReturnType<typeof setTimeout> | null = null;

  readonly disabled = signal(false);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly results = signal<readonly PsicologoLookupDTO[]>([]);
  readonly selectedItem = signal<PsicologoLookupDTO | null>(null);

  readonly inputDisplay = computed(() => {
    const seleccionado = this.selectedItem();
    if (seleccionado) {
      return `${seleccionado.nombre} · ${seleccionado.cedula}`;
    }
    return this.query();
  });

  writeValue(value: unknown): void {
    const id = this.normalizeId(value);
    if (id === null) {
      this.selectedItem.set(null);
      this.selectionChange.emit(null);
      return;
    }
    // Cuando only tenemos el id, hacemos una búsqueda puntual por id usando el mismo endpoint
    const params = new HttpParams().set('id', String(id));
    this.http
      .get<PsicologoLookupDTO[]>(this.baseUrl, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: lista => {
          const encontrado = Array.isArray(lista) ? lista.find(p => p.id === id) ?? null : null;
          this.selectedItem.set(encontrado);
          this.selectionChange.emit(encontrado ?? null);
        },
        error: () => {
          this.selectedItem.set(null);
          this.selectionChange.emit(null);
        }
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
    if (this.disabled()) return;

    const trimmed = value ?? '';
    this.query.set(trimmed);
    this.error.set(null);

    if (this.searchHandle) {
      clearTimeout(this.searchHandle);
      this.searchHandle = null;
    }

    const criterio = trimmed.trim();
    if (criterio.length < 2) {
      this.loading.set(false);
      this.results.set([]);
      return;
    }

    this.loading.set(true);
    this.searchHandle = setTimeout(() => {
      let params = new HttpParams().set('q', criterio).set('limit', '20');
      this.http
        .get<PsicologoLookupDTO[]>(this.baseUrl, { params })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: lista => {
            if (this.query().trim() !== criterio) {
              return;
            }
            this.results.set(Array.isArray(lista) ? lista : []);
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

  selectOption(item: PsicologoLookupDTO): void {
    if (this.disabled()) return;

    this.selectedItem.set(item);
    this.selectionChange.emit(item);
    this.propagateChange(item.id);
    this.query.set('');
    this.results.set([]);
    this.propagateTouched();
  }

  clearSelection(): void {
    if (this.disabled()) return;

    this.selectedItem.set(null);
    this.selectionChange.emit(null);
    this.propagateChange(null);
    this.query.set('');
    this.results.set([]);
    this.error.set(null);
    this.propagateTouched();
  }

  markAsTouched(): void {
    this.propagateTouched();
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
}
