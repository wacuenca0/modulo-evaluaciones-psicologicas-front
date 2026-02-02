import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { UserDTO } from '../../models/auth.models';

export interface PsicologoOption {
  id: number;
  nombre: string;
  username: string;
  email?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PsicologosLookupService {
  private readonly userService = inject(UserService);

  obtenerOpciones(): Observable<PsicologoOption[]> {
    return this.userService.list().pipe(
      map(users => users.filter(user => Array.isArray(user.roles) && user.roles.includes('ROLE_PSICOLOGO'))),
      map(users => users.map(user => this.toOption(user)).filter((option): option is PsicologoOption => option !== null)),
      map(options => options.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))),
      catchError(() => of<PsicologoOption[]>([]))
    );
  }

  private toOption(user: UserDTO): PsicologoOption | null {
    const idValue = typeof user.id === 'number' ? user.id : Number(user.id ?? Number.NaN);
    if (!Number.isFinite(idValue)) {
      return null;
    }
    const username = user.username?.trim();
    if (!username?.length) {
      return null;
    }
    return {
      id: Number(idValue),
      nombre: this.nombreVisible(user),
      username,
      email: user.email?.trim() ?? null
    };
  }

  private nombreVisible(user: UserDTO): string {
    const username = user.username?.trim() ?? '';
    const email = user.email?.trim() ?? '';
    if (username && email) {
      return `${username} (${email})`;
    }
    return username || email || 'Psicologo';
  }
}
