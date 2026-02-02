import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PasswordChangeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.catalogosBaseUrl}/password-change`;

  // Obtener solicitudes por estado (completado o rechazado)
  listByStatus(status: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`, { params: new HttpParams().set('status', status) });
  }
  requestChange(username: string, motivo: string): Observable<any> {
    const body = new HttpParams()
      .set('username', username)
      .set('motivo', motivo);
    return this.http.post(`${this.baseUrl}/request`, body);
  }

  // For admin: get pending requests
  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pending`);
  }

  // For admin: approve request
  approve(requestId: number, newPassword: string): Observable<any> {
    // El backend espera el parámetro newPassword en la URL, sin body
    return this.http.post(`${this.baseUrl}/${requestId}/approve`, null, {
      params: new HttpParams().set('newPassword', newPassword)
    });
  }

  // For admin: reject request
  reject(requestId: number, reason: string): Observable<any> {
    // El backend espera el parámetro adminNotes en la URL, sin body
    return this.http.post(`${this.baseUrl}/${requestId}/reject`, null, {
      params: new HttpParams().set('adminNotes', reason)
    });
  }
}
