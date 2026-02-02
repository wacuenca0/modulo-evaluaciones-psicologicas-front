import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PsicologoOption } from '../reports/shared/psicologos-lookup.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PsicologosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'http://localhost:8080/api/psicologos';

  list(): Observable<PsicologoOption[]> {
    // Obtener el token de acceso de forma pública
    const token = this.auth.getAccessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<PsicologoOption[]>(this.baseUrl, { headers });
  }
}
