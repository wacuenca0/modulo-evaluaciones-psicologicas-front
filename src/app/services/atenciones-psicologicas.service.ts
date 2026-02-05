import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  AtencionPsicologicaRequestDTO, 
  AtencionPsicologicaResponseDTO,
  ReprogramarAtencionRequestDTO
} from '../models/atenciones-psicologicas.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AtencionPsicologicaService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  
  // Usar la URL correcta para el backend
  private readonly apiUrl = 'http://localhost:8080/api/atenciones';
  private readonly baseUrl = 'http://localhost:8080/api';

  /**
   * Obtener headers con información del usuario autenticado
   */
  private getHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Usuario-Id': user?.id?.toString() || '',
      'X-Usuario-Nombre': user?.fullName || user?.username || '',
      'X-Usuario-Username': user?.username || ''
    });
    return headers;
  }

  /**
   * Agregar información del usuario al request
   */
  private agregarUsuarioAlRequest(request: any): any {
    const user = this.authService.getCurrentUser();
    return {
      ...request,
      usuarioId: user?.id,
      usuarioNombre: user?.fullName || user?.username,
      usuarioUsername: user?.username
    };
  }

  /**
   * Crea un seguimiento psicológico
   */
  crearSeguimiento(request: any): Observable<AtencionPsicologicaResponseDTO> {
    const url = `${this.baseUrl}/seguimiento`;
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      url, 
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Lista los seguimientos por ficha psicológica
   */
  listarSeguimientosPorFicha(fichaId: number): Observable<AtencionPsicologicaResponseDTO[]> {
    const url = `${this.baseUrl}/seguimiento/ficha/${fichaId}`;
    return this.http.get<AtencionPsicologicaResponseDTO[]>(
      url,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Crear una nueva atención psicológica
   */
  crearAtencion(request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      this.apiUrl, 
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener atención por ID
   */
  obtenerPorId(id: number): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.get<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Alias para obtenerPorId (mantenido por compatibilidad)
   */
  findById(id: number): Observable<AtencionPsicologicaResponseDTO> {
    return this.obtenerPorId(id);
  }

  /**
   * Actualizar atención existente
   */
  actualizarAtencion(id: number, request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.put<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}`, 
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Eliminar atención
   */
  eliminarAtencion(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Reprogramar atención existente
   */
  reprogramarAtencion(id: number, datosReprogramacion: ReprogramarAtencionRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    const requestConUsuario = this.agregarUsuarioAlRequest(datosReprogramacion);
    return this.http.patch<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/reprogramar`,
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Cancelar atención con información del usuario
   */
  cancelarAtencion(id: number, request: any): Observable<AtencionPsicologicaResponseDTO> {
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/cancelar`,
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Cancelar atención usando parámetro de query ?razon=, según contrato indicado
   */
  cancelarAtencionQuery(id: number, razon: string): Observable<AtencionPsicologicaResponseDTO> {
    const params = new HttpParams().set('razon', razon);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/cancelar`,
      null,
      {
        params,
        headers: this.getHeaders()
      }
    );
  }

  /**
   * Cancelar atención (método legacy - mantenido por compatibilidad)
   */
  cancelarAtencionLegacy(id: number, razon: string): Observable<AtencionPsicologicaResponseDTO> {
    const request = { razonCancelacion: razon };
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/cancelar`,
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar atenciones por psicólogo
   */
  listarPorPsicologo(psicologoId: number, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(
      `${this.apiUrl}/psicologo/${psicologoId}`, 
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Listar atenciones por paciente
   */
  listarPorPaciente(pacienteId: number, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(
      `${this.apiUrl}/paciente/${pacienteId}`, 
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Listar atenciones por estado
   */
  listarPorEstado(estado: string, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(
      `${this.apiUrl}/estado/${estado}`, 
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Finalizar atención con información del usuario
   */
  finalizarAtencion(id: number, request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/finalizar`, 
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
    * Registrar no asistencia usando endpoint dedicado (legacy)
   */
  registrarNoAsistencia(id: number, observaciones: string): Observable<AtencionPsicologicaResponseDTO> {
    const request = { observaciones };
    const requestConUsuario = this.agregarUsuarioAlRequest(request);
    
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/no-asistencia`,
      requestConUsuario,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Registrar no asistencia (método legacy - mantenido por compatibilidad)
   */
  registrarNoAsistenciaLegacy(id: number, observaciones: string): Observable<AtencionPsicologicaResponseDTO> {
    const params = observaciones ? new HttpParams().set('observaciones', observaciones) : new HttpParams();
    
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/no-asistencia`,
      null,
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Marcar atención como NO_ASISTIO usando PUT /api/atenciones/{id}
   */
  marcarNoAsistio(id: number): Observable<AtencionPsicologicaResponseDTO> {
    const payload = this.agregarUsuarioAlRequest({ estado: 'NO_ASISTIO' });
    return this.http.put<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar todas las atenciones (sin paginación)
   */
  listarTodas(): Observable<AtencionPsicologicaResponseDTO[]> {
    return this.http.get<AtencionPsicologicaResponseDTO[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Filtrar atenciones con múltiples criterios y paginación
   * Compatible con el endpoint /api/atenciones/filtro-atencion
   */
  filtrarAtenciones(filtros: {
    estadoAtencion?: string;
    nombre?: string;
    fecha?: string;
    page?: number;
    size?: number;
    hoy?: boolean;
    reprogramada?: boolean;
  }): Observable<any> {
    let params = new HttpParams();
    
    // Agregar filtros solo si tienen valor
    if (filtros.estadoAtencion && filtros.estadoAtencion.trim() !== '' && filtros.estadoAtencion !== 'TODAS') {
      params = params.set('estadoAtencion', filtros.estadoAtencion);
    }
    
    if (filtros.nombre && filtros.nombre.trim() !== '') {
      params = params.set('nombre', filtros.nombre);
    }
    
    // Si filtroHoy está activado, usar fecha de hoy
    if (filtros.hoy) {
      const hoy = new Date().toISOString().split('T')[0];
      params = params.set('fecha', hoy);
    } else if (filtros.fecha && filtros.fecha.trim() !== '') {
      params = params.set('fecha', filtros.fecha);
    }
    
    // Filtrar por reprogramadas
    if (filtros.reprogramada !== undefined) {
      params = params.set('reprogramada', filtros.reprogramada.toString());
    }
    
    // Parámetros de paginación
    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params
      .set('page', String(page))
      .set('size', String(size));
    
    return this.http.get<any>(
      `${this.apiUrl}/filtro-atencion`, 
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Obtener estadísticas de atenciones
   */
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/estadisticas`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener atenciones programadas para hoy
   */
  obtenerAtencionesHoy(): Observable<AtencionPsicologicaResponseDTO[]> {
    const hoy = new Date().toISOString().split('T')[0];
    return this.http.get<AtencionPsicologicaResponseDTO[]>(
      `${this.apiUrl}/hoy/${hoy}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Buscar atenciones por texto (búsqueda global)
   */
  buscarAtenciones(termino: string, page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('termino', termino)
      .set('page', String(page))
      .set('size', String(size));
    
    return this.http.get<any>(
      `${this.apiUrl}/buscar`,
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Obtener histórico de cambios de una atención
   */
  obtenerHistorico(id: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${id}/historico`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de cambios de una atención (endpoint /historial)
   */
  obtenerHistorialCambios(id: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/${id}/historial`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener próximas citas
   */
  obtenerProximasCitas(): Observable<AtencionPsicologicaResponseDTO[]> {
    return this.http.get<AtencionPsicologicaResponseDTO[]>(
      `${this.apiUrl}/proximas-citas`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener atenciones recientes del psicólogo actual
   */
  obtenerMisAtencionesRecientes(): Observable<AtencionPsicologicaResponseDTO[]> {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return new Observable(observer => observer.next([]));
    }
    
    return this.http.get<AtencionPsicologicaResponseDTO[]>(
      `${this.apiUrl}/mis-atenciones/recientes`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Exportar atenciones a PDF
   */
  exportarAPDF(filtros: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filtros.estadoAtencion) {
      params = params.set('estadoAtencion', filtros.estadoAtencion);
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }
    
    return this.http.get(
      `${this.apiUrl}/exportar/pdf`,
      { 
        params,
        headers: this.getHeaders(),
        responseType: 'blob' 
      }
    );
  }

  /**
   * Verificar disponibilidad de horario
   */
  verificarDisponibilidad(fecha: string, horaInicio: string, horaFin: string, psicologoId?: number): Observable<boolean> {
    let params = new HttpParams()
      .set('fecha', fecha)
      .set('horaInicio', horaInicio)
      .set('horaFin', horaFin);
    
    if (psicologoId) {
      params = params.set('psicologoId', psicologoId.toString());
    }
    
    return this.http.get<boolean>(
      `${this.apiUrl}/verificar-disponibilidad`,
      { 
        params,
        headers: this.getHeaders() 
      }
    );
  }

  /**
   * Obtener total de atenciones por estado
   */
  obtenerTotalesPorEstado(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/totales/estado`,
      { headers: this.getHeaders() }
    );
  }
}