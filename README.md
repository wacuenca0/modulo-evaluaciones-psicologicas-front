# Guía Angular: Integración con Servicios de Catálogos y Gestión

Documentación oficial para consumir los servicios backend (Catálogos 8080 y Gestión 8082) desde este frontend Angular. Sigue cada punto en el orden indicado.

## 1. Rol y JWT
- Trabajar únicamente con el rol `ADMINISTRADOR`.
- El token JWT debe incluir en el claim `roles` el valor `ADMINISTRADOR` (sin prefijo).
- Los servicios de Gestión ya validan con `@PreAuthorize("hasAuthority('ADMINISTRADOR')")`, por lo que el token debe exponer exactamente esa autoridad.

## 2. Requisitos previos
- Catálogos (8080) y Gestión (8082) iniciados sin errores, conectados a la misma base de datos.
- Mismo secreto HS256 configurado en ambos servicios (`security.jwt.secret`, al menos 32 caracteres).
- Usuario `admin` registrado en BD con contraseña conocida (`admin123` en este documento). Respeta el formato del campo (`bcrypt` o texto plano según configuración).

## 3. Variables y URLs
- `baseAuth` = `http://localhost:8080`
- `baseGestion` = `http://localhost:8082`
- Todas las peticiones protegidas deben incluir `Authorization: Bearer <token>`.

## 4. Endpoints Catálogos (8080)
| Paso | Método | URL | Descripción | DTO principal |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/login` | Devuelve token en texto plano. | body: `LoginRequestDTO` |
| 2 | GET | `/api/auth/current-user` | Recupera datos del usuario autenticado. | respuesta: `UserDTO` |
| 3 | GET | `/api/roles` | Lista de roles. | respuesta: `RoleDTO[]` |
| 4 | POST | `/api/users` | Crear usuario. | body: `CreateUserRequestDTO` |
| 5 | PUT | `/api/users` | Actualizar usuario. | body: `UpdateUserRequestDTO` |
| 6 | DELETE | `/api/users/{username}` | Eliminar usuario. | respuesta: 204 |
| 7 | GET | `/api/users` | Listar usuarios. | respuesta: `UserDTO[]` |

## 5. Endpoints Gestión (8082)
| Recurso | Método | URL | Acción |
| --- | --- | --- | --- |
| Personal Militar | GET | `/api/personal-militar` | Listado |
| Personal Militar | GET | `/api/personal-militar/{id}` | Detalle |
| Personal Militar | POST | `/api/personal-militar` | Crear |
| Personal Militar | DELETE | `/api/personal-militar/{id}` | Eliminar |
| Psicólogos | GET | `/api/psicologos` | Listado |
| Psicólogos | GET | `/api/psicologos/{id}` | Detalle |
| Psicólogos | POST | `/api/psicologos` | Crear |
| Psicólogos | DELETE | `/api/psicologos/{id}` | Eliminar |

Todas las rutas anteriores requieren `Authorization: Bearer <token>` y esperan el rol `ADMINISTRADOR`.

## 6. Estructuras JSON de referencia
- **UserDTO**
```json
{
	"id": 1,
	"username": "admin",
	"email": "admin@sistema.com",
	"roleId": 1
}
```
- **CreateUserRequestDTO**
```json
{
	"username": "juan",
	"email": "juan@correo.com",
	"password": "clave123",
	"roleId": 2
}
```
- **UpdateUserRequestDTO**
```json
{
	"id": 5,
	"username": "juan",
	"email": "nuevo@correo.com",
	"roleId": 3,
	"active": true
}
```
- **PersonalMilitarDTO (alta mínima)**
```json
{
	"cedula": "0102030405",
	"apellidosNombres": "Perez Lopez",
	"sexo": "M",
	"etnia": "Mestizo",
	"estadoCivil": "SOLTERO",
	"nroHijos": 0,
	"ocupacion": "Oficial",
	"servicioActivo": true,
	"seguro": "ISSFA",
	"grado": "Teniente",
	"especialidad": "Infanteria",
	"provincia": "Pichincha",
	"canton": "Quito",
	"parroquia": "Centro",
	"barrioSector": "La Mariscal",
	"telefono": "2222333",
	"celular": "0999999999",
	"email": "persona@correo.com",
	"activo": true
}
```
- **PsicologoDTO**
```json
{
	"id": 3,
	"cedula": "0912345678",
	"apellidosNombres": "Maria Torres",
	"usuarioId": 12,
	"username": "maria"
}
```

## 7. Implementación Angular

### 7.1 Login y persistencia de token
```ts
this.http
	.post('http://localhost:8080/api/auth/login', body, { responseType: 'text' })
	.subscribe(token => {
		localStorage.setItem('token', token);
	});
```

### 7.2 Interceptor HTTP
```ts
intercept(req: HttpRequest<unknown>, next: HttpHandler) {
	const token = localStorage.getItem('token');
	if (!token) return next.handle(req);
	return next.handle(req.clone({
		setHeaders: { Authorization: `Bearer ${token}` }
	}));
}
```

### 7.3 Decodificar roles con `jwt-decode`
```ts
const payload = jwtDecode<{ roles?: string[] }>(token);
const roles = Array.isArray(payload.roles) ? payload.roles : [];
const isAdmin = roles.includes('ADMINISTRADOR') || roles.includes('ROLE_ADMINISTRADOR');
```

### 7.4 Guards y visibilidad de rutas/componentes
- Rutas protegidas por `AuthGuard`.
- `RoleGuard` verifica `isAdmin` para secciones administrativas.
- Componentes muestran u ocultan elementos en función de `isAdmin` (signals expuestas por `AuthService`).

### 7.5 Servicios disponibles en `src/app/services`
- `AuthService`: login, almacenamiento de tokens, `fetchCurrentUser()`.
- `UserService`: CRUD completo sobre `/api/users`.
- `RoleService`: catálogo de roles.
- Servicios de gestión (cuando se integren) deben reutilizar `environment.gestionBaseUrl` y el interceptor.

## 8. Flujo recomendado en Postman (entorno `local-dev`)
1. Definir variables: `baseAuth`, `baseGestion`, `token` (vacío inicial).
2. `POST {{baseAuth}}/api/auth/login`.
3. Guardar token en `Tests`: `pm.environment.set('token', pm.response.text());`.
4. `GET {{baseAuth}}/api/auth/current-user`.
5. Ejecutar llamadas de Catálogos y Gestión usando `Authorization: Bearer {{token}}`.

## 9. Solución de problemas
- **401 Unauthorized**: token vencido o credenciales incorrectas. Repetir login, revisar contraseña en BD, confirmar secreto compartido.
- **403 Forbidden**: token carece de autoridad `ADMINISTRADOR`. Verificar claim `roles` y normalización en backend.
- **Respuesta HTML (Unexpected token '<')**: URL errónea. El login siempre es `http://localhost:8080/api/auth/login`.
- **HTTP 500 generalizado**: revisar logs de backend (fallos de conexión a BD, migraciones, FK inválidas). Reiniciar servicios en orden: Catálogos → Gestión.
- **Servicios no arrancan (exit code 1)**: credenciales de base de datos, esquema faltante o puerto ocupado.

## 10. Checklist de verificación
- [ ] Ambos servicios comparten `security.jwt.secret`.
- [ ] `POST /api/auth/login` devuelve token válido.
- [ ] Angular guarda el token y lo adjunta en el interceptor.
- [ ] El token incluye `ADMINISTRADOR` en el claim `roles`.
- [ ] Endpoints de Catálogos responden 200 usando el token.
- [ ] Endpoints de Gestión responden 200 usando el token.

## 11. Comandos frontend clave
```bash
npm install        # Instala dependencias
npm run start      # Servidor Angular en http://localhost:4200/
npm run build      # Compilación de producción
```

## 12. Notas finales
- Mantén el rol `ADMINISTRADOR` como acceso total. Agrega roles adicionales solo cuando el backend los soporte de punta a punta.
- El secreto HS256 debe mantenerse privado y consistente entre servicios.
- Actualiza `src/environments/environment.ts` si los hosts o puertos cambian.
