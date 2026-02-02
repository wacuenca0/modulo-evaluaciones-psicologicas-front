import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import {
  ReportePersonalDiagnosticoDTO,
  ReportePersonalDiagnosticosFilters,
  ReportePersonalDiagnosticosResponse,
  ReportePersonalDiagnosticosAppliedFilters
} from '../../models/reportes.models';
import { Cie10LookupComponent } from '../shared/cie10-lookup.component';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';

interface FiltroResumenItem {
  etiqueta: string;
  valor: string;
}

@Component({
  selector: 'app-personal-diagnosticos-report',
  imports: [CommonModule, ReactiveFormsModule, Cie10LookupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './personal-diagnosticos-report.component.html',
  styleUrls: ['./personal-diagnosticos-report.component.scss']
})
export class PersonalDiagnosticosReportComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReportesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    fechaDesde: this.fb.control(''),
    fechaHasta: this.fb.control(''),
    diagnosticoId: this.fb.control(''),
    cedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    grado: this.fb.control('', { validators: [Validators.maxLength(60)] }),
    unidadMilitar: this.fb.control('', { validators: [Validators.maxLength(120)] })
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultados = signal<ReportePersonalDiagnosticoDTO[]>([]);
  readonly filtrosAplicados = signal<ReportePersonalDiagnosticosAppliedFilters | null>(null);
  readonly busquedaEjecutada = signal(false);
  readonly diagnosticoSeleccionado = signal<CatalogoCIE10DTO[] | null>(null);
  readonly diagnosticoEtiqueta = computed(() => {
    const seleccionados = this.diagnosticoSeleccionado();
    if (!seleccionados?.length) {
      return null;
    }
    return seleccionados.map(item => {
      const codigo = item.codigo?.trim() ?? '';
      const descripcion = item.descripcion?.trim() ?? '';
      return codigo && descripcion ? `${codigo} · ${descripcion}` : codigo || descripcion || null;
    }).filter(Boolean).join(', ');
  });
  readonly filtrosResumen = computed<FiltroResumenItem[]>(() => {
    const filtros = this.filtrosAplicados();
    if (!filtros) {
      return [];
    }
    const resumen: FiltroResumenItem[] = [];
    if (filtros.fechaDesde) {
      resumen.push({ etiqueta: 'Fecha desde', valor: filtros.fechaDesde });
    }
    if (filtros.fechaHasta) {
      resumen.push({ etiqueta: 'Fecha hasta', valor: filtros.fechaHasta });
    }
    if (filtros.diagnosticoId !== null && filtros.diagnosticoId !== undefined) {
      const etiqueta = this.diagnosticoEtiqueta();
      resumen.push({ etiqueta: 'Diagnóstico', valor: etiqueta ?? `ID ${filtros.diagnosticoId}` });
    }
    if (filtros.cedula) {
      resumen.push({ etiqueta: 'Cédula', valor: filtros.cedula });
    }
    if (filtros.grado) {
      resumen.push({ etiqueta: 'Grado', valor: filtros.grado });
    }
    if (filtros.unidadMilitar) {
      resumen.push({ etiqueta: 'Unidad militar', valor: filtros.unidadMilitar });
    }
    return resumen;
  });
  readonly sinResultados = computed(() => !this.error() && !this.resultados().length);

  private readonly dateFormatter = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' });
  private readonly isInitialized = signal(false);

  constructor() {
    queueMicrotask(() => {
      this.isInitialized.set(true);
      this.buscar();
    });
  }

  buscar() {
    if (!this.isInitialized()) {
      return;
    }
    const raw = this.form.getRawValue();
    const fechaDesde = raw.fechaDesde.trim();
    const fechaHasta = raw.fechaHasta.trim();
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      this.error.set('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    const filtros: ReportePersonalDiagnosticosFilters = {
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      diagnosticoId: this.parseId(raw.diagnosticoId),
      cedula: raw.cedula.trim().toUpperCase() || undefined,
      grado: raw.grado.trim().toUpperCase() || undefined,
      unidadMilitar: raw.unidadMilitar.trim() || undefined
    };

    this.loading.set(true);
    this.error.set(null);

    this.reportes.obtenerPersonalDiagnosticos(filtros).pipe(
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
        return of<ReportePersonalDiagnosticosResponse>({ resultados: [], filtros: filtrosAplicados });
      })
    ).subscribe(respuesta => {
      if (!respuesta) {
        this.resultados.set([]);
        this.filtrosAplicados.set(this.toAppliedFilters(filtros));
        return;
      }
      this.resultados.set(Array.isArray(respuesta.resultados) ? respuesta.resultados : []);
      this.filtrosAplicados.set(respuesta.filtros ?? this.toAppliedFilters(filtros));
    });
  }

  limpiar() {
    this.form.reset({
      fechaDesde: '',
      fechaHasta: '',
      diagnosticoId: '',
      cedula: '',
      grado: '',
      unidadMilitar: ''
    });
    this.resultados.set([]);
    this.filtrosAplicados.set(null);
    this.busquedaEjecutada.set(false);
    this.error.set(null);
    this.diagnosticoSeleccionado.set(null);
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

  nombrePersonal(fila: ReportePersonalDiagnosticoDTO): string {
    return fila.personalNombreCompleto?.trim() || fila.personalNombre?.trim() || 'Personal';
  }

  diagnosticoPrincipal(fila: ReportePersonalDiagnosticoDTO): string {
    if (fila.diagnosticoCodigo && fila.diagnosticoDescripcion) {
      return `${fila.diagnosticoCodigo} · ${fila.diagnosticoDescripcion}`;
    }
    return fila.diagnosticoCodigo || fila.diagnosticoDescripcion || '—';
  }

  psicologoPrincipal(fila: ReportePersonalDiagnosticoDTO): string {
    return fila.psicologoNombre?.trim() || '—';
  }

  trackFicha(fila: ReportePersonalDiagnosticoDTO): string {
    const id = typeof fila.fichaId === 'number' && Number.isFinite(fila.fichaId) ? String(fila.fichaId) : undefined;
    const numero = fila.numeroEvaluacion?.trim();
    return id || numero || `${fila.personalId ?? 'fila'}-${fila.diagnosticoCodigo ?? 'diag'}`;
  }

  private toAppliedFilters(filtros: ReportePersonalDiagnosticosFilters): ReportePersonalDiagnosticosAppliedFilters {
    return {
      fechaDesde: filtros.fechaDesde ?? null,
      fechaHasta: filtros.fechaHasta ?? null,
      diagnosticoId: filtros.diagnosticoId ?? null,
      cedula: filtros.cedula ?? null,
      grado: filtros.grado ?? null,
      unidadMilitar: filtros.unidadMilitar ?? null
    };
  }

  private parseId(raw: string): number | undefined {
    const value = raw?.trim();
    if (!value?.length) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  onDiagnosticoSelectionChange(opciones: CatalogoCIE10DTO[] | null) {
    this.diagnosticoSeleccionado.set(opciones ?? null);
  }

  getBadgeClass(estado: string | undefined): string {
    if (!estado) return 'badge-neutral';
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('activa') || estadoLower.includes('vigente')) {
      return 'badge-success';
    } else if (estadoLower.includes('observación') || estadoLower.includes('pendiente') || estadoLower.includes('observacion')) {
      return 'badge-warning';
    } else if (estadoLower.includes('cerrada') || estadoLower.includes('finalizada') || estadoLower.includes('completada')) {
      return 'badge-neutral';
    } else if (estadoLower.includes('seguimiento') || estadoLower.includes('transferencia')) {
      return 'badge-info';
    }
    return 'badge-neutral';
  }

  removerFiltro(filtro: FiltroResumenItem) {
    const raw = this.form.getRawValue();
    if (filtro.etiqueta === 'Fecha desde') {
      this.form.controls.fechaDesde.setValue('');
    } else if (filtro.etiqueta === 'Fecha hasta') {
      this.form.controls.fechaHasta.setValue('');
    } else if (filtro.etiqueta === 'Diagnóstico') {
      this.form.controls.diagnosticoId.setValue('');
      this.diagnosticoSeleccionado.set(null);
    } else if (filtro.etiqueta === 'Cédula') {
      this.form.controls.cedula.setValue('');
    } else if (filtro.etiqueta === 'Grado') {
      this.form.controls.grado.setValue('');
    } else if (filtro.etiqueta === 'Unidad militar') {
      this.form.controls.unidadMilitar.setValue('');
    }
    this.buscar();
  }

  exportarPDF() {
    // Implementación básica de exportación a PDF
    console.log('Exportando a PDF...', this.resultados());
    // Aquí implementarías la lógica real de exportación a PDF
    alert('Exportación a PDF: Esta funcionalidad está en desarrollo');
  }

  exportarExcel() {
    // Implementación básica de exportación a Excel
    console.log('Exportando a Excel...', this.resultados());
    // Aquí implementarías la lógica real de exportación a Excel
    alert('Exportación a Excel: Esta funcionalidad está en desarrollo');
  }
}
