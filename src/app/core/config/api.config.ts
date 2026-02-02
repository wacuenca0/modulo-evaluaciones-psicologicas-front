import { environment } from '../../../environments/environment';

type ApiScope = 'baseUrl' | 'auth' | 'catalogos' | 'gestion' | 'documentos';

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);
const stripTrailingSlash = (value: string): string => (value.endsWith('/') ? value.slice(0, -1) : value);
const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const configuredBaseUrl = stripTrailingSlash(environment.api?.baseUrl ?? 'http://127.0.0.1:8080');
const authPath = environment.api?.authBasePath ?? '/api/auth';
const catalogosPath = environment.api?.catalogosBasePath ?? '/catalogos/api';
const gestionPath = environment.api?.gestionBasePath ?? '/gestion/api';
const documentosPath = environment.api?.documentosBasePath ?? '/documentos/api';

const normalizeOverride = (value?: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  if (!ABSOLUTE_URL_REGEX.test(trimmed)) {
    return null;
  }
  return stripTrailingSlash(trimmed);
};

const getAuthFallbackFromBase = (): string | null => {
  const baseCandidate = environment.apiBaseUrl;
  if (typeof baseCandidate !== 'string') {
    return null;
  }
  const trimmed = baseCandidate.trim();
  if (!trimmed.length || !ABSOLUTE_URL_REGEX.test(trimmed)) {
    return null;
  }
  return `${stripTrailingSlash(trimmed)}/auth`;
};

const getScopeOverride = (scope: Exclude<ApiScope, 'baseUrl'>): string | null => {
  const apiConfigSource = (environment.api ?? {}) as Record<string, unknown>;
  let candidate: string | null = null;

  switch (scope) {
    case 'auth': {
      candidate =
        normalizeOverride(apiConfigSource['authBaseUrl'] as string | undefined)
        ?? normalizeOverride(getAuthFallbackFromBase());
      break;
    }
    case 'catalogos': {
      candidate =
        normalizeOverride(apiConfigSource['catalogosBaseUrl'] as string | undefined)
        ?? normalizeOverride(environment.catalogBaseUrl);
      break;
    }
    case 'gestion': {
      candidate =
        normalizeOverride(apiConfigSource['gestionBaseUrl'] as string | undefined)
        ?? normalizeOverride(environment.gestionBaseUrl);
      break;
    }
    case 'documentos': {
      candidate =
        normalizeOverride(apiConfigSource['documentosBaseUrl'] as string | undefined)
        ?? normalizeOverride(environment.documentosBaseUrl);
      break;
    }
  }

  return candidate;
};

const getWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  const maybeWindow = (globalThis as typeof globalThis & { window?: Window }).window;
  return maybeWindow ?? undefined;
};

const isBrowser = (): boolean => !!getWindow();

const shouldUseProxyOrigin = (): boolean => {
  if (!isBrowser() || environment.production) {
    return false;
  }

  const currentWindow = getWindow();
  const origin = currentWindow?.location?.origin ?? '';
  const gatewayPatterns = [/^https?:\/\/localhost:8080$/i, /^https?:\/\/127\.0\.0\.1:8080$/i];
  const devOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200'];
  const matchesGateway = gatewayPatterns.some(pattern => pattern.test(configuredBaseUrl));
  const matchesDevOrigin = devOrigins.some(devOrigin => origin.startsWith(devOrigin));
  return matchesGateway && matchesDevOrigin;
};

const resolveRuntimeBase = (): string => {
  if (shouldUseProxyOrigin()) {
    return '';
  }
  return configuredBaseUrl;
};

const composeUrl = (base: string, path: string): string => {
  const normalizedPath = ensureLeadingSlash(path);
  if (!base) {
    return normalizedPath;
  }
  const normalizedBase = ensureTrailingSlash(base);
  return new URL(normalizedPath, normalizedBase).toString().replace(/\/$/, '');
};

const getScopePath = (scope: Exclude<ApiScope, 'baseUrl'>): string => {
  switch (scope) {
    case 'auth':
      return authPath;
    case 'catalogos':
      return catalogosPath;
    case 'gestion':
      return gestionPath;
    case 'documentos':
      return documentosPath;
    default:
      return '/';
  }
};

export const getApiRoot = (scope: ApiScope): string => {
  const base = resolveRuntimeBase();
  if (scope === 'baseUrl') {
    return base;
  }
  const override = getScopeOverride(scope);
  if (override) {
    return override;
  }
  return composeUrl(base, getScopePath(scope));
};

export const apiConfig = {
  get baseUrl(): string {
    return getApiRoot('baseUrl');
  },
  get auth(): string {
    return getApiRoot('auth');
  },
  get catalogos(): string {
    return getApiRoot('catalogos');
  },
  get gestion(): string {
    return getApiRoot('gestion');
  },
  get documentos(): string {
    return getApiRoot('documentos');
  }
};

export const buildApiUrl = (base: ApiScope, path = ''): string => {
  const root = getApiRoot(base);
  if (!path) {
    return root || '/';
  }
  if (ABSOLUTE_URL_REGEX.test(path)) {
    return path;
  }
  if (!root) {
    return ensureLeadingSlash(path);
  }
  const normalizedRoot = stripTrailingSlash(root);
  const normalizedPath = ensureLeadingSlash(path);
  return `${normalizedRoot}${normalizedPath}`;
};
