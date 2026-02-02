  // ...existing code...
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PersonalMilitarDTO, PersonalMilitarPayload } from '../models/personal-militar.models';

@Injectable({ providedIn: 'root' })
export class PersonalMilitarService {
  private readonly apiUrl: string;

  constructor(private readonly http: HttpClient) {
    // Preferir gestionBaseUrl si existe, si no usar '/gestion/api'
    const base = (environment.api?.gestionBaseUrl || environment.gestionBaseUrl || '/gestion/api').replace(/\/$/, '');
    this.apiUrl = `${base}/personal-militar`;
  }

  crear(payload: PersonalMilitarPayload): Observable<PersonalMilitarDTO> {
    const requestBody = this.toApiPayload(payload);
    return this.http.post<PersonalMilitarDTO>(this.apiUrl, requestBody);
  }

  actualizar(id: number, payload: PersonalMilitarPayload): Observable<PersonalMilitarDTO> {
    const requestBody = this.toApiPayload(payload);
    return this.http.put<PersonalMilitarDTO>(`${this.apiUrl}/${id}`, requestBody);
  }

  obtenerTodos(params?: any): Observable<PersonalMilitarDTO[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PersonalMilitarDTO[]>(this.apiUrl, { params: httpParams });
  }

  obtenerPorId(id: number): Observable<PersonalMilitarDTO> {
    return this.http.get<PersonalMilitarDTO>(`${this.apiUrl}/${id}`);
  }

  buscarPorCedula(cedula: string): Observable<PersonalMilitarDTO> {
    return this.http.get<PersonalMilitarDTO>(`${this.apiUrl}/buscar?cedula=${encodeURIComponent(cedula)}`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  buscarPorTermino(termino: string): Observable<PersonalMilitarDTO[]> {
    return this.http.get<unknown>(`${this.apiUrl}/buscar?termino=${encodeURIComponent(termino)}`).pipe(
      map((res: any): PersonalMilitarDTO[] => {
        // Si la respuesta es paginada (Spring Data), extraer el array de 'content'
        if (res && Array.isArray(res.content)) {
          return res.content.filter((p: any) => p && typeof p === 'object' && Object.keys(p).length > 0);
        }
        if (Array.isArray(res)) {
          return res.filter((p: any) => p && typeof p === 'object' && Object.keys(p).length > 0);
        }
        if (res == null || typeof res !== 'object' || Object.keys(res).length === 0) return [];
        return [res as PersonalMilitarDTO];
      })
    );
  }

  private toApiPayload(payload: PersonalMilitarPayload): Record<string, unknown> {
    // Solo enviar los campos que el backend acepta
    return {
      cedula: payload.cedula,
      apellidosNombres: payload.apellidosNombres,
      sexo: payload.sexo,
      tipoPersona: payload.tipoPersona,
      esMilitar: payload.esMilitar,
      fechaNacimiento: payload.fechaNacimiento,
      edad: payload.edad,
      etnia: payload.etnia ?? null,
      estadoCivil: payload.estadoCivil ?? null,
      nroHijos: payload.nroHijos,
      ocupacion: payload.ocupacion ?? null,
      servicioActivo: payload.servicioActivo,
      seguro: payload.seguro ?? null,
      grado: payload.grado ?? null,
      unidadMilitar: payload.unidadMilitar ?? null,
      telefono: payload.telefono ?? null,
      celular: payload.celular ?? null,
      email: payload.email ?? null,
      activo: payload.activo
    };
  }
}
