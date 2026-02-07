import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { buildApiUrl } from '../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';
import { Cie10LookupComponent } from '../../reports/shared/cie10-lookup.component';
import {
  FICHA_CONDICION_CLINICA_OPCIONES,
  FICHA_PLAN_FRECUENCIAS,
  FICHA_PLAN_TIPOS_SESION,
  FichaCondicionFinal,
  FichaPlanFrecuencia,
  FichaPlanTipoSesion
} from '../../models/fichas-psicologicas.models';

type SeguimientoModalResult = {
  success: boolean;
  condicion?: FichaCondicionFinal;
  diagnosticosCie10?: any[];
  plan?: any;
  transferencia?: any;
};


@Component({
  selector: 'app-seguimiento-modal',
  templateUrl: './seguimiento-modal.component.html',
  // styleUrls eliminado para evitar error NG2008
  imports: [CommonModule, ReactiveFormsModule, Cie10LookupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoModalComponent {
  @ViewChild(Cie10LookupComponent) cie10Lookup?: Cie10LookupComponent;
  // ============ SERVICIOS ============
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // ============ INPUTS ============
  readonly visible = input(false);
  readonly fichaId = input<number | null>(null);
  readonly guardando = input(false);
  readonly personalMilitarId = input<number | null>(null);

  // ============ OUTPUTS ============
  readonly seguimientoCancel = output<void>();
  readonly seguimientoSubmit = output<SeguimientoModalResult>();

  // ============ SEÑALES ============
  readonly submitError = signal<string | null>(null);
  readonly intentoEnvio = signal(false);
  // Para selección múltiple de diagnósticos
  readonly diagnosticosSeleccionados = signal<any[]>([]);
  // No hay condición seleccionada por defecto
  readonly condicionSignal = signal<FichaCondicionFinal | null>(null);

  // ============ DATOS CONSTANTES ============
  readonly condicionOpciones = FICHA_CONDICION_CLINICA_OPCIONES.filter(opcion =>
    opcion.value === 'ALTA' || opcion.value === 'SEGUIMIENTO' || opcion.value === 'TRANSFERENCIA'
  );
  readonly planFrecuenciaOpciones = FICHA_PLAN_FRECUENCIAS;
  readonly planTipoSesionOpciones = FICHA_PLAN_TIPOS_SESION;

  // ============ FORMULARIO ============
  readonly form = this.fb.group({
    condicion: this.fb.control<FichaCondicionFinal | null>(null, { validators: [Validators.required] }),
    observaciones: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(5), Validators.maxLength(4000)] }),
    diagnosticoId: this.fb.control<string | null>(null),
    planFrecuencia: this.fb.control<FichaPlanFrecuencia | null>(null),
    planTipoSesion: this.fb.control<FichaPlanTipoSesion | null>(null),
    planDetalle: this.fb.control<string | null>(null, { validators: [Validators.maxLength(2000)] }),
    proximoSeguimiento: this.fb.control<string | null>(null),
    transferenciaUnidad: this.fb.control<string | null>(null, { validators: [Validators.maxLength(500)] }),
    transferenciaObservacion: this.fb.control<string | null>(null, { validators: [Validators.maxLength(2000)] })
  });

  // ============ COMPUTED PROPERTIES ============
  readonly condicionSeleccionada = computed(() => this.condicionSignal());
  readonly requiereDiagnostico = computed(() => 
    this.condicionSeleccionada() === 'SEGUIMIENTO' || this.condicionSeleccionada() === 'TRANSFERENCIA'
  );
  readonly diagnosticoRequerido = computed(() => this.requiereDiagnostico());
  readonly mostrarPlan = computed(() => this.condicionSeleccionada() === 'SEGUIMIENTO');
  readonly mostrarTransferencia = computed(() => this.condicionSeleccionada() === 'TRANSFERENCIA');
  readonly requiereProximo = computed(() => (this.form.controls.planFrecuencia.value ?? null) === 'PERSONALIZADA');

  readonly titulo = computed(() => 'Asignar Condición y Diagnóstico');

  // ============ CONSTRUCTOR Y SETUP ============
  constructor() {
    // Suscripción a cambios de condición
    this.form.controls.condicion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.condicionSignal.set(value);
      // Limpiar campos según la condición
      if (value !== 'SEGUIMIENTO') {
        this.form.controls.planFrecuencia.setValue(null, { emitEvent: false });
        this.form.controls.planTipoSesion.setValue(null, { emitEvent: false });
        this.form.controls.planDetalle.setValue(null, { emitEvent: false });
        this.form.controls.proximoSeguimiento.setValue(null, { emitEvent: false });
      }
      if (value !== 'TRANSFERENCIA') {
        this.form.controls.transferenciaUnidad.setValue(null, { emitEvent: false });
        this.form.controls.transferenciaObservacion.setValue(null, { emitEvent: false });
      }
      if (value === 'ALTA') {
        this.limpiarDiagnostico();
      }
      this.cdr.markForCheck();
    });

    // Suscripción a cambios de frecuencia
    this.form.controls.planFrecuencia.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.requiereProximo()) {
        this.form.controls.proximoSeguimiento.setValue(null, { emitEvent: false });
      }
    });

    // Efecto para resetear al abrir
    effect(() => {
      if (this.visible()) {
        // No poner 'ALTA' por defecto, dejar null y mostrar error si no selecciona
        this.resetForm();
        this.condicionSignal.set(null);
        this.form.controls.condicion.setValue(null, { emitEvent: false });
        this.verificarDatos();
      }
    });
  }

  // ============ MÉTODOS PÚBLICOS ============
  seleccionarCondicion(condicion: FichaCondicionFinal) {
    this.submitError.set(null);
    this.condicionSignal.set(condicion);
    // Refuerza la actualización del control y la señal
    this.form.controls.condicion.setValue(condicion, { emitEvent: true });
    // Forzar update y log para depuración
    setTimeout(() => {
      console.log('[DEBUG] Condición seleccionada:', condicion);
      console.log('[DEBUG] Valor en form.controls.condicion:', this.form.controls.condicion.value);
      console.log('[DEBUG] Valor en condicionSignal:', this.condicionSignal());
    });
    this.cdr.markForCheck();
  }


  // Selección múltiple de diagnósticos
  onCie10MultiSelection(items: CatalogoCIE10DTO[] | null) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      // Si el usuario limpia la selección, no hacemos nada (no borramos la lista actual ni bloqueamos el input)
      return;
    }
    // Solo tomamos el último diagnóstico seleccionado
    const nuevo = this.toDiagnosticoSnapshot(items[items.length - 1]);
    const actuales = this.diagnosticosSeleccionados();
    // Evitar duplicados por id
    if (!actuales.some(dx => dx.id === nuevo.id)) {
      this.diagnosticosSeleccionados.set([...actuales, nuevo]);
    }
    // Limpiar la barra de búsqueda tras cada selección
    this.clearCie10Lookup();
  }

  private clearCie10Lookup() {
    // Esperar al siguiente ciclo para asegurar que el componente está disponible
    setTimeout(() => {
      this.cie10Lookup?.clearSelection();
    });
  }

  eliminarDiagnostico(id: any) {
    const actuales = this.diagnosticosSeleccionados();
    this.diagnosticosSeleccionados.set(actuales.filter(dx => dx.id !== id));
  }

  limpiarDiagnostico() {
    this.form.controls.diagnosticoId.reset(null);
    this.diagnosticosSeleccionados.set([]);
  }

  handleCancel() {
    if (this.guardando()) return;
    this.seguimientoCancel.emit();
  }

  async handleSubmit(event?: Event) {
    if (event) event.preventDefault();
    
    this.intentoEnvio.set(true);
    this.submitError.set(null);
    this.form.markAllAsTouched();

    // 1. Validación de IDs
    const fichaId = this.fichaId();
    const personalMilitarId = this.personalMilitarId();
    
    console.log('[MODAL] Validando IDs:', { fichaId, personalMilitarId });
    
    if (!fichaId || !personalMilitarId) {
      const fichaMsg = fichaId ? '' : '• ID de ficha no disponible\n';
      const personalMsg = personalMilitarId ? '' : '• ID de personal no disponible\n';
      this.submitError.set(`
        ❌ Faltan datos esenciales:
        ${fichaMsg}${personalMsg}
        Por favor, guarda la ficha completa antes de asignar condiciones.
      `);
      return;
    }

    // 2. Validación del formulario
    if (this.form.invalid) {
      this.submitError.set('Revisa la información del seguimiento.');
      return;
    }

    // 3. Validación específica por condición
    const condicion = this.form.controls.condicion.value;
    console.log('[DEBUG] handleSubmit - condicion en form:', condicion);
    if (!condicion || !['ALTA', 'SEGUIMIENTO', 'TRANSFERENCIA'].includes(condicion)) {
      this.submitError.set('Debes seleccionar una condición válida.');
      return;
    }

    if (this.requiereDiagnostico() && !(this.diagnosticosSeleccionados()?.length)) {
      this.submitError.set('Selecciona al menos un diagnóstico válido del catálogo CIE-10.');
      return;
    }

    if (this.mostrarPlan()) {
      if (!this.planFrecuenciaValida()) {
        this.submitError.set('Indica la frecuencia del plan de seguimiento.');
        return;
      }
      if (!this.planTipoSesionValido()) {
        this.submitError.set('Selecciona el tipo de sesión planificada.');
        return;
      }
      if (this.requiereProximo() && !this.proximoValido()) {
        this.submitError.set('Ingresa la fecha del próximo seguimiento.');
        return;
      }
    }

    if (this.mostrarTransferencia()) {
      if (!this.transferenciaUnidadValida()) {
        this.submitError.set('Registra la unidad de destino para la transferencia.');
        return;
      }
      if (!this.transferenciaObservacionValida()) {
        this.submitError.set('Describe las observaciones de la transferencia.');
        return;
      }
    }

    // 4. Construir payload SOLO si la condición es válida y seleccionada
    const payload = this.buildPayload();
    if (!payload) {
      this.submitError.set('Error al construir los datos para enviar.');
      return;
    }

    // 5. Enviar al backend
    try {
      const token = this.authService.getToken?.() || localStorage.getItem('access_token') || '';
      const endpoint = buildApiUrl('gestion', `/fichas-psicologicas/${fichaId}/condicion`);
      
      console.log('[MODAL] Enviando a:', endpoint);
      console.log('[MODAL] Payload:', payload);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMsg = 'No se pudo asignar la condición';
        try {
          const errorJson = await response.json();
          if (errorJson?.message) errorMsg = errorJson.message;
          else if (typeof errorJson === 'string') errorMsg = errorJson;
        } catch {
          const errorText = await response.text();
          if (errorText) errorMsg = errorText;
        }
        console.error('[MODAL] Error en respuesta:', errorMsg);
        this.submitError.set(`Error: ${errorMsg}`);
        return;
      }

      // 6. Éxito - emitir resultado
      console.log('[MODAL] Condición asignada exitosamente');
      // Emitir solo si la condición es válida (nunca null)
      const condicionEmit = this.condicionSeleccionada()!;
      this.seguimientoSubmit.emit({
        success: true,
        condicion: condicionEmit,
        diagnosticosCie10: this.diagnosticosSeleccionados(),
        plan: this.mostrarPlan() ? {
          frecuencia: this.form.controls.planFrecuencia.value,
          tipoSesion: this.form.controls.planTipoSesion.value,
          detalle: this.form.controls.planDetalle.value,
          proximoSeguimiento: this.form.controls.proximoSeguimiento.value
        } : null,
        transferencia: this.mostrarTransferencia() ? {
          unidad: this.form.controls.transferenciaUnidad.value,
          observacion: this.form.controls.transferenciaObservacion.value
        } : null
      });
    } catch (err: any) {
      console.error('[MODAL] Error en fetch:', err);
      this.submitError.set(`Error de red: ${err?.message || 'No se pudo conectar con el servidor'}`);
    }
  }

  // ============ MÉTODOS PRIVADOS ============
  private resetForm() {
    this.intentoEnvio.set(false);
    this.submitError.set(null);
    this.form.reset({
      condicion: null,
      observaciones: '',
      diagnosticoId: null,
      planFrecuencia: null,
      planTipoSesion: null,
      planDetalle: null,
      proximoSeguimiento: null,
      transferenciaUnidad: null,
      transferenciaObservacion: null
    });
    this.condicionSignal.set(null);
    this.diagnosticosSeleccionados.set([]);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private verificarDatos() {
    const fichaId = this.fichaId();
    const personalMilitarId = this.personalMilitarId();
    
    if (!fichaId || !personalMilitarId) {
      console.error('[MODAL] Error: Faltan datos:', { fichaId, personalMilitarId });
      this.submitError.set('Error: No se recibieron los datos necesarios. Cierra y vuelve a intentar.');
    }
  }

  private buildPayload(): any {
    const condicion = this.form.controls.condicion.value;
    // Buscar el label completo de la condición seleccionada
    const opcion = this.condicionOpciones.find(op => op.value === condicion);
    const condicionLabel = opcion ? opcion.label : condicion;
    if (condicion === 'ALTA') {
      return {
        condicion: condicionLabel,
        diagnosticoCie10Codigo: null,
        diagnosticoCie10Nombre: null,
        diagnosticoCie10CategoriaPadre: null,
        diagnosticoCie10Nivel: null,
        diagnosticoCie10Descripcion: null,
        planFrecuencia: null,
        planTipoSesion: null,
        planDetalle: null,
        proximoSeguimiento: null,
        transferenciaUnidad: null,
        transferenciaObservacion: null
      };
    }
    if (condicion === 'SEGUIMIENTO') {
      return {
        condicion: condicionLabel,
        diagnosticosCie10: this.diagnosticosSeleccionados(),
        planFrecuencia: this.form.controls.planFrecuencia.value,
        planTipoSesion: this.form.controls.planTipoSesion.value,
        planDetalle: this.form.controls.planDetalle.value,
        proximoSeguimiento: this.form.controls.proximoSeguimiento.value,
        transferenciaUnidad: null,
        transferenciaObservacion: null
      };
    }
    if (condicion === 'TRANSFERENCIA') {
      return {
        condicion: condicionLabel,
        diagnosticosCie10: this.diagnosticosSeleccionados(),
        planFrecuencia: null,
        planTipoSesion: null,
        planDetalle: null,
        proximoSeguimiento: null,
        transferenciaUnidad: this.form.controls.transferenciaUnidad.value,
        transferenciaObservacion: this.form.controls.transferenciaObservacion.value
      };
    }
    return null;
  }

  private toDiagnosticoSnapshot(item: CatalogoCIE10DTO): any {
    return {
      id: item.id ?? null,
      codigo: item.codigo ?? null,
      nombre: item.nombre ?? null,
      descripcion: item.descripcion ?? null,
      categoriaPadre: item.categoriaPadre ?? null,
      nivel: item.nivel ?? null
    };
  }

  private redirectToHistorial(personalMilitarId: number) {
    // Opcional: Redirigir al historial después de éxito
    setTimeout(() => {
      globalThis.location.href = `/psicologo/personal/${personalMilitarId}/historial`;
    }, 1000);
  }

  // ============ VALIDACIONES ESPECÍFICAS ============
  planFrecuenciaValida(): boolean {
    const value = this.form.controls.planFrecuencia.value;
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  planTipoSesionValido(): boolean {
    const value = this.form.controls.planTipoSesion.value;
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  proximoValido(): boolean {
    const value = this.form.controls.proximoSeguimiento.value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    }
    return false;
  }

  transferenciaUnidadValida(): boolean {
    const value = this.form.controls.transferenciaUnidad.value;
    return typeof value === 'string' && value.trim().length > 2;
  }

  transferenciaObservacionValida(): boolean {
    const value = this.form.controls.transferenciaObservacion.value;
    return typeof value === 'string' && value.trim().length > 5;
  }
}