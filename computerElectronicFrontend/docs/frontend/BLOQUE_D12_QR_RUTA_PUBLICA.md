# SOLVIX Frontend — BLOQUE D.12
## QR / ruta pública Angular — 404 en navegación directa

**Fecha:** 2026-09-30  
**Entorno:** TEST (`test.computerelectroniccentersas.com`)  
**Alcance:** hosting frontend Apache/cPanel (`.htaccess` postbuild). Sin cambios a QR, token, PDF ni backend.

---

### 1. URL probada

```text
https://test.computerelectroniccentersas.com/consulta/ot/18bd5e32fe544c39ae9b3117ac5155de
```

URL conceptual del QR (correcta): `/consulta/ot/:token`

---

### 2. 404 detectado

Chrome DevTools → Network (evidencia de prueba real):

| Campo | Valor |
|-------|--------|
| Request | `/consulta/ot/18bd5e32fe544c39ae9b3117ac5155de` |
| Status | **404** |
| Type | **document** |

El fallo ocurre en la **navegación inicial del documento**, antes de que Angular pueda resolver la ruta.

Reproducción remota (pre-fix): `WebFetch` → **404 Not Found**.

El **favicon 404** es independiente y no explica este fallo.

---

### 3. Auditoría Angular (sin cambio de rutas)

En `app.routes.ts` ya existe:

```ts
{
  path: 'consulta/ot/:token',
  loadComponent: () => import('.../consulta-ot-publica')...
}
```

- Sin `authGuard` / `adminGuard`
- Fuera del `AdminLayout`
- `baseHref: "/"` en `angular.json` y `<base href="/">` en `index.html`

**Causa no es el router Angular.**

---

### 4. Causa raíz

El postbuild TEST (`scripts/postbuild-test.mjs`) generaba un `.htaccess` **solo con headers de cache**.

Apache no hacía **SPA fallback** a `index.html` para rutas profundas. Al pedir `/consulta/ot/:token` como documento, el servidor buscaba un archivo físico inexistente → **404**.

---

### 5. Corrección — `.htaccess`

Se **conservan** las reglas de cache (HTML no-cache; js/css/imágenes immutable).

Se **añade** únicamente:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>
```

Archivos reales (`*.js`, `*.css`, assets, imágenes, etc.) siguen sirviéndose directo. Solo rutas inexistentes caen a `index.html`.

Generado en: `dist/projectSolarFishFrontend/browser/.htaccess` tras `npm run build:test`.

---

### 6. Despliegue requerido

El fix **no aplica en TEST hasta redeploy** del frontend con el nuevo `.htaccess`.

Checklist post-deploy:

1. Abrir **directamente** la URL del QR (sin pasar por home).
2. Network → documento `/consulta/ot/TOKEN` → **200** (`index.html`).
3. Angular inicia → consulta pública.
4. XHR → `/api/v1/consulta/ot/...` (host API) → 200 o error de negocio (no 404 de documento).
5. **F5** sigue en 200.
6. Escanear QR físico → misma URL → consulta visible.

Si el documento es 200 y la API 404 → **no** tocar más `.htaccess`; auditar backend aparte.

---

### 7. Tests

| Archivo | Cobertura |
|---------|-----------|
| `app.routes.public.spec.ts` | Ruta pública sin guards; no anidada en admin |
| `consulta-ot-publica.spec.ts` | Token válido; token vacío; 404 API (ya existía) |

Validación F5 / QR móvil: manual post-deploy (E2E de hosting).

---

### 8. Resultado esperado final

```text
QR → https://test…/consulta/ot/TOKEN
  → HTTP 200 (document / index.html)
  → Angular Router
  → ConsultaOtPublicaComponent
  → GET API pública
  → UI de consulta
```

**No modificado:** QR, ZXing, `tokenConsulta`, PDF, workflow, D.1/D.3, firma, listado servicios, backend.
