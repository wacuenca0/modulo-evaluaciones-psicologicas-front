// Removed duplicate class and misplaced methods at the top of the file. All methods are now inside the single class definition below.
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FichaCondicionClinicaPayload,
  FichaCondicionFinalPayload,
  FichaObservacionClinicaPayload,
  FichaPsicoanamnesisPayload,
  FichaPsicologicaCreacionInicialDTO,
  FichaPsicologicaHistorialDTO
} from '../models/fichas-psicologicas.models';

@Injectable({ providedIn: 'root' })
export class FichasPsicologicasService {

    /**
     * Obtiene el número de ficha de preview (siguiente disponible).
     */
    obtenerNumeroPreview(): Observable<{ numeroEvaluacion: string }> {
      const url = `${this.baseUrl}/fichas-psicologicas/numero-preview`;
      return this.http.get<{ numeroEvaluacion: string }>(url);
    }

    /**
     * Cambia el estado de la ficha por id.
     */
    cambiarEstadoFicha(fichaId: number, nuevoEstado: string): Observable<void> {
      // Solo permitir los estados válidos
      const estadosValidos = ['Abierta', 'Cerrada', 'Observación'];
      if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error('Estado no permitido');
      }
      const url = `${this.baseUrl}/fichas-psicologicas/${fichaId}/estado`;
      return this.http.patch<void>(url, { estado: nuevoEstado });
    }

    // ============ NUEVAS SECCIONES ============

    /**
     * Guarda Adolescencia, Juventud y Adultez
     */
    guardarAdolescencia(fichaId: number, data: any): Observable<FichaPsicologicaHistorialDTO> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/adolescencia`;
      return this.http.put<FichaPsicologicaHistorialDTO>(url, data);
    }

    /**
     * Guarda Psicoanamnesis Familiar
     */
    guardarFamiliar(fichaId: number, data: any): Observable<FichaPsicologicaHistorialDTO> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/familiar`;
      return this.http.put<FichaPsicologicaHistorialDTO>(url, data);
    }

    /**
     * Guarda Exámenes de Funciones Psicológicas
     */
    guardarFunciones(fichaId: number, data: any): Observable<FichaPsicologicaHistorialDTO> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/funciones-psicologicas`;
      return this.http.put<FichaPsicologicaHistorialDTO>(url, data);
    }

    /**
     * Guarda Rasgos de Personalidad y Exámenes Psicológicos
     */
    guardarRasgos(fichaId: number, data: any): Observable<FichaPsicologicaHistorialDTO> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/rasgos-examenes`;
      return this.http.put<FichaPsicologicaHistorialDTO>(url, data);
    }

    /**
     * Guarda Formulación Etiopatogénica y Pronóstico
     */
    guardarEtiopatogenica(fichaId: number, data: any): Observable<FichaPsicologicaHistorialDTO> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/etiopatogenica-pronostico`;
      return this.http.put<FichaPsicologicaHistorialDTO>(url, data);
    }

    // ============ DOCUMENTOS ============

    /**
     * Obtiene documentos de respaldo de la ficha
     */
    obtenerDocumentos(fichaId: number): Observable<any[]> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/documentos`;
      return this.http.get<any[]>(url);
    }

    /**
     * Sube un documento de respaldo
     */
    subirDocumento(fichaId: number, archivo: File, descripcion?: string): Observable<any> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/documentos`;
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (descripcion) {
        formData.append('descripcion', descripcion);
      }
      return this.http.post<any>(url, formData);
    }

    /**
     * Elimina un documento de respaldo
     */
    eliminarDocumento(fichaId: number, documentoId: number): Observable<void> {
      const id = Number(fichaId);
      const url = `${this.baseUrl}/fichas-psicologicas/${id}/documentos/${documentoId}`;
      return this.http.delete<void>(url);
    }
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (environment as any).api?.gestionBaseUrl || '/gestion/api';

  obtenerHistorial(personalMilitarId: number): Observable<FichaPsicologicaHistorialDTO[]> {
    const url = `${this.baseUrl}/fichas-psicologicas/historial/${personalMilitarId}`;
    return this.http
      .get<FichaPsicologicaHistorialDTO[] | null>(url)
      .pipe(map(res => Array.isArray(res) ? res : []));
  }

  crearFichaInicial(payload: FichaPsicologicaCreacionInicialDTO): Observable<FichaPsicologicaHistorialDTO> {
    const url = `${this.baseUrl}/fichas-psicologicas`;
    return this.http.post<FichaPsicologicaHistorialDTO>(url, this.toSeccionGeneralPayload(payload));
  }

  actualizarFichaGeneral(fichaId: number, payload: FichaPsicologicaCreacionInicialDTO): Observable<FichaPsicologicaHistorialDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/general`;
    return this.http.put<FichaPsicologicaHistorialDTO>(url, this.toSeccionGeneralPayload(payload));
  }

  obtenerFichaCompleta(fichaId: number): Observable<FichaPsicologicaHistorialDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}`;
    return this.http.get<FichaPsicologicaHistorialDTO>(url);
  }

  actualizarObservacionClinica(fichaId: number, payload: FichaObservacionClinicaPayload): Observable<FichaPsicologicaHistorialDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/observacion`;
    return this.http.put<FichaPsicologicaHistorialDTO>(url, this.toObservacionPayload(payload));
  }

  actualizarPsicoanamnesis(fichaId: number, payload: FichaPsicoanamnesisPayload): Observable<FichaPsicologicaHistorialDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/psicoanamnesis`;
    return this.http.put<FichaPsicologicaHistorialDTO>(url, this.toPsicoanamnesisPayload(payload));
  }

  actualizarCondicionClinica(fichaId: number, payload: FichaCondicionClinicaPayload): Observable<FichaPsicologicaHistorialDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/condicion`;
    return this.http.put<FichaPsicologicaHistorialDTO>(url, this.toCondicionClinicaPayload(payload));
  }

  registrarCondicionFinal(fichaId: number, payload: FichaCondicionFinalPayload): Observable<FichaPsicologicaHistorialDTO> {
    return this.actualizarCondicionClinica(Number(fichaId), payload);
  }

  private resolveBaseUrl(): string {
    // Usar api.baseUrl + '/api' para que apunte a http://localhost:8080/api
    const base = (environment as { api?: { baseUrl?: string } }).api?.baseUrl || '';
    if (!base) {
      return '/api';
    }
    return `${base}/api`.replace(/\/$/, '');
  }

  private toSeccionGeneralPayload(payload: FichaPsicologicaCreacionInicialDTO): Record<string, unknown> {
    // El backend espera camelCase: personalMilitarId, fechaEvaluacion, tipoEvaluacion, estado
    const body: Record<string, unknown> = {
      personalMilitarId: Number(payload.personalMilitarId),
      tipoEvaluacion: this.normalizedRequired(payload.tipoEvaluacion),
      estado: this.normalizedRequired(payload.estado)
    };
    const fecha = this.normalizedOrUndefined(payload.fechaEvaluacion);
    if (fecha) {
      body['fechaEvaluacion'] = fecha;
    }
    return body;
  }

  private toObservacionPayload(payload: FichaObservacionClinicaPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      observacion_clinica: this.normalizedRequired(payload.observacionClinica),
      motivo_consulta: this.normalizedRequired(payload.motivoConsulta)
    };

    const enfermedad = this.normalizedOrNull(payload.enfermedadActual);
    if (enfermedad !== undefined) {
      body['enfermedad_actual'] = enfermedad;
    }

    const historia = this.buildObservacionHistoria(payload.historiaPasadaEnfermedad);
    if (historia) {
      body['historia_pasada_enfermedad'] = historia;
    }

    return body;
  }

  private buildObservacionHistoria(historia?: FichaObservacionClinicaPayload['historiaPasadaEnfermedad']): Record<string, unknown> | undefined {
    if (!historia) {
      return undefined;
    }

    const hospitalizacion = this.buildSection({
      requiere: this.normalizeOptionalBoolean(historia.hospitalizacionRehabilitacion?.requiere),
      tipo: this.normalizedOrNull(historia.hospitalizacionRehabilitacion?.tipo),
      duracion: this.normalizedOrNull(historia.hospitalizacionRehabilitacion?.duracion)
    });

    const historiaBody = this.buildSection({
      descripcion: this.normalizedOrNull(historia.descripcion),
      toma_medicacion: this.normalizeOptionalBoolean(historia.tomaMedicacion),
      tipo_medicacion: this.normalizedOrNull(historia.tipoMedicacion),
      hospitalizacion_rehabilitacion: hospitalizacion
    });

    return historiaBody;
  }

  private toPsicoanamnesisPayload(payload: FichaPsicoanamnesisPayload): Record<string, unknown> {
    // Always send all fields/groups, even if empty, to guarantee backend validation
    return {
      prenatal: {
        condiciones_biologicas_padres: payload.prenatal?.condicionesBiologicasPadres ?? '',
        condiciones_psicologicas_padres: payload.prenatal?.condicionesPsicologicasPadres ?? '',
        observacion_prenatal: payload.prenatal?.observacionPrenatal ?? ''
      },
      natal: {
        parto_normal: payload.natal?.partoNormal ?? false,
        termino_parto: payload.natal?.terminoParto ?? '',
        complicaciones_parto: payload.natal?.complicacionesParto ?? '',
        observacion_natal: payload.natal?.observacionNatal ?? ''
      },
      infancia: {
        grado_sociabilidad: payload.infancia?.gradoSociabilidad ?? '',
        relacion_padres_hermanos: payload.infancia?.relacionPadresHermanos ?? '',
        discapacidad_intelectual: payload.infancia?.discapacidadIntelectual ?? false,
        grado_discapacidad: payload.infancia?.gradoDiscapacidad ?? '',
        trastornos: payload.infancia?.trastornos ?? '',
        tratamientos_psicologicos_psiquiatricos: payload.infancia?.tratamientosPsicologicosPsiquiatricos ?? false,
        observacion_infancia: payload.infancia?.observacionInfancia ?? ''
      }
    };
  }

  private toCondicionClinicaPayload(payload: FichaCondicionClinicaPayload): Record<string, unknown> {
    const condicion = this.normalizedRequired(payload.condicion);
    const body: Record<string, unknown> = { condicion };

    const diagnosticoId = this.normalizeOptionalId(payload.diagnosticoCie10Id);
    if (diagnosticoId !== undefined) {
      body['diagnostico_cie10_id'] = diagnosticoId;
    }

    const diagnosticoCodigo = this.normalizedOrNull(payload.diagnosticoCie10Codigo);
    if (diagnosticoCodigo !== undefined) {
      body['diagnostico_cie10_codigo'] = diagnosticoCodigo;
    }

    const diagnosticoNombre = this.normalizedOrNull(payload.diagnosticoCie10Nombre);
    if (diagnosticoNombre !== undefined) {
      body['diagnostico_cie10_nombre'] = diagnosticoNombre;
    }

    const diagnosticoDescripcion = this.normalizedOrNull(payload.diagnosticoCie10Descripcion);
    if (diagnosticoDescripcion !== undefined) {
      body['diagnostico_cie10_descripcion'] = diagnosticoDescripcion;
    }

    const diagnosticoCategoriaPadre = this.normalizedOrNull(payload.diagnosticoCie10CategoriaPadre);
    if (diagnosticoCategoriaPadre !== undefined) {
      body['diagnostico_cie10_categoria_padre'] = diagnosticoCategoriaPadre;
    }

    const diagnosticoNivel = this.normalizedNumberOrNull(payload.diagnosticoCie10Nivel);
    if (diagnosticoNivel !== undefined) {
      body['diagnostico_cie10_nivel'] = diagnosticoNivel;
    }

    const frecuencia = this.normalizeOptionalEnum(payload.planFrecuencia);
    if (frecuencia !== undefined) {
      body['plan_frecuencia'] = frecuencia;
    }

    const tipoSesion = this.normalizeOptionalEnum(payload.planTipoSesion);
    if (tipoSesion !== undefined) {
      body['plan_tipo_sesion'] = tipoSesion;
    }

    const detalle = this.normalizedOrNull(payload.planDetalle);
    if (detalle !== undefined) {
      body['plan_detalle'] = detalle;
    }

    const proximo = this.normalizedDateOrNull(payload.proximoSeguimiento);
    if (proximo !== undefined) {
      body['proximo_seguimiento'] = proximo;
    }

    const transferenciaUnidad = this.normalizedOrNull(payload.transferenciaUnidad);
    if (transferenciaUnidad !== undefined) {
      body['transferencia_unidad'] = transferenciaUnidad;
    }

    const transferenciaObservacion = this.normalizedOrNull(payload.transferenciaObservacion);
    if (transferenciaObservacion !== undefined) {
      body['transferencia_observacion'] = transferenciaObservacion;
    }

    return body;
  }

  private normalizedOrUndefined(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private normalizedOrNull(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizedDateOrNull(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }
      return value.toISOString();
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return trimmed;
  }

  private normalizeOptionalId(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private normalizeOptionalEnum(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      return trimmed.toUpperCase();
    }
    return undefined;
  }

  private normalizedNumberOrNull(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
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
      return Math.trunc(parsed);
    }
    return undefined;
  }

  private normalizedRequired(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    throw new Error('Valor requerido para la ficha psicologica no proporcionado');
  }

  private buildSection(section: Record<string, unknown>): Record<string, unknown> | undefined {
    const entries = Object.entries(section).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return undefined;
    }
    return Object.fromEntries(entries);
  }

  private normalizeOptionalBoolean(value: unknown): boolean | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized.length) {
        return null;
      }
      if (normalized === 'true' || normalized === '1' || normalized === 'si') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
    return undefined;
  }
}
