import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FichaDocumentoDTO,
  FichaDocumentoDeleteResponse,
  FichaDocumentoUploadPayload
} from '../models/documentos.models';

@Injectable({ providedIn: 'root' })
export class FichaDocumentosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = this.resolveBaseUrl();

  listar(fichaId: number): Observable<FichaDocumentoDTO[]> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/documentos`;
    return this.http
      .get<unknown>(url)
      .pipe(map(response => this.normalizeListado(response)));
  }

  subir(fichaId: number, payload: FichaDocumentoUploadPayload): Observable<FichaDocumentoDTO> {
    const id = Number(fichaId);
    const url = `${this.baseUrl}/fichas-psicologicas/${id}/documentos`;
    const formData = new FormData();
    formData.append('archivo', payload.archivo);
    const descripcion = this.normalizeDescripcion(payload.descripcion);
    if (descripcion !== undefined) {
      formData.append('descripcion', descripcion ?? '');
    }
    const headers = new HttpHeaders({ Accept: 'application/json' });
    return this.http.post<FichaDocumentoDTO>(url, formData, { headers });
  }

  eliminar(fichaId: number, documentoId: number): Observable<FichaDocumentoDeleteResponse | void> {
    const ficha = Number(fichaId);
    const documento = Number(documentoId);
    const url = `${this.baseUrl}/fichas-psicologicas/${ficha}/documentos/${documento}`;
    return this.http.delete<FichaDocumentoDeleteResponse | void>(url);
  }

  private resolveBaseUrl(): string {
    const nested = (environment as { api?: { documentosBaseUrl?: string } }).api?.documentosBaseUrl;
    const flat = (environment as { documentosBaseUrl?: string }).documentosBaseUrl;
    const base = nested || flat || '';
    if (!base) {
      return '/documentos/api';
    }
    return base.replace(/\/$/, '');
  }

  private normalizeListado(response: unknown): FichaDocumentoDTO[] {
    if (Array.isArray(response)) {
      return response as FichaDocumentoDTO[];
    }
    if (!response || typeof response !== 'object') {
      return [];
    }
    if ('items' in response && Array.isArray((response as { items?: unknown[] }).items)) {
      return (response as { items: FichaDocumentoDTO[] }).items ?? [];
    }
    if ('content' in response && Array.isArray((response as { content?: unknown[] }).content)) {
      return (response as { content: FichaDocumentoDTO[] }).content ?? [];
    }
    if ('data' in response && Array.isArray((response as { data?: unknown[] }).data)) {
      return (response as { data: FichaDocumentoDTO[] }).data ?? [];
    }
    return [];
  }

  private normalizeDescripcion(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
