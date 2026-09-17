# Configuración de entornos y URL de la API (Frontend Angular)

## 1. Propósito

Centralizar la URL base del backend SOLVIX en una única fuente de verdad (`environment`), para poder cambiar entre desarrollo local, pruebas externas y producción futura **sin modificar servicios, guards ni interceptores**.

## 2. Estructura de environments

```
src/environments/
  environment.ts                 # Producción (default de ng build)
  environment.development.ts     # Local
  environment.test.ts            # API de pruebas externas
```

El código importa siempre:

```ts
import { environment } from '../environments/environment';
```

Angular CLI sustituye el archivo según la configuración de `angular.json` (`fileReplacements`).

## 3. LOCAL (development)

| | |
|---|---|
| Frontend | `http://localhost:4200` |
| `apiOrigin` | `http://localhost:8080` |
| `apiBaseUrl` | `http://localhost:8080/api` |

## 4. TEST

| | |
|---|---|
| Frontend | `http://localhost:4200` |
| `apiOrigin` | `https://api-test.computerelectroniccentersas.com` |
| `apiBaseUrl` | `https://api-test.computerelectroniccentersas.com/api` |

## 5. PRODUCCIÓN

**Production API URL pending configuration.**

En `environment.ts`:

```ts
apiOrigin: ''
apiBaseUrl: ''
```

No inventar una URL de producción. Completar estos valores cuando el host real esté definido.

## 6. `apiBaseUrl`

Prefijo REST del backend, **incluyendo** `/api`.

Ejemplos correctos:

```ts
`${environment.apiBaseUrl}/v1/productos`
`${environment.apiBaseUrl}/auth/login`
`${environment.apiBaseUrl}/cuenta`
```

Equivale a lo que antes era `http://localhost:8080/api/...`.

## 7. `apiOrigin`

Host del backend **sin** `/api`.

Se usa solo cuando el backend devuelve rutas relativas de medios (imágenes de producto, foto de cuenta), por ejemplo:

`/api/v1/productos/imagenes/uuid.jpg`

Resolución:

```ts
`${environment.apiOrigin}/api/v1/productos/imagenes/uuid.jpg`
```

Utilidades:

- `resolverUrlMedia()` en `src/app/core/utils/media-url.ts`
- `CuentaService.urlPublica()` para fotos de perfil

No usar `apiBaseUrl` para prepender a rutas que ya empiezan por `/api/...` (duplicaría `/api`).

## 8. Cómo ejecutar LOCAL

```bash
npm start
# equivalente: ng serve  (configuración development por defecto)
```

Backend esperado: `http://localhost:8080`  
API: `http://localhost:8080/api`

## 9. Cómo ejecutar TEST

```bash
npm run start:test
# equivalente: ng serve --configuration=test
```

Frontend: `http://localhost:4200`  
API: `https://api-test.computerelectroniccentersas.com/api`

## 10. Cómo generar build

```bash
npm run build
# producción: usa environment.ts (URLs vacías hasta configurar)

npm run build:test
# build con environment.test.ts
```

## 11. Cómo agregar nuevos endpoints

```ts
import { environment } from '../../../environments/environment';

private readonly apiUrl = `${environment.apiBaseUrl}/v1/mi-recurso`;
```

Mantener la ruta del endpoint exactamente como la define el backend. Solo cambia el host/base.

## 12. Regla: no hardcodear URLs

**Nunca:**

```ts
private apiUrl = 'http://localhost:8080/api/v1/...';
```

**Siempre:**

```ts
private readonly apiUrl = `${environment.apiBaseUrl}/v1/...`;
```

La URL del backend debe existir únicamente en `src/environments/`.

## 13. Imágenes y archivos

| Caso | Fuente |
|------|--------|
| Llamadas REST (`HttpClient`) | `environment.apiBaseUrl` |
| Rutas relativas de imagen/foto servidas por el backend | `environment.apiOrigin` + ruta relativa |
| URLs absolutas externas (CDN, etc.) | No tocar; `resolverUrlMedia` las deja igual |

## 14. Tests unitarios

`ng test` / `npm test` usa `fileReplacements` hacia `environment.development.ts`, de modo que `HttpTestingController` espera URLs locales coherentes con los servicios.

Preferir:

```ts
http.expectOne(`${environment.apiBaseUrl}/v1/productos`);
```

en lugar de literales `http://localhost:8080/...`.
