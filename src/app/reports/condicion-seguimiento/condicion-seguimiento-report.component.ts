
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import { ReporteSeguimientoTransferenciaDTO, ReporteSeguimientoFilters } from '../../models/reportes.models';
import { AuthService } from '../../services/auth.service';

interface FiltroResumenItem {
  etiqueta: string;
  valor: string;
}

@Component({
  selector: 'app-condicion-seguimiento-report',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condicion-seguimiento-report.component.html',
  styleUrls: ['./condicion-seguimiento-report.component.scss']
})
export class CondicionSeguimientoReportComponent {
  // TrackBy para filas de resultados (adaptado para aceptar cualquier objeto)
  trackFila(index: number, fila: any): string | number {
    const id = typeof fila.fichaId === 'number' && Number.isFinite(fila.fichaId) ? String(fila.fichaId) : undefined;
    return id || `${fila.personalMilitarId ?? 'fila'}-${fila.psicologoId ?? 'psicologo'}`;
  }

  // TrackBy para filtros resumen (adaptado para aceptar cualquier objeto)
  trackFiltro(index: number, filtro: any): string {
    return filtro.etiqueta || index.toString();
  }

  getBadgeClass(condicion: string | undefined): string {
    if (!condicion) return 'badge-neutral';
    const condicionLower = condicion.toLowerCase();
    if (condicionLower.includes('seguimiento')) {
      return 'badge-info';
    } else if (condicionLower.includes('transferencia')) {
      return 'badge-warning';
    } else if (condicionLower.includes('alta') || condicionLower.includes('finalizado')) {
      return 'badge-success';
    } else if (condicionLower.includes('pendiente')) {
      return 'badge-warning';
    }
    return 'badge-neutral';
  }

  removerFiltro(filtro: any) {
    const form = this.form as any;
    if (filtro.etiqueta === 'Cédula psicólogo') {
      form.controls.psicologoCedula.setValue('');
    } else if (filtro.etiqueta === 'Fecha desde') {
      form.controls.fechaDesde.setValue('');
    } else if (filtro.etiqueta === 'Fecha hasta') {
      form.controls.fechaHasta.setValue('');
    } else if (filtro.etiqueta === 'Cédula') {
      form.controls.cedula.setValue('');
    } else if (filtro.etiqueta === 'Unidad militar') {
      form.controls.unidadMilitar.setValue('');
    }
    this.buscar();
  }
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReportesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    psicologoCedula: this.fb.control(''),
    fechaDesde: this.fb.control(''),
    fechaHasta: this.fb.control(''),
    cedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    unidadMilitar: this.fb.control('', { validators: [Validators.maxLength(120)] })
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly resultados = signal<ReporteSeguimientoTransferenciaDTO[]>([]);
  readonly busquedaEjecutada = signal(false);
  readonly filtrosAplicados = signal<ReporteSeguimientoFilters | null>(null);
  readonly size = signal(10);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly filtrosResumen = computed<FiltroResumenItem[]>(() => {
    const filtros = this.filtrosAplicados();
    if (!filtros) {
      return [];
    }
    const resumen: FiltroResumenItem[] = [];
    if (filtros.psicologoCedula) {
      resumen.push({ etiqueta: 'Cédula psicólogo', valor: String(filtros.psicologoCedula) });
    }
    if (filtros.fechaDesde) {
      resumen.push({ etiqueta: 'Fecha desde', valor: filtros.fechaDesde });
    }
    if (filtros.fechaHasta) {
      resumen.push({ etiqueta: 'Fecha hasta', valor: filtros.fechaHasta });
    }
    if (filtros.cedula) {
      resumen.push({ etiqueta: 'Cédula', valor: filtros.cedula });
    }
    if (filtros.unidadMilitar) {
      resumen.push({ etiqueta: 'Unidad militar', valor: filtros.unidadMilitar });
    }
    return resumen;
  });

  readonly sinResultados = computed(() => !this.error() && !this.resultados().length);

  private readonly dateFormatter = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' });

  constructor() {
    queueMicrotask(() => {
      this.buscar();
    });
  }

  buscar() {
    const raw = this.form.getRawValue();
    const psicologoCedula = raw.psicologoCedula.trim();
    const fechaDesde = raw.fechaDesde.trim();
    const fechaHasta = raw.fechaHasta.trim();
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      this.error.set('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    const cedula = raw.cedula.trim().toUpperCase();
    const unidad = raw.unidadMilitar.trim();
    const hayFiltros = (
      !!psicologoCedula ||
      !!fechaDesde ||
      !!fechaHasta ||
      !!cedula ||
      !!unidad
    );

    if (!hayFiltros) {
      this.info.set('Debes ingresar al menos un criterio de búsqueda para consultar el reporte.');
      this.error.set(null);
      return;
    }

    const filtros: ReporteSeguimientoFilters & { incluirSeguimientos: boolean; size: number; page?: number } = {
      psicologoId: undefined,
      psicologoCedula: psicologoCedula || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      cedula: cedula || undefined,
      unidadMilitar: unidad || undefined,
      incluirSeguimientos: true,
      size: this.size(),
      page: this.page() - 1
    };

    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);

    this.reportes.obtenerCondicionSeguimiento(filtros).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading.set(false);
        this.busquedaEjecutada.set(true);
      }),
      catchError(() => {
        const filtrosAplicados = this.toAppliedFilters(filtros);
        this.error.set('No fue posible obtener el reporte. Intenta nuevamente.');
        this.resultados.set([]);
        this.filtrosAplicados.set(filtrosAplicados);
        return of<{ resultados: ReporteSeguimientoTransferenciaDTO[]; filtros: ReporteSeguimientoFilters }>({ resultados: [], filtros: filtrosAplicados });
      })
    ).subscribe(respuesta => {
      if (!respuesta) {
        this.resultados.set([]);
        this.filtrosAplicados.set(this.toAppliedFilters(filtros));
        this.total.set(0);
        return;
      }
      const resultados = Array.isArray(respuesta.resultados) ? respuesta.resultados : [];
      this.resultados.set(resultados);
      this.filtrosAplicados.set(respuesta.filtros ?? this.toAppliedFilters(filtros));
      const totalBackend = (respuesta as any).total;
      this.total.set(Number.isFinite(totalBackend) ? totalBackend : resultados.length);
    });
  }

  limpiar() {
    this.form.patchValue({
      psicologoCedula: '',
      fechaDesde: '',
      fechaHasta: '',
      cedula: '',
      unidadMilitar: ''
    });
    this.resultados.set([]);
    this.filtrosAplicados.set(null);
    this.error.set(null);
    this.busquedaEjecutada.set(false);
    this.page.set(1);
    this.buscar();
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return 'Sin registros';
    }
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) {
      return fecha;
    }
    return this.dateFormatter.format(parsed);
  }

  private toAppliedFilters(filtros: ReporteSeguimientoFilters): ReporteSeguimientoFilters {
    return {
      psicologoId: typeof filtros.psicologoId === 'number' && Number.isFinite(filtros.psicologoId) ? filtros.psicologoId : undefined,
      psicologoCedula: filtros.psicologoCedula || undefined,
      fechaDesde: filtros.fechaDesde || undefined,
      fechaHasta: filtros.fechaHasta || undefined,
      cedula: filtros.cedula || undefined,
      unidadMilitar: filtros.unidadMilitar || undefined
    };
  }

  cambiarSize(event: Event | string | number) {
    let value: any = event;
    if (event && typeof event === 'object' && 'target' in event && (event.target as HTMLSelectElement)?.value !== undefined) {
      value = (event.target as HTMLSelectElement).value;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return;
    }
    this.size.set(parsed);
    this.page.set(1);
    this.buscar();
  }

  cambiarPagina(nueva: number) {
    if (nueva < 1 || nueva > this.totalPages()) {
      return;
    }
    this.page.set(nueva);
    this.buscar();
  }
}
