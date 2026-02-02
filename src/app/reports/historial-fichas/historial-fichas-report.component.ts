import { Router } from '@angular/router';
// components/historial-fichas-report.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ProgramarSeguimientoModalComponent } from '../../psicologo/atenciones/programar-seguimiento-modal.component';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import {
  ReporteHistorialFichaDTO,
  ReporteHistorialSeguimientoDTO,
  ReporteHistorialFichasFilters,
  ReporteHistorialFichasResponse,
  FiltroResumenItem,
  ReporteHistorialFichasAppliedFilters
} from '../../models/reportes.models';

@Component({
  selector: 'app-historial-fichas-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProgramarSeguimientoModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-fichas-report.component.html',
  styleUrls: ['./historial-fichas-report.component.scss']
})
export class HistorialFichasReportComponent {
  // Modal de seguimiento
  readonly mostrarModalSeguimiento = signal(false);
  readonly seguimientoFicha = signal<ReporteHistorialFichaDTO|null>(null);
  readonly seguimientoError = signal<string|null>(null);
  readonly seguimientoCargando = signal(false);
  readonly seguimientoMensajeExito = signal<string|null>(null);

  abrirModalSeguimiento(ficha: any) {
    this.seguimientoFicha.set(ficha);
    this.mostrarModalSeguimiento.set(true);
    this.seguimientoError.set(null);
    this.seguimientoMensajeExito.set(null);
  }

  cerrarModalSeguimiento() {
    this.mostrarModalSeguimiento.set(false);
    this.seguimientoFicha.set(null);
    this.seguimientoError.set(null);
    this.seguimientoMensajeExito.set(null);
  }

  guardarSeguimiento() {
    const ficha = this.seguimientoFicha();
    if (!ficha) return;
    this.seguimientoCargando.set(true);
    this.seguimientoError.set(null);
    // Construir el modelo a enviar
    const data = {
      fichaPsicologicaId: ficha.fichaId,
      psicologoId: ficha.psicologoId,
      fechaAtencion: '',
      horaInicio: '',
      horaFin: '',
      motivoConsulta: '',
      planIntervencion: '',
      recomendaciones: '',
      diagnosticoIds: [],
      proximaCita: '',
      observacionesProximaCita: ''
    };
    fetch('http://localhost:8080/api/atenciones/seguimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(async resp => {
        if (!resp.ok) throw new Error('Error al programar seguimiento');
        this.seguimientoMensajeExito.set('Seguimiento programado correctamente');
        this.seguimientoCargando.set(false);
        setTimeout(() => {
          this.cerrarModalSeguimiento();
          globalThis.location.href = '/psicologo/atenciones';
        }, 1200);
      })
      .catch(err => {
        this.seguimientoError.set(err.message || 'Error al programar seguimiento');
        this.seguimientoCargando.set(false);
      });
  }
  private readonly router = inject(Router);
    // Devuelve el personalId si está disponible en los resultados
    personalIdDisponible(): boolean {
      const resultados = this.resultados();
      if (!resultados || resultados.length === 0) return false;
      // Tomar el primer resultado válido
      const id = resultados[0]?.personalMilitarId;
      return typeof id === 'number' && id > 0;
    }

    // Navega al formulario de nueva evaluación (ficha psicológica) para el personal consultado
    crearEvaluacion(): void {
      const resultados = this.resultados();
      if (!resultados || resultados.length === 0) return;
      const personalId = resultados[0]?.personalMilitarId;
      if (typeof personalId === 'number' && personalId > 0) {
        // Redirige directamente al formulario de ficha psicológica para el personal
        this.router.navigate(['/psicologo/valoracion/nueva', personalId]);
      }
    }
  // Solo una versión de cada método utilitario, sin duplicados
  removerFiltro(filtro: any) {
    const form = this.form as any;
    if (filtro.etiqueta === 'Cédula') {
      form.controls.cedula.setValue('');
    }
    // Para el checkbox se maneja de forma diferente
    this.buscar();
  }
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReportesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    cedula: this.fb.control('', { validators: [Validators.maxLength(20)] }),
    incluirSeguimientos: this.fb.control(false)
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultados = signal<ReporteHistorialFichaDTO[]>([]);
  readonly filtrosAplicados = signal<ReporteHistorialFichasAppliedFilters | null>(null);
  readonly busquedaEjecutada = signal(false);

  readonly filtrosResumen = computed<FiltroResumenItem[]>(() => {
    const filtros = this.filtrosAplicados();
    if (!filtros) return [];
    const resumen: FiltroResumenItem[] = [];
    if (filtros.cedula) {
      resumen.push({ etiqueta: '🆔 Cédula', valor: filtros.cedula });
    }
    if (filtros.incluirSeguimientos !== undefined && filtros.incluirSeguimientos !== null) {
      resumen.push({ 
        etiqueta: '🔄 Seguimientos', 
        valor: filtros.incluirSeguimientos ? 'Incluidos' : 'No incluidos' 
      });
    }
    return resumen;
  });

  readonly fichasActuales = computed(() => 
    this.resultados().filter(ficha => !this.esHistorica(ficha))
  );
  
  readonly fichasHistoricas = computed(() => 
    this.resultados().filter(ficha => this.esHistorica(ficha))
  );
  
  readonly sinResultados = computed(() => 
    !this.error() && !this.resultados().length
  );

  private readonly dateFormatter = new Intl.DateTimeFormat('es-EC', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  buscar() {
    if (this.loading()) return;

    const raw = this.form.getRawValue();
    const cedula = String(raw.cedula ?? '').trim().toUpperCase();

    if (!cedula.length) {
      this.error.set('❌ Ingresa una cédula para consultar el historial.');
      this.resultados.set([]);
      this.filtrosAplicados.set(null);
      this.busquedaEjecutada.set(false);
      return;
    }

    const incluirSeguimientos = raw.incluirSeguimientos === true;
    const filtros: ReporteHistorialFichasFilters = {
      cedula: cedula || undefined,
      incluirSeguimientos: incluirSeguimientos ? true : undefined
    };

    this.loading.set(true);
    this.error.set(null);

    this.reportes.obtenerHistorialFichas(filtros).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading.set(false);
        this.busquedaEjecutada.set(true);
      }),
      catchError(() => {
        const filtrosAplicados = this.toAppliedFilters(filtros);
        this.error.set('❌ No fue posible obtener el historial. Intenta nuevamente.');
        this.resultados.set([]);
        this.filtrosAplicados.set(filtrosAplicados);
        return of<ReporteHistorialFichasResponse>({ 
          resultados: [], 
          filtros: filtrosAplicados 
        });
      })
    ).subscribe((respuesta: ReporteHistorialFichasResponse) => {
      const datos = respuesta.resultados || [];
      const filtrosRespuesta = respuesta.filtros || this.toAppliedFilters(filtros);
      this.resultados.set(datos);
      this.filtrosAplicados.set(filtrosRespuesta);
    });
  }

  limpiar() {
    this.form.reset({ 
      cedula: '', 
      incluirSeguimientos: false 
    });
    this.loading.set(false);
    this.error.set(null);
    this.resultados.set([]);
    this.filtrosAplicados.set(null);
    this.busquedaEjecutada.set(false);
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return 'Sin registros';
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha;
    return this.dateFormatter.format(parsed);
  }

  diagnosticoPrincipal(ficha: ReporteHistorialFichaDTO): string {
    if (ficha.diagnosticoCodigo && ficha.diagnosticoDescripcion) {
      return `${ficha.diagnosticoCodigo} · ${ficha.diagnosticoDescripcion}`;
    }
    return ficha.diagnosticoCodigo || ficha.diagnosticoDescripcion || 'Sin diagnóstico';
  }

  trackFicha(ficha: ReporteHistorialFichaDTO): string {
    const id = typeof ficha.fichaId === 'number' && Number.isFinite(ficha.fichaId) 
      ? String(ficha.fichaId) 
      : undefined;
    const numero = ficha.numeroFicha?.trim();
    return id || numero || `${ficha.fechaEvaluacion ?? 'ficha'}-${ficha.diagnosticoCodigo ?? 'dx'}`;
  }

  trackSeguimiento(seguimiento: ReporteHistorialSeguimientoDTO): string {
    const id = typeof seguimiento.seguimientoId === 'number' && Number.isFinite(seguimiento.seguimientoId) 
      ? String(seguimiento.seguimientoId) 
      : undefined;
    return id || `${seguimiento.fecha ?? 'seguimiento'}-${seguimiento.descripcion ?? ''}`;
  }

  getBadgeClass(estado: string | null | undefined): string {
    if (!estado) return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600';
    
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('activa') || estadoLower.includes('alta')) {
      return 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700';
    } else if (estadoLower.includes('observacion') || estadoLower.includes('seguimiento')) {
      return 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700';
    } else if (estadoLower.includes('transferencia') || estadoLower.includes('baja')) {
      return 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700';
    }
    
    return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600';
  }

  private esHistorica(ficha: ReporteHistorialFichaDTO): boolean {
    const origen = ficha.origen?.trim().toUpperCase();
    return origen === 'HISTORICO' || origen === 'HISTÓRICO';
  }

  private toAppliedFilters(filtros: ReporteHistorialFichasFilters): ReporteHistorialFichasAppliedFilters {
    return {
      personalMilitarId: null,
      cedula: filtros.cedula ?? null,
      incluirSeguimientos: filtros.incluirSeguimientos ?? false
    };
  }
}