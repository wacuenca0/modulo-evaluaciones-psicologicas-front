// ...eliminar código duplicado y fuera de lugar...
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { buildApiUrl } from '../core/config/api.config';

const ROLE_ALIASES: Record<string, string> = {
  ADMIN: 'ROLE_ADMINISTRADOR',
  ADMINISTRADOR: 'ROLE_ADMINISTRADOR',
  ROLE_ADMINISTRADOR: 'ROLE_ADMINISTRADOR',
  ROLE_ADMIN: 'ROLE_ADMINISTRADOR',
  ROLE_ADMINISTRADORES: 'ROLE_ADMINISTRADOR',
  CATALOGOS_CIE10: 'ROLE_CATALOGOS_CIE10',
  PSICOLOGO: 'ROLE_PSICOLOGO',
  PSICOLOGO_CLINICO: 'ROLE_PSICOLOGO',
  ROLE_PSICOLOGOS: 'ROLE_PSICOLOGO',
  ROLE_PSICOLOGO: 'ROLE_PSICOLOGO'
};
import {
  LoginRequestDTO,
  LoginResponseDTO,
  UserDTO,
  RefreshTokenResponseDTO
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // storage keys
  private readonly accessKey = 'access_token';
  private readonly refreshKey = 'refresh_token';
  private readonly expKey = 'access_exp'; // epoch ms
  private readonly typeKey = 'token_type';
  private readonly authUrl = buildApiUrl('auth');

  // signals for reactive state
  private readonly accessTokenSig = signal<string | null>(this.readLocal(this.accessKey));
  private readonly userSig = signal<UserDTO | null>(null);
  private readonly expiresAtSig = signal<number | null>(this.readNumber(this.expKey));
  private readonly tokenTypeSig = signal<string | null>(this.readLocal(this.typeKey));

  readonly isAuthenticated = computed(() => {
    const token = this.accessTokenSig();
    const exp = this.expiresAtSig();
    return !!token && !!exp && Date.now() < exp;
  });

  readonly currentUser = computed(() => this.userSig());
  readonly roles = computed(() => {
    const user = this.userSig();
    if (!user) return [];
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles;
    }
    // Si no tiene roles, forzar ROLE_OBSERVADOR
    return ['ROLE_OBSERVADOR'];
  });
  readonly isAdmin = computed(() => this.roles().includes('ROLE_ADMINISTRADOR'));
  readonly isPsicologo = computed(() => this.roles().includes('ROLE_PSICOLOGO'));

  constructor() {
    const router = inject(Router);
    const token = this.accessTokenSig();
    const exp = this.expiresAtSig();
    const currentUrl = router.url;
    const isLoginRoute = currentUrl.startsWith('/login');

    if (this.handleNoToken(token, isLoginRoute, router)) return;
    if (this.handleExpiredToken(token, exp, isLoginRoute, router)) return;
    if (token) {
      this.initUserFromToken(token, isLoginRoute, router);
    }
  }

  private handleNoToken(token: string | null, isLoginRoute: boolean, router: Router): boolean {
    if (!token) {
      this.clearAllTokens();
      if (!isLoginRoute) {
        setTimeout(() => router.navigateByUrl('/login'), 0);
      }
      return true;
    }
    return false;
  }

  private handleExpiredToken(token: string | null, exp: number | null, isLoginRoute: boolean, router: Router): boolean {
    if (token && exp && Date.now() >= exp) {
      this.clearAllTokens();
      if (!isLoginRoute) {
        setTimeout(() => router.navigateByUrl('/login'), 0);
      }
      return true;
    }
    return false;
  }

  private initUserFromToken(token: string, isLoginRoute: boolean, router: Router): void {
    const decoded = this.decodeToken(token);
    if (decoded.expiresAt && Date.now() >= decoded.expiresAt) {
      this.clearAllTokens();
      if (!isLoginRoute) {
        setTimeout(() => router.navigateByUrl('/login'), 0);
      }
      return;
    }
    if (!this.expiresAtSig() && decoded.expiresAt) {
      this.expiresAtSig.set(decoded.expiresAt);
    }
    const username = decoded.username || '';
    let normalizedRoles = this.normalizeRoles(decoded.roles ?? []);
    if (!normalizedRoles.length && decoded['roleName']) {
      normalizedRoles = this.normalizeRoles([decoded['roleName']]);
    }
    // Si sigue sin roles, asignar ROLE_OBSERVADOR explícitamente
    if (!normalizedRoles.length) {
      normalizedRoles = ['ROLE_OBSERVADOR'];
      console.warn('[AuthService] No se encontraron roles en el token, asignando ROLE_OBSERVADOR por defecto.');
    }
    if (username || normalizedRoles.length) {
      // Intenta extraer el id del token si está presente
      const userId = decoded['id'] ?? decoded['user_id'] ?? decoded['userId'] ?? null;
      const userObj = { id: userId, username, active: true, roles: normalizedRoles };
      console.log('[AuthService] Usuario inicializado:', userObj);
      this.userSig.set(userObj);
    }
  }

  // --- LOGIN ---
  login(req: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http
      .post(`${this.authUrl}/login`, req, { responseType: 'text' as const })
      .pipe(
        switchMap((raw) => {
          try {
            const context = this.resolveLoginContext(raw, req.username);
            this.setAccess(context.token, context.tokenType, context.expiresIn);
            if (context.refreshToken) {
              this.writeLocal(this.refreshKey, context.refreshToken);
            }
            this.userSig.set(context.initialUser);
            return this.fetchCurrentUser().pipe(
              map((user) => this.buildLoginResponse(context.token, context.expiresIn, user)),
              catchError(() => {
                this.userSig.set(context.initialUser);
                return of(this.buildLoginResponse(context.token, context.expiresIn, context.initialUser));
              })
            );
          } catch (parseError) {
            this.clearAllTokens();
            return throwError(() =>
              parseError instanceof Error ? parseError : new Error('Login response could not be processed.')
            );
          }
        })
      );
  }

  // --- CURRENT USER FROM BACKEND (optional if info already in login response) ---
  fetchCurrentUser(): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.authUrl}/current-user`).pipe(
      catchError(err => {
        const existing = this.userSig();
        if (existing) return of(existing);
        return throwError(() => err);
      }),
      map(u => {
        console.log('[AuthService] fetchCurrentUser respuesta backend:', u);
        const rawRoles = Array.isArray(u?.roles) ? u.roles : [];
        const decodedRoles = this.roles();
        const flattenedRoles = [...rawRoles, ...decodedRoles]
          .map(role => {
            if (typeof role === 'string') return role;
            if (role && typeof role === 'object') {
              const record = role as Record<string, unknown>;
              const candidate = record['nombre']
                ?? record['name']
                ?? record['role']
                ?? record['authority'];
              if (typeof candidate === 'string') return candidate;
              if (typeof candidate === 'number' || typeof candidate === 'boolean') {
                return String(candidate);
              }
              return '';
            }
            return '';
          })
          .filter(Boolean);
        let normalizedRoles = this.normalizeRoles(flattenedRoles);
        console.log('[AuthService] Roles normalizados fetchCurrentUser:', normalizedRoles);

        // Si no hay roles, usar roleName o roleId como fallback
        if (!normalizedRoles.length) {
          const raw = ((u ?? {}) as unknown) as Record<string, unknown>;
          const fallbackRole = (raw?.['roleName'] as string | undefined)
            ?? (raw?.['role'] as { name?: string } | undefined)?.name
            ?? '';
          if (fallbackRole) {
            normalizedRoles = this.normalizeRoles([fallbackRole]);
          }
        }

        // Si sigue vacío, usar 'ROLE_OBSERVADOR' como último recurso
        if (!normalizedRoles.length) {
          normalizedRoles = ['ROLE_OBSERVADOR'];
        }

        const raw = ((u ?? {}) as unknown) as Record<string, unknown>;
        const normalized: UserDTO = {
          id: u?.id ?? this.userSig()?.id,
          username: u?.username ?? this.userSig()?.username ?? '',
          email: (raw?.['email'] as string | undefined) ?? this.userSig()?.email,
          roleId: (raw?.['roleId'] as number | undefined) ?? this.userSig()?.roleId,
          roleName: (raw?.['roleName'] as string | undefined)
            ?? (raw?.['role'] as { name?: string } | undefined)?.name
            ?? this.userSig()?.roleName,
          active: (raw?.['active'] as boolean | undefined)
            ?? (raw?.['enabled'] as boolean | undefined)
            ?? this.userSig()?.active ?? true,
          roles: normalizedRoles
        };
        this.userSig.set(normalized);
        return normalized;
      })
    );
  }

  // --- CURRENT USER + PSICÓLOGO ---
  fetchCurrentUserWithPsicologo(): Observable<{ user: any | null; psicologo: any | null }> {
    return this.http.get<{ user: any | null; psicologo: any | null }>(`${this.authUrl}/current-user-with-psicologo`);
  }

  // --- REFRESH TOKEN ---
  refreshToken(): Observable<RefreshTokenResponseDTO | string> {
    const refresh = this.readLocal(this.refreshKey);
    if (!refresh) return of('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${refresh}` });
    // Accept both structured and plain string responses for compatibility
    return this.http.post<any>(`${this.authUrl}/refresh-token`, {}, { headers }).pipe(
      map(res => {
        if (typeof res === 'string') {
          this.setAccess(res, this.tokenTypeSig() || 'Bearer', 3600); // fallback 1h if unknown
          return res;
        } else {
          const dto = res as RefreshTokenResponseDTO;
          this.setAccess(dto.accessToken, 'Bearer', dto.expiresIn);
          if (dto.refreshToken) this.writeLocal(this.refreshKey, dto.refreshToken);
          return dto;
        }
      })
    );
  }

  // --- LOGOUT ---
  logout(): Observable<void> {
    if (!this.accessTokenSig()) {
      this.clearAllTokens();
      return of(void 0);
    }
    return this.http.post<void>(`${this.authUrl}/logout`, {}).pipe(
      map(() => { this.clearAllTokens(); })
    );
  }

  // --- CAMBIO DE CONTRASEÑA PROPIA ---
  changeOwnPassword(payload: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/change-password`, payload);
  }

  // --- VALIDATE TOKEN ---
  validateToken(): Observable<boolean> {
    return this.http.get<{ valid: boolean }>(`${this.authUrl}/validate-token`).pipe(map(r => !!r?.valid));
  }

  // --- HELPERS ---
  private readonly defaultExpirySeconds = 3600;

  private persistLogin(res: LoginResponseDTO) {
    this.setAccess(res.accessToken, res.tokenType || 'Bearer', res.expiresIn || this.defaultExpirySeconds);
    if (res.refreshToken) this.writeLocal(this.refreshKey, res.refreshToken);
    this.userSig.set(res.user);
  }

  private setAccess(token: string, type: string, expiresInSec: number) {
    const expMs = Date.now() + expiresInSec * 1000;
    this.writeLocal(this.accessKey, token);
    this.writeLocal(this.typeKey, type);
    this.writeLocal(this.expKey, String(expMs));
    this.accessTokenSig.set(token);
    this.tokenTypeSig.set(type);
    this.expiresAtSig.set(expMs);
  }

  private readLocal(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private writeLocal(key: string, value: string | null) {
    try {
      if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch {}
  }
  private readNumber(key: string): number | null {
    const v = this.readLocal(key);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  clearAllTokens() {
    this.writeLocal(this.accessKey, null);
    this.writeLocal(this.refreshKey, null);
    this.writeLocal(this.expKey, null);
    this.writeLocal(this.typeKey, null);
    this.accessTokenSig.set(null);
    this.tokenTypeSig.set(null);
    this.expiresAtSig.set(null);
    this.userSig.set(null);
  }

  getAccessToken(): string | null { return this.accessTokenSig(); }
  getRefreshToken(): string | null { return this.readLocal(this.refreshKey); }
  getTokenType(): string | null { return this.tokenTypeSig(); }
  getExpiration(): number | null { return this.expiresAtSig(); }
  isTokenNearExpiry(thresholdSeconds = 60): boolean {
    const exp = this.expiresAtSig();
    if (!exp) return true;
    return Date.now() + thresholdSeconds * 1000 >= exp;
  }

  // Backwards compatibility helpers (legacy API references in codebase)
  // token$ previously exposed an observable of the raw token; replaced by a simple getter function for migration simplicity.
  // getCurrentUser() / getUserRoles() / getToken() kept as wrappers for existing components until fully migrated.
  getCurrentUser() { return this.currentUser(); }
  getUserRoles() { return this.roles(); }
  getToken() { return this.getAccessToken(); }
  token$ = { subscribe: (fn: (v: string | null) => void) => { fn(this.getAccessToken()); return { unsubscribe() {} }; } } as any;

  private decodeToken(token: string): DecodedTokenResult & { [key: string]: any } {
    try {
      const payload = jwtDecode<AuthJwtPayload>(token);
      const record = payload as Record<string, unknown>;
      const aggregatedRoles = [
        ...this.extractRoleStrings(record['roles']),
        ...this.extractRoleStrings(record['authorities']),
        ...this.extractRoleStrings(record['authority']),
        ...this.extractRoleStrings(record['permisos']),
        ...this.extractRoleStrings(record['perfiles']),
        ...this.extractRoleStrings(record['role']),
        ...this.extractRoleStrings(record['rol'])
      ];
      const scope = record['scope'];
      if (typeof scope === 'string' && scope.trim().length) {
        aggregatedRoles.push(...scope.trim().split(/\s+/));
      }
      const roles = this.normalizeRoles(aggregatedRoles);
      const expiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
      const username = typeof payload.sub === 'string' ? payload.sub : '';
      // Extrae id si está presente en el token
      const id = record['id'] ?? record['user_id'] ?? record['userId'] ?? null;
      return { username, roles, expiresAt, id };
    } catch {
      return { username: '', roles: [], expiresAt: null, id: null };
    }
  }

  private applyDecodedUser(decoded: DecodedTokenResult, fallbackUsername: string): UserDTO {
    const user = this.buildUserFromDecoded(decoded, fallbackUsername);
    this.userSig.set(user);
    return user;
  }

  private buildUserFromDecoded(decoded: DecodedTokenResult & { [key: string]: any }, fallbackUsername: string): UserDTO {
    const normalizedRoles = this.normalizeRoles(decoded.roles);
    const username = decoded.username || fallbackUsername;
    const id = decoded['id'] ?? null;
    return { id, username, roles: normalizedRoles, active: true };
  }

  private buildLoginResponse(token: string, expiresIn: number, user: UserDTO): LoginResponseDTO {
    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      user
    };
  }

  private parseExpiresAt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 1_000_000_000_000 ? value : Math.round(value * 1000);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) return null;
      const numericValue = Number(trimmed);
      if (Number.isFinite(numericValue)) {
        return numericValue > 1_000_000_000_000 ? numericValue : Math.round(numericValue * 1000);
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  private computeExpiresIn(expiresAt: number | null): number {
    if (!expiresAt) return this.defaultExpirySeconds;
    const diffSec = Math.floor((expiresAt - Date.now()) / 1000);
    return diffSec > 0 ? diffSec : this.defaultExpirySeconds;
  }

  private resolveLoginContext(payload: unknown, fallbackUsername: string): LoginContext {
    const normalized = this.normalizeLoginPayload(payload);
    const decoded = this.decodeToken(normalized.token);
    const expiresAt = normalized.expiresAt ?? decoded.expiresAt;
    const expiresIn = normalized.expiresIn && normalized.expiresIn > 0
      ? normalized.expiresIn
      : this.computeExpiresIn(expiresAt);
    const decodedUser = this.withAdditionalRoles(
      this.buildUserFromDecoded(decoded, fallbackUsername),
      normalized.roles
    );
    const candidateUser = normalized.user
      ? this.withAdditionalRoles(normalized.user, normalized.roles)
      : null;
    const mergedUser = candidateUser
      ? this.mergeUserWithFallback(candidateUser, decodedUser)
      : decodedUser;
    return {
      token: normalized.token,
      tokenType: normalized.tokenType || 'Bearer',
      refreshToken: normalized.refreshToken || undefined,
      expiresIn,
      initialUser: mergedUser
    };
  }

  private normalizeLoginPayload(payload: unknown): NormalizedLoginPayload {
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) throw new Error('Empty login response.');
      if (this.looksLikeJson(trimmed)) {
        const parsed = this.safeParseJson(trimmed);
        return this.normalizeLoginPayload(parsed);
      }
      return { token: trimmed, tokenType: 'Bearer', refreshToken: null, expiresIn: null, expiresAt: null, roles: [], user: null };
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Unexpected login response format.');
    }

    const obj = payload as Record<string, unknown>;
    const token = this.pickFirstString(obj, ['accessToken', 'token', 'jwt', 'access_token', 'token_acceso', 'tokenAcceso']);
    if (!token) {
      throw new Error('Login response did not include an access token.');
    }
    const tokenType = this.pickFirstString(obj, ['tokenType', 'type', 'token_type']) ?? 'Bearer';
    const refreshToken = this.pickFirstString(obj, ['refreshToken', 'refresh_token']);
    const expiresIn = this.pickFirstNumber(obj, ['expiresIn', 'expires_in']);
    const expiresAtSource = obj['expiresAt'] ?? obj['expira'] ?? obj['expiration'] ?? obj['expires_at'] ?? obj['exp'] ?? obj['expiraEn'];
    const expiresAt = this.parseExpiresAt(expiresAtSource);
    const userPayload = obj['user'] ?? obj['usuario'];
    let user = this.normalizeUserFromPayload(userPayload);
    const roles = this.normalizeRoles([
      ...this.extractRoleStrings(obj['roles']),
      ...this.extractRoleStrings(obj['authorities']),
      ...this.extractRoleStrings(obj['authority']),
      ...this.extractRoleStrings(obj['permisos']),
      ...this.extractRoleStrings(obj['perfiles']),
      ...this.extractRoleStrings(obj['rolesAsignados'])
    ]);
    if (user && roles.length) {
      user = { ...user, roles: this.normalizeRoles([...(user.roles ?? []), ...roles]) };
    } else if (!user && roles.length) {
      user = { username: '', active: true, roles };
    }
    return {
      token,
      tokenType,
      refreshToken: refreshToken ?? null,
      expiresIn: expiresIn ?? null,
      expiresAt,
      roles,
      user
    };
  }

  private looksLikeJson(value: string): boolean {
    const first = value[0];
    const last = value.at(-1) ?? '';
    return (first === '{' && last === '}') || (first === '[' && last === ']');
  }

  private safeParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Login response body is not valid JSON.');
    }
  }

  private pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const raw = record[key];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
      }
    }
    return null;
  }

  private pickFirstNumber(record: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const raw = record[key];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw;
      }
    }
    return null;
  }

  private normalizeUserFromPayload(payload: unknown): UserDTO | null {
    if (!payload || typeof payload !== 'object') return null;
    const raw = payload as Record<string, unknown>;
    const username = this.pickFirstString(raw, ['username', 'user', 'usuario', 'correo', 'email', 'nombreUsuario']) ?? '';
    const email = this.pickFirstString(raw, ['email', 'correo', 'correoElectronico']);
    const roleName = this.pickFirstString(raw, ['roleName', 'roleNameDescripcion', 'role', 'rol', 'perfil']);
    const roleIdRaw = raw['roleId'] ?? raw['rolId'] ?? raw['perfilId'];
    const idRaw = raw['id'];
    const roleObj = (raw['role'] ?? raw['rol'] ?? raw['perfil']) as Record<string, unknown> | undefined;
    const normalizedRoles = this.normalizeRoles([
      ...this.extractRoleStrings(raw['roles']),
      ...this.extractRoleStrings(raw['authorities']),
      ...this.extractRoleStrings(raw['permisos']),
      ...this.extractRoleStrings(roleObj)
    ]);
    const activeRaw = raw['active'];
    const active = typeof activeRaw === 'boolean' ? activeRaw : true;
    const user: UserDTO = {
      username,
      active,
      roles: normalizedRoles
    };
    if (typeof idRaw === 'number' && Number.isFinite(idRaw)) user.id = idRaw;
    if (email) user.email = email;
    if (typeof roleIdRaw === 'number' && Number.isFinite(roleIdRaw)) {
      user.roleId = roleIdRaw;
    } else if (roleObj && typeof roleObj['id'] === 'number' && Number.isFinite(roleObj['id'])) {
      user.roleId = roleObj['id'];
    }
    if (roleName) {
      user.roleName = roleName;
    } else if (roleObj) {
      const roleNameCandidate = this.pickFirstString(roleObj, ['nombre', 'name', 'codigo', 'role']);
      if (roleNameCandidate) user.roleName = roleNameCandidate;
    }
    if (!user.roles?.length && user.roleName) {
      user.roles = this.normalizeRoles([user.roleName]);
    }
    return user;
  }

  private extractRoleStrings(source: unknown): string[] {
    if (!source) return [];
    if (typeof source === 'string') return [source];
    if (!Array.isArray(source)) return [];
    const roles: string[] = [];
    for (const entry of source) {
      if (typeof entry === 'string') {
        roles.push(entry);
      } else if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const candidate = this.pickFirstString(record, ['nombre', 'name', 'role', 'authority', 'codigo']);
        if (candidate) roles.push(candidate);
      }
    }
    return roles;
  }

  private withAdditionalRoles(user: UserDTO, roles: string[]): UserDTO {
    if (!roles.length) return user;
    const mergedRoles = this.normalizeRoles([...(user.roles ?? []), ...roles]);
    return { ...user, roles: mergedRoles };
  }

  private mergeUserWithFallback(candidate: UserDTO, fallback: UserDTO): UserDTO {
    const mergedRoles = this.normalizeRoles([...(fallback.roles ?? []), ...(candidate.roles ?? [])]);
    return {
      ...fallback,
      ...candidate,
      username: candidate.username || fallback.username,
      active: typeof candidate.active === 'boolean' ? candidate.active : fallback.active,
      roles: mergedRoles
    };
  }

  hasRole(role: string): boolean {
    const normalized = this.normalizeRoleName(role);
    if (!normalized) return false;
    return this.roles().includes(normalized);
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles?.length) return false;
    const targets = this.normalizeRoles(roles);
    if (!targets.length) return false;
    const current = this.roles();
    return targets.some(role => current.includes(role));
  }

  private normalizeRoles(roles: Array<string | null | undefined>): string[] {
    const normalized: string[] = [];
    for (const role of roles) {
      const name = role ? this.normalizeRoleName(role) : '';
      if (name && !normalized.includes(name)) {
        normalized.push(name);
      }
    }
    return normalized;
  }

  private normalizeRoleName(role: string): string {
    const standardized = this.standardizeRoleString(role);
    if (!standardized) return '';
    const alias = ROLE_ALIASES[standardized];
    if (alias) return alias;
    return standardized.startsWith('ROLE_') ? standardized : `ROLE_${standardized}`;
  }

  private standardizeRoleString(role: string): string {
    return role
      .normalize('NFD')
      .replaceAll(/[^\p{ASCII}]/gu, '')
      .trim()
      .replaceAll(/\s+/g, '_')
      .toUpperCase();
  }
}

type AuthJwtPayload = JwtPayload & { roles?: unknown };

interface DecodedTokenResult {
  username: string;
  roles: string[];
  expiresAt: number | null;
}

interface NormalizedLoginPayload {
  token: string;
  tokenType: string;
  refreshToken: string | null;
  expiresIn: number | null;
  expiresAt: number | null;
  roles: string[];
  user: UserDTO | null;
}

interface LoginContext {
  token: string;
  tokenType: string;
  refreshToken?: string;
  expiresIn: number;
  initialUser: UserDTO;
}
