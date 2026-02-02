const gatewayBaseUrl = 'https://api.evaluaciones.mops.gob.ec';
const authBasePath = '/catalogos/api/auth';
const catalogosBasePath = '/catalogos/api';
const gestionBasePath = '/gestion/api';
const documentosBasePath = '/documentos/api';
const passwordRequestsBasePath = `${catalogosBasePath}/password-requests`;

export const environment = {
  production: true,
  api: {
    baseUrl: gatewayBaseUrl,
    authBasePath,
    catalogosBasePath,
    gestionBasePath,
    documentosBasePath,
    authBaseUrl: `${gatewayBaseUrl}${authBasePath}`,
    catalogosBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
    gestionBaseUrl: `${gatewayBaseUrl}${gestionBasePath}`,
    documentosBaseUrl: `${gatewayBaseUrl}${documentosBasePath}`
  },
  apiBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  catalogBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  documentosBaseUrl: `${gatewayBaseUrl}${documentosBasePath}`,
  gestionBaseUrl: `${gatewayBaseUrl}${gestionBasePath}`,
  passwordRequestsBaseUrl: `${gatewayBaseUrl}${passwordRequestsBasePath}`
};
