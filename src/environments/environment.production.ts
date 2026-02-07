// Para entorno Docker local, el gateway corre en http://localhost:8080
// Si despliegas en un dominio real, cambia esta URL.
const gatewayBaseUrl = 'http://localhost:8080';
const authBasePath = '/catalogos/api/auth';
const catalogosBasePath = '/catalogos/api';
// Para gestión, el gateway expone rutas bajo /api/**
const gestionBasePath = '/api';
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
  ftpArchivosFicha: {
    servidor: 'ftp.ejemplo.com',
    puerto: 21,
    usuario: 'usuario-ftp',
    clave: 'clave-segura',
    rutaBase: '/fichas'
  },
  apiBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  catalogBaseUrl: `${gatewayBaseUrl}${catalogosBasePath}`,
  documentosBaseUrl: `${gatewayBaseUrl}${documentosBasePath}`,
  gestionBaseUrl: `${gatewayBaseUrl}${gestionBasePath}`,
  passwordRequestsBaseUrl: `${gatewayBaseUrl}${passwordRequestsBasePath}`
};
