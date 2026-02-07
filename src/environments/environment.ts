const gatewayBaseUrl = 'http://127.0.0.1:8080';
const authBasePath = '/catalogos/api/auth';
const catalogosBasePath = '/catalogos/api';
// Para gestión, el gateway expone rutas bajo /api/**
const gestionBasePath = '/api';
const documentosBasePath = '/documentos/api';
const passwordRequestsBasePath = `${catalogosBasePath}/password-requests`;

export const environment = {
  production: false,
  api: {
    baseUrl: gatewayBaseUrl,
    authBasePath,
    catalogosBasePath,
    gestionBasePath,
    documentosBasePath,
    authBaseUrl: `${gatewayBaseUrl}${authBasePath}`,
    catalogosBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
    gestionBaseUrl: `${gatewayBaseUrl}${gestionBasePath}`,
    documentosBaseUrl: `${gatewayBaseUrl}${documentosBasePath}`,
    // Agregado para compatibilidad con tu requerimiento
    gestionBaseUrlLegacy: 'http://localhost:8080/api'
  },
  apiBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  catalogBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  documentosBaseUrl: `${gatewayBaseUrl}${documentosBasePath}`,
  gestionBaseUrl: `${gatewayBaseUrl}${gestionBasePath}`,
  passwordRequestsBaseUrl: `${gatewayBaseUrl}${passwordRequestsBasePath}`
};
