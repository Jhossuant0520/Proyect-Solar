# SOLVIX — FASE 3.1
## Foundation del panel administrativo

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** código real al cierre de la fase y arquitectura vigente  
**Fecha de documentación:** 2026-09-11

---

### 1. Objetivo

Establecer la base estructural del panel administrativo de SOLVIX para que todos los módulos posteriores (Dashboard, Productos, Ventas, Compras, etc.) compartan:

- un layout común (sidebar + topbar + contenido)
- navegación segura
- componentes reutilizables
- tokens de identidad visual
- arquitectura Angular standalone

Sin esta fase, cada módulo reinventaría shell, guards y estilos.

---

### 2. Alcance

**Incluido**

- Estructura `core` / `layout` / `shared` / `features`
- `AdminLayoutComponent` (shell)
- Sidebar + Topbar
- `authGuard` y `adminGuard`
- Rutas del panel bajo el layout autenticado
- Componentes compartidos SOLVIX
- Pantalla `coming-soon` para módulos aún no conectados
- Tokens SCSS oficiales
- Interceptor JWT
- Arquitectura standalone (sin NgModules de feature)

**Fuera de alcance**

- Lógica de negocio de módulos (productos, ventas, compras)
- CRUD de clientes / proveedores / inventario / reportes (solo rutas coming-soon)
- Sustituir la autorización del backend

---

### 3. Rutas

Layout padre:

| URL | Componente | Guards | Propósito |
|-----|------------|--------|-----------|
| `''` (padre) | `AdminLayoutComponent` | `authGuard` | Shell del panel |

Hijos relevantes de foundation:

| URL | Componente | Guards | Propósito |
|-----|------------|--------|-----------|
| `/dashboard` | `DashboardComponent` | solo `authGuard` (heredado) | Entrada del panel |
| `/mi-cuenta` | `MiCuenta` | `authGuard` | Cuenta del usuario autenticado |
| `/clientes`, `/clientes/nuevo`, `/clientes/:id` | `ComingSoonPage` (lazy) | `adminGuard` | Placeholder |
| `/proveedores`, `/proveedores/nuevo`, `/proveedores/:id` | `ComingSoonPage` | `adminGuard` | Placeholder |
| `/inventario` | `ComingSoonPage` | `adminGuard` | Placeholder |
| `/reportes` | `ComingSoonPage` | `adminGuard` | Placeholder |

Rutas públicas fuera del layout: `/`, `/login`, `/register`, `/Catalogo`, módulos de cálculo, etc.

Definición: `src/app/app.routes.ts`.

---

### 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `AdminLayoutComponent` | Orquesta sidebar, topbar, outlet, logout, filtro de nav por rol, carga de foto de cuenta |
| `AdminSidebarComponent` | Navegación lateral con ítems activos |
| `AdminTopbarComponent` | Menú móvil, búsqueda (placeholder), avatar/nombre, logout |
| `ComingSoonPage` | Pantalla de módulo pendiente con `titulo` / `descripcion` desde `route.data` |

Nav: `admin-nav.ts` — Dashboard (todos), resto `adminOnly: true`.

---

### 5. Servicios

| Servicio | Uso en foundation |
|----------|-------------------|
| `AuthService` | Login, token JWT, rol, sesión |
| `CuentaService` | Datos de cuenta / foto (consumido por layout/topbar) |

No se crean servicios de dominio comercial en esta fase.

---

### 6. Endpoints

Foundation no implementa CRUD comercial. Endpoints relacionados con shell/auth:

| Método | Endpoint | Propósito | Cuándo |
|--------|----------|-----------|--------|
| `POST` | `/api/auth/login` | Autenticación | Login |
| `GET` | `/api/cuenta/mis-datos` | Nombre, email, fechas, `fotoUrl` | Al entrar al layout autenticado |
| `POST` | `/api/cuenta/foto` | Subir foto | Mi cuenta |
| `DELETE` | `/api/cuenta/foto` | Quitar foto | Mi cuenta |
| `GET` | `/api/cuenta/avatares/{archivo}` | Servir imagen | Topbar / Mi cuenta |
| `PUT` | `/api/cuenta/cambiar-password` | Cambio de contraseña | Mi cuenta |

---

### 7. Flujo funcional

1. Usuario inicia sesión → `AuthService.login` → guarda JWT en `localStorage`.
2. Navega a una ruta del panel → `authGuard` valida token no expirado.
3. Si la ruta es admin-only → `adminGuard` exige `rol === 'ADMIN'`; si no, redirige a `/dashboard`.
4. `AdminLayout` renderiza nav filtrada, topbar y `router-outlet`.
5. `AuthInterceptor` adjunta `Authorization: Bearer <token>` a las peticiones HTTP.
6. Módulos no listos muestran `ComingSoonPage` con copy desde `data`.

---

### 8. Estados y reglas

No hay estados de dominio comercial en foundation.

Reglas de navegación:

- Sin sesión → `/login`
- Sesión no admin en ruta admin → `/dashboard`
- Ítems `adminOnly` ocultos del sidebar para no-admin

---

### 9. Responsabilidades

**FRONTEND**

- Presentación del shell
- Interacción de navegación
- Guards como capa de UX
- Tokens y componentes compartidos

**BACKEND**

- Validación JWT
- `@PreAuthorize` / roles reales
- Persistencia de usuario y foto
- Autorización definitiva de APIs

Los guards **no** sustituyen la seguridad del backend.

---

### 10. Modelos / DTO / Mapper

- JWT decodificado: `sub` / `nombreUsuario`, `rol`, `exp`
- `MisDatos` (cuenta): `nombreUsuario`, `email`, `fechaCreacion`, `ultimoLogin`, `fotoUrl`
- `AdminNavItem`: `label`, `path`, `icon`, `adminOnly`

Sin mapper de negocio en esta fase.

---

### 11. Componentes compartidos reutilizados

Creados/disponibles para todas las fases:

- `solvix-button` (familias tech / glass / cyber)
- `solvix-badge`
- `solvix-card`
- `solvix-page-header`
- `solvix-section-header`
- `solvix-metric-card`
- `solvix-field-help`
- `solvix-loading-state` / `solvix-empty-state` / `solvix-error-state`
- `dialogo-confirmacion-delete`

---

### 12. Seguridad

| Capa | Comportamiento |
|------|----------------|
| `authGuard` | Requiere autenticación |
| `adminGuard` | Requiere ADMIN; si no, `/dashboard` |
| `AuthInterceptor` | Adjunta Bearer token |
| Backend | Autoridad real de cada endpoint |

---

### 13. Estados visuales

- Layout siempre visible tras auth
- Coming-soon: mensaje claro de módulo pendiente
- Topbar: inicial o foto de perfil
- Sin estados loading de dominio en el shell (salvo carga silenciosa de cuenta)

---

### 14. Responsive / UX

- Desktop: sidebar fija + contenido
- ≤1023px: sidebar off-canvas + backdrop + botón menú
- Topbar: búsqueda oculta en móvil; nombre oculto en pantallas pequeñas
- Un scroll vertical principal en el contenido del panel
- Familia de botones del panel: **Tech-Minimal**

---

### 15. Stitch / referencia visual

No hay un Stitch exclusivo de “foundation”. La identidad se toma de:

- Tokens en `src/styles/_solvix-tokens.scss`
- Skill de botones SOLVIX
- Referencias posteriores por módulo en `REFERENCE_code/`

No se copia HTML de Stitch.

---

### 16. Backend

Backend no modificado **como parte de la definición de foundation**.

Nota histórica posterior: el soporte de foto de perfil (`foto_url`, endpoints `/api/cuenta/foto`) se añadió al integrar Mi cuenta con la UI del panel. Eso no altera guards ni layout base.

---

### 17. Limitaciones actuales

- Búsqueda del topbar es placeholder (no busca)
- Notificaciones / settings del topbar deshabilitados
- Clientes, proveedores, inventario y reportes solo tienen rutas coming-soon
- No hay paginación global ni shell de breadcrumbs

---

### 18. Validación

- Build Angular: válido en el árbol actual del panel
- Tests unitarios globales: existen fallos **preexistentes** (Login, HomePage, diálogos, HSP, Demanda Recibo) por providers faltantes en specs; no son regresiones del shell

---

### 19. Pendientes

- Completar módulos coming-soon
- Activar búsqueda global cuando exista contrato
- Breadcrumbs opcionales
- Hardening de specs del layout

---

### 20. Archivos relevantes

```
src/app/app.routes.ts
src/app/app.config.ts
src/app/layout/admin-layout/*
src/app/core/guards/auth-guard.ts
src/app/core/guards/admin-guard.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/services/auth.service.ts
src/app/features/admin/coming-soon/coming-soon.ts
src/app/shared/components/*
src/styles/_solvix-tokens.scss
src/styles/_solvix-buttons.scss
```
