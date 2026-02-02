import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CompletePasswordChangeRequestDTO,
  CreatePasswordChangeRequestDTO,
  PasswordChangeRequestDTO,
  PasswordChangeStatus,
  RejectPasswordChangeRequestDTO
} from '../models/password-change-request.models';

@Injectable({ providedIn: 'root' })
export class PasswordChangeRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = this.resolveBaseUrl();

  list(status?: PasswordChangeStatus): Observable<PasswordChangeRequestDTO[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PasswordChangeRequestDTO[]>(this.baseUrl, { params });
  }

  create(payload: CreatePasswordChangeRequestDTO): Observable<PasswordChangeRequestDTO> {
    return this.http.post<PasswordChangeRequestDTO>(this.baseUrl, payload);
  }

  complete(id: number, payload: CompletePasswordChangeRequestDTO): Observable<PasswordChangeRequestDTO> {
    return this.http.post<PasswordChangeRequestDTO>(`${this.baseUrl}/${id}/complete`, payload);
  }

  reject(id: number, payload: RejectPasswordChangeRequestDTO = {}): Observable<PasswordChangeRequestDTO> {
    return this.http.post<PasswordChangeRequestDTO>(`${this.baseUrl}/${id}/reject`, payload);
  }

  private resolveBaseUrl(): string {
    const configured = environment.passwordRequestsBaseUrl;
    if (configured) {
      return configured;
    }
    const catalogBase = environment.catalogBaseUrl || environment.apiBaseUrl || '';
    if (!catalogBase) {
      return '/password-requests';
    }
    return `${catalogBase.replace(/\/$/, '')}/password-requests`;
  }
}
