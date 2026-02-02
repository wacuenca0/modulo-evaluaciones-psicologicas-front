import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { CatalogosService } from '../../services/catalogos.service';
import { CatalogoCIE10DTO } from '../../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class Cie10CacheService {
  private readonly catalogos = inject(CatalogosService);

  private readonly queryCache = new Map<string, readonly CatalogoCIE10DTO[]>();
  private readonly idCache = new Map<number, CatalogoCIE10DTO>();
  private preload$?: Observable<readonly CatalogoCIE10DTO[]>;
  private readonly allKey = '__ALL__';

  preloadActivos(): Observable<readonly CatalogoCIE10DTO[]> {
    if (this.queryCache.has(this.allKey)) {
      return of(this.queryCache.get(this.allKey) ?? []);
    }
    if (!this.preload$) {
      this.preload$ = this.catalogos
        .listarCIE10({ soloActivos: true })
        .pipe(
          map(items => Array.isArray(items) ? items : []),
          tap(items => this.storeResult(this.allKey, items)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.preload$;
  }

  buscar(term: string): Observable<readonly CatalogoCIE10DTO[]> {
    const clave = this.normalizeTerm(term);
    if (!clave.length) {
      return this.preloadActivos();
    }
    if (this.queryCache.has(clave)) {
      return of(this.queryCache.get(clave) ?? []);
    }
    return this.catalogos.buscarCIE10(clave).pipe(
      map(items => {
        if (!Array.isArray(items)) {
          return [] as CatalogoCIE10DTO[];
        }
        return items.slice(0, 20);
      }),
      tap(items => this.storeResult(clave, items))
    );
  }

  obtenerPorId(id: number): Observable<CatalogoCIE10DTO | null> {
    if (this.idCache.has(id)) {
      return of(this.idCache.get(id) ?? null);
    }
    return this.catalogos.obtenerCIE10(id).pipe(
      tap(item => {
        if (item) {
          this.idCache.set(id, item);
        }
      }),
      map(item => item ?? null)
    );
  }

  private storeResult(clave: string, items: readonly CatalogoCIE10DTO[]): void {
    this.queryCache.set(clave, items);
    for (const item of items) {
      const identifier = this.normalizeId(item?.id);
      if (identifier !== null) {
        this.idCache.set(identifier, item as CatalogoCIE10DTO);
      }
    }
  }

  private normalizeTerm(term: string): string {
    return term?.trim().toUpperCase() ?? '';
  }

  private normalizeId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
