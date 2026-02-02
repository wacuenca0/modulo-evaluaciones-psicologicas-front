const gatewayBaseUrl = 'http://127.0.0.1:8080';
const authBasePath = '/catalogos/api/auth';
const catalogosBasePath = '/catalogos/api';
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
    gestionBaseUrl: gestionBasePath,
    documentosBaseUrl: documentosBasePath
  },
  apiBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  catalogBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  documentosBaseUrl: documentosBasePath,
  gestionBaseUrl: gestionBasePath,
  passwordRequestsBaseUrl: `${gatewayBaseUrl}${passwordRequestsBasePath}`
};
