
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import { ReporteSeguimientoTransferenciaDTO, ReporteSeguimientoFilters } from '../../models/reportes.models';
import { AuthService } from '../../services/auth.service';
import { PsicologosLookupService, PsicologoOption } from '../shared/psicologos-lookup.service';

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
  // TrackBy para psicólogos en el select (adaptado para aceptar cualquier objeto)
  trackPsicologo(index: number, psicologo: any): string | number {
    return psicologo.id || psicologo.psicologoId || index;
  }

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
    if (filtro.etiqueta === 'Psicólogo') {
      form.controls.psicologoId.setValue('');
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

  exportarExcel() {
    console.log('Exportando a Excel...', this.resultados());
    alert('Exportación a Excel: Esta funcionalidad está en desarrollo');
  }
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReportesService);
  private readonly auth = inject(AuthService);
  private readonly psicologosLookup = inject(PsicologosLookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    psicologoId: this.fb.control(''),
    fechaDesde: this.fb.control(''),
    fechaHasta: this.fb.control(''),
    cedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    unidadMilitar: this.fb.control('', { validators: [Validators.maxLength(120)] })
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultados = signal<ReporteSeguimientoTransferenciaDTO[]>([]);
  readonly psicologos = signal<PsicologoOption[]>([]);
  readonly psicologosCargando = signal(false);
  readonly busquedaEjecutada = signal(false);
  readonly psicologoForzado = signal<string | null>(null);
  readonly filtrosAplicados = signal<ReporteSeguimientoFilters | null>(null);

  readonly filtrosResumen = computed<FiltroResumenItem[]>(() => {
    const filtros = this.filtrosAplicados();
    if (!filtros) {
      return [];
    }
    const resumen: FiltroResumenItem[] = [];
    if (filtros.psicologoId !== null && filtros.psicologoId !== undefined) {
      const psicologo = this.psicologos().find(op => op.id === filtros.psicologoId);
      resumen.push({ etiqueta: 'Psicólogo', valor: psicologo?.nombre ?? String(filtros.psicologoId) });
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
  private readonly isInitialized = signal(false);

  constructor() {

    this.cargarPsicologos();

    effect(() => {
      const esPsicologo = this.auth.isPsicologo();
      const usuario = this.auth.currentUser();
      const opciones = this.psicologos();
      if (!esPsicologo) {
        // Si no es psicólogo, no forzar valor y dejar el filtro habilitado
        this.psicologoForzado.set(null);
        if (this.form.controls.psicologoId.disabled) {
          this.form.controls.psicologoId.enable({ emitEvent: false });
        }
        // Limpia el valor si el usuario no es psicólogo
        if (this.form.controls.psicologoId.value) {
          this.form.controls.psicologoId.setValue('', { emitEvent: false });
        }
        return;
      }
      // Solo forzar si el usuario es psicólogo y existe en la lista de opciones
      const forcedId = this.resolvePsicologoId(usuario?.id, usuario?.username, opciones);
      const existe = opciones.some(op => String(op.id) === String(forcedId));
      if (!existe) {
        console.warn('[CondicionSeguimientoReport] El usuario psicólogo actual no está en la lista de opciones:', usuario, opciones);
        this.psicologoForzado.set(null);
        if (this.form.controls.psicologoId.disabled) {
          this.form.controls.psicologoId.enable({ emitEvent: false });
        }
        if (this.form.controls.psicologoId.value) {
          this.form.controls.psicologoId.setValue('', { emitEvent: false });
        }
        return;
      }
      const forcedValue = String(forcedId);
      this.psicologoForzado.set(forcedValue);
      if (this.form.controls.psicologoId.value !== forcedValue) {
        this.form.controls.psicologoId.setValue(forcedValue, { emitEvent: false });
      }
      if (!this.form.controls.psicologoId.disabled) {
        this.form.controls.psicologoId.disable({ emitEvent: false });
      }
    });

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

    const cedula = raw.cedula.trim().toUpperCase();
    const unidad = raw.unidadMilitar.trim();
    const psicologoRaw = raw.psicologoId.trim();
    const psicologoId = psicologoRaw.length ? Number(psicologoRaw) : undefined;

    const filtros: ReporteSeguimientoFilters & { incluirSeguimientos: boolean } = {
      psicologoId: Number.isFinite(psicologoId) ? psicologoId : undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      cedula: cedula || undefined,
      unidadMilitar: unidad || undefined,
      incluirSeguimientos: true
    };

    this.loading.set(true);
    this.error.set(null);

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
        return;
      }
      this.resultados.set(Array.isArray(respuesta.resultados) ? respuesta.resultados : []);
      this.filtrosAplicados.set(respuesta.filtros ?? this.toAppliedFilters(filtros));
    });
  }

  limpiar() {
    const forced = this.psicologoForzado();
    this.form.patchValue({
      psicologoId: forced ?? '',
      fechaDesde: '',
      fechaHasta: '',
      cedula: '',
      unidadMilitar: ''
    });
    if (forced === null && this.form.controls.psicologoId.disabled) {
      this.form.controls.psicologoId.enable({ emitEvent: false });
    }
    if (forced !== null && !this.form.controls.psicologoId.disabled) {
      this.form.controls.psicologoId.disable({ emitEvent: false });
    }
    this.resultados.set([]);
    this.filtrosAplicados.set(null);
    this.error.set(null);
    this.busquedaEjecutada.set(false);
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


  private cargarPsicologos() {
    this.psicologosCargando.set(true);
    this.psicologosLookup.obtenerOpciones().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.psicologosCargando.set(false))
    ).subscribe(list => {
      this.psicologos.set(list);
    });
  }

  private resolvePsicologoId(id?: number | null, username?: string | null | undefined, opciones: PsicologoOption[] = []): number | null {
    if (typeof id === 'number' && Number.isFinite(id)) {
      return Number(id);
    }
    if (username) {
      const normalizado = username.trim().toLowerCase();
      const coincidencia = opciones.find(op => op.username.trim().toLowerCase() === normalizado);
      if (coincidencia) {
        return Number(coincidencia.id);
      }
    }
    return null;
  }

  private toAppliedFilters(filtros: ReporteSeguimientoFilters): ReporteSeguimientoFilters {
    return {
      psicologoId: typeof filtros.psicologoId === 'number' && Number.isFinite(filtros.psicologoId) ? filtros.psicologoId : undefined,
      fechaDesde: filtros.fechaDesde || undefined,
      fechaHasta: filtros.fechaHasta || undefined,
      cedula: filtros.cedula || undefined,
      unidadMilitar: filtros.unidadMilitar || undefined
    };
  }
}
