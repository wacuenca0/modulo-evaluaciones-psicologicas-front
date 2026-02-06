import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import {
  ReporteAtencionPsicologoDTO,
  ReporteAtencionesFilters,
  ReporteAtencionesResponse,
  ReporteAtencionesAppliedFilters,
  FiltroResumenItem
} from '../../models/reportes.models';
import { Cie10LookupComponent } from '../shared/cie10-lookup.component';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';

@Component({
  selector: 'app-atenciones-psicologos-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Cie10LookupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './atenciones-psicologos-report.component.html',
  styleUrls: ['./atenciones-psicologos-report.component.scss']
})
export class AtencionesPsicologosReportComponent {
    // Estado de paginación
    readonly page = signal(1);
    readonly size = signal(10);
    readonly total = signal(0);
    readonly totalPages = computed(() => Math.ceil(this.total() / this.size()));

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReportesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    psicologoCedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    cedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    unidadMilitar: this.fb.control('', { validators: [Validators.maxLength(120)] }),
    fechaDesde: this.fb.control(''),
    fechaHasta: this.fb.control(''),
    diagnosticoId: this.fb.control('')
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultados = signal<ReporteAtencionPsicologoDTO[]>([]);
  readonly filtrosAplicados = signal<ReporteAtencionesAppliedFilters | null>(null);
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
    
    if (filtros.psicologoCedula) {
      resumen.push({ etiqueta: 'Cédula psicólogo', valor: filtros.psicologoCedula });
    }
    if (filtros.cedula) {
      resumen.push({ etiqueta: 'Cédula', valor: filtros.cedula });
    }
    if (filtros.unidadMilitar) {
      resumen.push({ etiqueta: 'Unidad Militar', valor: filtros.unidadMilitar });
    }
    if (filtros.fechaDesde) {
      resumen.push({ etiqueta: 'Fecha desde', valor: this.formatearFecha(filtros.fechaDesde) });
    }
    if (filtros.fechaHasta) {
      resumen.push({ etiqueta: 'Fecha hasta', valor: this.formatearFecha(filtros.fechaHasta) });
    }
    if (filtros.diagnosticoId !== null && filtros.diagnosticoId !== undefined) {
      const etiqueta = this.diagnosticoEtiqueta();
      resumen.push({ etiqueta: 'Diagnóstico', valor: etiqueta ?? `ID ${filtros.diagnosticoId}` });
    }
    
    return resumen;
  });

  readonly sinResultados = computed(() => !this.error() && !this.resultados().length);

  constructor() {
    // Ejecutar búsqueda inicial
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

    const filtros: ReporteAtencionesFilters = {
      psicologoCedula: psicologoCedula || undefined,
      cedula: raw.cedula.trim().toUpperCase() || undefined,
      unidadMilitar: raw.unidadMilitar.trim() || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      diagnosticoId: this.parseId(raw.diagnosticoId)
    };

    this.loading.set(true);
    this.error.set(null);

    this.reportes.obtenerAtencionesPorPsicologos({
      ...filtros,
      page: this.page() - 1, // Backend espera page=0 para la primera página
      size: this.size()
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading.set(false);
        this.busquedaEjecutada.set(true);
      }),
      catchError((error) => {
        console.error('Error en búsqueda:', error);
        this.error.set('No fue posible obtener el reporte. Intenta nuevamente.');
        this.resultados.set([]);
        this.filtrosAplicados.set(this.toAppliedFilters(filtros));
        // Mostrar alerta visual si es error de red
        if (error?.status === 0) {
          alert('No se pudo conectar con el servidor de reportes. Verifica que el backend esté en línea.');
        }
        return of<ReporteAtencionesResponse>({ 
          resultados: [], 
          totales: { fichas: 0, activas: 0, observacion: 0, seguimientos: 0, personas: 0 },
          filtros: this.toAppliedFilters(filtros) 
        });
      })
    ).subscribe(respuesta => {
      console.log('[Reporte] Respuesta recibida:', respuesta);
      if (!respuesta) {
        this.resultados.set([]);
        this.filtrosAplicados.set(this.toAppliedFilters(filtros));
        return;
      }
      // Soporta respuesta paginada o legacy
      if ('data' in respuesta && Array.isArray((respuesta as any).data)) {
        const paginada = respuesta as { data: any[]; total?: number; filtros?: any };
        console.log('[Reporte] Respuesta paginada:', paginada);
        this.resultados.set(Array.isArray(paginada.data) ? paginada.data : []);
        this.total.set(Number.isFinite(paginada.total) ? paginada.total! : paginada.data.length);
        this.filtrosAplicados.set(paginada.filtros ?? this.toAppliedFilters(filtros));
      } else {
        const legacy = respuesta as { resultados?: any[]; filtros?: any };
        console.log('[Reporte] Respuesta legacy:', legacy);
        this.resultados.set(Array.isArray(legacy.resultados) ? legacy.resultados : []);
        this.total.set(Array.isArray(legacy.resultados) ? legacy.resultados.length : 0);
        this.filtrosAplicados.set(legacy.filtros ?? this.toAppliedFilters(filtros));
      }
    });
  }
  cambiarPagina(nueva: number) {
    if (nueva < 1 || nueva > this.totalPages()) return;
    this.page.set(nueva);
    this.buscar();
  }

  cambiarSize(event: Event | string | number) {
    let value: any = event;
    if (event && typeof event === 'object' && 'target' in event && (event.target as HTMLSelectElement)?.value !== undefined) {
      value = (event.target as HTMLSelectElement).value;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    this.size.set(parsed);
    // Sólo cambia el tamaño de página, manteniendo la página actual
    this.buscar();
  }

  limpiar() {
    this.form.reset({
      psicologoCedula: '',
      cedula: '',
      unidadMilitar: '',
      fechaDesde: '',
      fechaHasta: '',
      diagnosticoId: ''
    });
    this.resultados.set([]);
    this.filtrosAplicados.set(null);
    this.busquedaEjecutada.set(false);
    this.error.set(null);
    this.diagnosticoSeleccionado.set(null);
    this.page.set(1);
    this.buscar();
  }

  // MÉTODOS PARA LA TEMPLATE
  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    
    try {
      const date = new Date(fecha);
      if (Number.isNaN(date.getTime())) {
        return fecha;
      }
      return date.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  trackResultado(index: number, resultado: ReporteAtencionPsicologoDTO): string {
    return resultado.psicologoId 
      ? `psicologo-${resultado.psicologoId}` 
      : `psicologo-${index}`;
  }

  trackFiltro(index: number, filtro: FiltroResumenItem): string {
    return `${filtro.etiqueta}-${filtro.valor}-${index}`;
  }

  removerFiltro(filtro: FiltroResumenItem) {
    if (filtro.etiqueta === 'Cédula psicólogo') {
      this.form.controls.psicologoCedula.setValue('');
    } else if (filtro.etiqueta === 'Cédula') {
      this.form.controls.cedula.setValue('');
    } else if (filtro.etiqueta === 'Unidad Militar') {
      this.form.controls.unidadMilitar.setValue('');
    } else if (filtro.etiqueta === 'Fecha desde') {
      this.form.controls.fechaDesde.setValue('');
    } else if (filtro.etiqueta === 'Fecha hasta') {
      this.form.controls.fechaHasta.setValue('');
    } else if (filtro.etiqueta === 'Diagnóstico') {
      this.form.controls.diagnosticoId.setValue('');
      this.diagnosticoSeleccionado.set(null);
    }
    
    this.buscar();
  }

  onDiagnosticoSeleccion(opciones: CatalogoCIE10DTO[] | null) {
    this.diagnosticoSeleccionado.set(opciones ?? null);
    // Limpiar la lista de sugerencias y disparar búsqueda automáticamente
    if (opciones && opciones.length > 0) {
      // Asegura que el id sea string
      const id = opciones[0]?.id;
      this.form.controls.diagnosticoId.setValue(id === undefined || id === null ? '' : String(id));
      // Dispara la búsqueda automáticamente
      this.buscar();
    }
  }

  // MÉTODOS PRIVADOS
  private toAppliedFilters(filtros: ReporteAtencionesFilters): ReporteAtencionesAppliedFilters {
    return {
      psicologoCedula: filtros.psicologoCedula ?? null,
      cedula: filtros.cedula ?? null,
      unidadMilitar: filtros.unidadMilitar ?? null,
      fechaDesde: filtros.fechaDesde ?? null,
      fechaHasta: filtros.fechaHasta ?? null,
      diagnosticoId: filtros.diagnosticoId ?? null,
      psicologoId: null
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
}