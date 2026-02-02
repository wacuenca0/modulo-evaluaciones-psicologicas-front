import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { buildApiUrl } from '../core/config/api.config';
import { CatalogoCIE10DTO, CreateCatalogoCIE10Payload, UpdateCatalogoCIE10Payload } from '../models/catalogo.models';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface CatalogoCie10Filters {
  soloActivos?: boolean;
  termino?: string;
  search?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly cie10BaseUrl = buildApiUrl('gestion', '/catalogos/cie10');

  listarCIE10(filters: CatalogoCie10Filters = {}): Observable<PaginatedResult<CatalogoCIE10DTO>> {
    let params = new HttpParams();
    if (filters.soloActivos !== undefined) {
      const flag = String(Boolean(filters.soloActivos));
      params = params.set('soloActivos', flag).set('activo', flag);
    }
    const search = filters.termino ?? filters.search;
    if (search && search.trim().length) {
      const normalized = search.trim();
      params = params.set('q', normalized);
    }
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;
    params = params.set('page', String(page)).set('size', String(size));
    return this.http.get<any>(this.cie10BaseUrl, { params }).pipe(
      map(res => {
        // Soporta backend con formato { content, totalElements } (Spring Data) o { items, total }
        if (res && Array.isArray(res.content) && typeof res.totalElements === 'number') {
          return { items: res.content, total: res.totalElements };
        } else if (res && Array.isArray(res.items) && typeof res.total === 'number') {
          return { items: res.items, total: res.total };
        } else if (Array.isArray(res)) {
          return { items: res, total: res.length };
        } else {
          return { items: [], total: 0 };
        }
      })
    );
  }

  buscarCIE10(termino: string): Observable<CatalogoCIE10DTO[]> {
    const normalized = termino.trim();
    return this.listarCIE10({ search: normalized, soloActivos: true }).pipe(
      map(result => result.items)
    );
  }

  obtenerCIE10(id: number): Observable<CatalogoCIE10DTO> {
    return this.http.get<CatalogoCIE10DTO>(`${this.cie10BaseUrl}/${id}`);
  }

  crearCIE10(payload: CreateCatalogoCIE10Payload): Observable<CatalogoCIE10DTO> {
    const body = this.toCreatePayload(payload);
    return this.http.post<CatalogoCIE10DTO>(this.cie10BaseUrl, body);
  }

  actualizarCIE10(id: number, payload: UpdateCatalogoCIE10Payload): Observable<CatalogoCIE10DTO> {
    const body = this.toUpdatePayload(payload);
    return this.http.put<CatalogoCIE10DTO>(`${this.cie10BaseUrl}/${id}`, body);
  }

  private toCreatePayload(payload: CreateCatalogoCIE10Payload): Record<string, unknown> {
    const codigo = this.normalizeCodigo(payload.codigo);
    const nombre = this.normalizeTextoRequerido(payload.nombre);
    const descripcion = this.normalizeTextoRequerido(payload.descripcion);
    const categoria = this.normalizeTextoOpcional(payload.categoriaPadre ?? undefined);
    const nivel = this.normalizeNivel(payload.nivel, true);
    const activo = payload.activo ?? true;

    const body: Record<string, unknown> = {
      codigo,
      nombre,
      descripcion,
      nivel,
      activo: Boolean(activo)
    };

    if (categoria !== undefined) {
      body['categoria_padre'] = categoria;
    }

    return body;
  }

  private toUpdatePayload(payload: UpdateCatalogoCIE10Payload): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (payload.codigo !== undefined) {
      body['codigo'] = this.normalizeCodigo(payload.codigo);
    }
    if (payload.nombre !== undefined) {
      body['nombre'] = this.normalizeTextoRequerido(payload.nombre);
    }
    if (payload.descripcion !== undefined) {
      body['descripcion'] = this.normalizeTextoRequerido(payload.descripcion);
    }
    if (payload.categoriaPadre !== undefined) {
      body['categoria_padre'] = this.normalizeTextoOpcional(payload.categoriaPadre);
    }
    if (payload.nivel !== undefined) {
      body['nivel'] = this.normalizeNivel(payload.nivel, true);
    }
    if (payload.activo !== undefined) {
      body['activo'] = Boolean(payload.activo);
    }

    return body;
  }

  private normalizeCodigo(value: string): string {
    const normalized = this.normalizeTextoRequerido(value).toUpperCase();
    return normalized;
  }

  private normalizeTextoRequerido(value: string): string {
    const normalized = (value ?? '').toString().replaceAll(/\s+/g, ' ').trim();
    if (!normalized.length) {
      throw new Error('Los campos requeridos para el catalogo CIE-10 no fueron proporcionados.');
    }
    return normalized;
  }

  private normalizeTextoOpcional(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized = value.toString().replaceAll(/\s+/g, ' ').trim();
    return normalized.length ? normalized : null;
  }

  private normalizeNivel(value: number | string | null | undefined, required: boolean): number {
    if (value === null || value === undefined) {
      if (required) {
        return 0;
      }
      return 0;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    const entero = Math.trunc(numeric);
    return Math.max(0, entero);
  }

}
