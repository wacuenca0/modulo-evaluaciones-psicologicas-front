import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PsicologoGestionDTO {
  id?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  apellidosNombres?: string;
  usuarioId: number;
  username: string;
  email: string;
  telefono: string;
  celular: string;
  grado: string;
  unidadMilitar: string;
  especialidad: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PsicologoGestionService {
  private readonly http = inject(HttpClient);
  private readonly baseGestion = '/api/psicologos';
  private readonly baseCatalogos = '/catalogos/api/users';

  // Métodos de gestión de psicólogos
  listar(): Observable<PsicologoGestionDTO[]> {
    return this.http.get<PsicologoGestionDTO[]>(this.baseGestion);
  }

  obtenerPorId(id: number): Observable<PsicologoGestionDTO> {
    return this.http.get<PsicologoGestionDTO>(`${this.baseGestion}/${id}`);
  }

  actualizar(id: number, payload: PsicologoGestionDTO): Observable<PsicologoGestionDTO> {
    return this.http.put<PsicologoGestionDTO>(`${this.baseGestion}/${id}`, payload);
  }

  crear(payload: PsicologoGestionDTO): Observable<PsicologoGestionDTO> {
    return this.http.post<PsicologoGestionDTO>(this.baseGestion, payload);
  }

  buscarPorUsuarioId(usuarioId: number): Observable<PsicologoGestionDTO | null> {
    return this.http.get<PsicologoGestionDTO>(`${this.baseGestion}/por-usuario/${usuarioId}`);
  }

  // Método para obtener el usuario (desde catalogos)
  obtenerUsuario(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseCatalogos}/${userId}`);
  }
}
