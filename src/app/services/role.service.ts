import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoleDTO } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.catalogBaseUrl}/roles`;

  list(): Observable<RoleDTO[]> {
    return this.http.get<RoleDTO[]>(this.base).pipe(
      map(list => list?.map(roleMapper) ?? [])
    );
  }
}

const roleMapper = (dto: Partial<RoleDTO> | null | undefined): RoleDTO => {
  if (!dto) return { id: 0, name: '' };
  const anyDto = dto as Record<string, unknown>;
  const id = dto.id ?? (anyDto['id'] as number | undefined) ?? 0;
  const name = dto.name ?? (anyDto['name'] as string | undefined) ?? (anyDto['code'] as string | undefined) ?? '';
  return { id, name };
};