
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtencionPsicologicaRequestDTO,
  AtencionPsicologicaResponseDTO
} from '../models/atenciones-psicologicas.models';

@Injectable({
  providedIn: 'root'
})
export class AtencionPsicologicaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.api.gestionBaseUrl}/atenciones`;
  private readonly baseUrl = environment.api.gestionBaseUrl;
  /**
   * Crea un seguimiento psicológico
   */
  crearSeguimiento(request: any): Observable<AtencionPsicologicaResponseDTO> {
    const url = `${this.baseUrl}/seguimiento`;
    return this.http.post<AtencionPsicologicaResponseDTO>(url, request);
  }

  /**
   * Lista los seguimientos por ficha psicológica
   */
  listarSeguimientosPorFicha(fichaId: number): Observable<AtencionPsicologicaResponseDTO[]> {
    const url = `${this.baseUrl}/seguimiento/ficha/${fichaId}`;
    return this.http.get<AtencionPsicologicaResponseDTO[]>(url);
  }

  crearAtencion(request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.post<AtencionPsicologicaResponseDTO>(this.apiUrl, request);
  }

  obtenerPorId(id: number): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.get<AtencionPsicologicaResponseDTO>(`${this.apiUrl}/${id}`);
  }

  findById(id: number): Observable<AtencionPsicologicaResponseDTO> {
    return this.obtenerPorId(id);
  }

  actualizarAtencion(id: number, request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.put<AtencionPsicologicaResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  eliminarAtencion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }


  listarPorPsicologo(psicologoId: number, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<any>(`${this.apiUrl}/psicologo/${psicologoId}`, { params });
  }

  listarPorPaciente(pacienteId: number, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<any>(`${this.apiUrl}/paciente/${pacienteId}`, { params });
  }

  listarPorEstado(estado: string, page: number = 0, size: number = 6): Observable<any> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<any>(`${this.apiUrl}/estado/${estado}`, { params });
  }

  finalizarAtencion(id: number, request: AtencionPsicologicaRequestDTO): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.post<AtencionPsicologicaResponseDTO>(`${this.apiUrl}/${id}/finalizar`, request);
  }

  cancelarAtencion(id: number, razon: string): Observable<AtencionPsicologicaResponseDTO> {
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/cancelar`,
      null,
      { params: { razon } }
    );
  }

  registrarNoAsistencia(id: number, observaciones: string): Observable<AtencionPsicologicaResponseDTO> {
    const params = observaciones ? new HttpParams().set('observaciones', observaciones) : new HttpParams();
    
    return this.http.post<AtencionPsicologicaResponseDTO>(
      `${this.apiUrl}/${id}/no-asistencia`,
      null,
      { params }
    );
  }

  listarTodas(): Observable<AtencionPsicologicaResponseDTO[]> {
    return this.http.get<AtencionPsicologicaResponseDTO[]>(this.apiUrl);
  }

    /**
   * Filtrar atenciones con múltiples criterios y paginación
   * Compatible con el endpoint /api/atenciones/filtro-ficha
   */
  filtrarAtenciones(filtros: {
    estadoAtencion?: string;
    nombre?: string;
    fecha?: string;
    page?: number;
    size?: number;
  }): Observable<any> {
    let params = new HttpParams();
    // Agregar filtros solo si tienen valor
    if (filtros.estadoAtencion && filtros.estadoAtencion.trim() !== '') {
      params = params.set('estadoAtencion', filtros.estadoAtencion);
    }
    if (filtros.nombre && filtros.nombre.trim() !== '') {
      params = params.set('nombre', filtros.nombre);
    }
    if (filtros.fecha && filtros.fecha.trim() !== '') {
      params = params.set('fecha', filtros.fecha);
    }
    // Parámetros de paginación
    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(`${this.apiUrl}/filtro-atencion`, { params });
  }
}