import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, timeout, of } from 'rxjs';
import { buildApiUrl } from '../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class PsicologoNombreService {
  constructor(private readonly http: HttpClient) {}

  obtenerNombrePorUserId(userId: number): Observable<string> {
    const url = buildApiUrl('gestion', `/psicologos/nombre-por-usuario?userId=${userId}`);
    return this.http.get(url, { responseType: 'text' as 'text' }).pipe(
      timeout(4000),
      map(res => {
        const nombre = (res || '').trim();
        return nombre.length > 0 ? nombre : 'No registrado';
      }),
      catchError(() => of('No registrado'))
    );
  }
}
