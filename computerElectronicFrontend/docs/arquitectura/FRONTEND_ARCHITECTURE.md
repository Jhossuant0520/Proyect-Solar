# SOLVIX — Arquitectura Frontend

**Proyecto:** `projectSolvixFrontend` (Angular 20, standalone)  
**Documento vivo:** resume el estado real de la arquitectura del panel administrativo  
**Fecha:** 2026-09-11  
**Fases cubiertas:** 3.1 → 3.6 (ver `docs/frontend/`)

---

## 1. Principio rector

> **SOLVIX no simplifica la ingeniería. SOLVIX simplifica la forma de entenderla.**

| Capa | Responsabilidad |
|------|-----------------|
| **Backend** | Fuente de verdad: reglas, cálculos, inventario, costeo, autorización, persistencia |
| **Angular** | Presentación, interacción, validación básica, mapeo DTO → UI |

Prohibido en frontend: inventar endpoints, recalcular métricas oficiales, mutar stock/costo por cuenta propia.

---

## 2. Stack

- Angular 20 standalone components
- Angular Router + functional guards
- HttpClient + interceptor funcional JWT
- Angular Material (diálogos, snackbars) cuando aporta
- SCSS + tokens SOLVIX
- Chart.js (evolución de ventas)
- Sin NgModules de feature

---

## 3. Estructura de carpetas

```
src/app/
├── core/                 # guards, interceptors, services, models
├── layout/admin-layout/  # shell del panel
├── shared/components/    # UI kit SOLVIX
├── features/
│   ├── access/           # login, register, mi-cuenta
│   ├── admin/coming-soon/
│   ├── panelAdmin/
│   │   ├── dashboard/
│   │   ├── producto/
│   │   ├── venta/
│   │   └── compra/
│   └── business/         # HSP, demanda recibo (fuera del panel)
├── homepage/
└── app.routes.ts
```

Documentación de fases:

```
docs/
├── frontend/
│   ├── FASE_3_1_FOUNDATION.md
│   ├── FASE_3_2_DASHBOARD_UI.md
│   ├── FASE_3_3_DASHBOARD_API.md
│   ├── FASE_3_4_PRODUCTOS.md
│   ├── FASE_CODIGO_BARRAS.md
│   ├── FASE_3_5_VENTAS.md
│   └── FASE_3_6_COMPRAS.md
└── arquitectura/
    └── FRONTEND_ARCHITECTURE.md   ← este archivo
```

---

## 4. Shell del panel (FASE 3.1)

- `AdminLayoutComponent`: sidebar + topbar + `router-outlet`
- Nav filtrada por `adminOnly` vs `AuthService.esAdmin()`
- `authGuard` en el layout; `adminGuard` en módulos comerciales
- Coming-soon para Clientes, Proveedores, Inventario, Reportes

---

## 5. Mapa de rutas del panel

| Módulo | Rutas principales | Guard extra |
|--------|-------------------|-------------|
| Dashboard | `/dashboard` | — (auth del layout) |
| Cuenta | `/mi-cuenta` | — |
| Productos | `/productos`, `/nuevo`, `/:id`, `/:id/editar` | `adminGuard` |
| Ventas | `/ventas`, `/nueva`, `/:id`, devoluciones | `adminGuard` |
| Compras | `/compras`, `/nueva`, `/:id`, devoluciones | `adminGuard` |
| Placeholders | `/clientes*`, `/proveedores*`, `/inventario`, `/reportes` | `adminGuard` |

Detalle completo en cada `FASE_3_X_*.md`.

---

## 6. Seguridad (capas)

```
Usuario → authGuard → adminGuard (si aplica) → HTTP + Bearer → Backend @PreAuthorize
```

- Frontend: UX de navegación
- Backend: autoridad real
- Token: `localStorage` + `jwt-decode` (exp / rol / sub)

---

## 7. Patrones por módulo comercial

Patrón repetido (Productos / Ventas / Compras):

1. **Lista** — filtros API + búsqueda local + estados loading/empty/error  
2. **Form** — reactive forms, catálogos activos, envío de request  
3. **Detalle** — acciones según estado backend  
4. **Mapper/UI helpers** — labels, tones, formatters `es-CO`  
5. **Shared kit** — page-header, buttons tech, badges, metric-card, dialogs  

Ventas y Compras son módulos gemelos de ciclo de vida (`PENDIENTE` → completar/cancelar → devoluciones).

---

## 8. Dashboard (FASES 3.2 + 3.3)

- UI: secciones composables + Chart.js  
- API: `AnalyticsService` → mapper → `*Vista`  
- Estados de métrica del backend presentados, no reinventados  
- Insights: derivados en cliente a partir de DTOs ya cargados  

---

## 9. Identidad visual

Tokens (`_solvix-tokens.scss`):

- Fondo `#020617`, surface `#0F172A`
- Primary `#4FD1FF`, secondary `#38BDF8`, neon `#00E5FF`
- Texto `#FFFFFF` / muted `#94A3B8`

Botones del panel: familia **Tech-Minimal** (`solvix-button` + `_solvix-buttons.scss`).

Referencias Stitch en `REFERENCE_code/` — **nunca** se pegar HTML; se adaptan a componentes.

---

## 10. Servicios core relevantes

| Servicio | Dominio |
|----------|---------|
| `AuthService` / `CuentaService` | Sesión y cuenta |
| `AnalyticsService` | Dashboard + KPIs listas |
| `ProductoService` / `CategoriaProductoService` / `InventarioService` | Catálogo e inventario |
| `VentaService` / `ClienteService` | Ventas |
| `CompraService` / `ProveedorService` | Compras |

---

## 11. Formato de dinero y fechas

- Listas/detalles comerciales: `formatImporte` / `formatFechaVenta` (`venta-ui.ts`, locale `es-CO`)
- KPIs compactos: `formatMetricValue` / `formatMoney` (`dashboard-format.ts`, p. ej. `$1,26 M`)

No se alteran fórmulas; solo presentación.

---

## 12. Documentación obligatoria de fases

A partir de FASE 3.x, **cada fase frontend** debe cerrar con:

1. Implementación  
2. Validación (build / tests)  
3. Archivo `docs/frontend/FASE_X_X_NOMBRE.md` con las 20 secciones estándar  
4. Verificación de que el documento coincide con el código real  

Reglas:

- No borrar documentación histórica  
- Si se corrige una fase, actualizar su MD indicando la corrección  
- No documentar como hecho lo pendiente  
- No inventar endpoints  

---

## 13. Estado de módulos (resumen)

| Módulo | Estado |
|--------|--------|
| Foundation / shell | Completo |
| Dashboard UI + API | Completo |
| Productos | Completo (sin CRUD categorías) |
| Ventas | Completo (clientes solo consumo) |
| Compras | Completo (proveedores solo consumo) |
| Clientes / Proveedores / Inventario / Reportes | Coming-soon |
| Catálogo público `/Catalogo` | Existe; no es foco de 3.1–3.6 |

---

## 14. Limitaciones transversales

- Sin paginación server-side en listas comerciales  
- Búsquedas por texto suelen ser locales  
- Specs Karma con fallos preexistentes ajenos a estos módulos  
- Base URL hardcodeada a `http://localhost:8080` en servicios  

---

## 15. Próximos pasos sugeridos (no implementados aquí)

- FASE clientes / proveedores  
- Inventario unificado  
- Reportes  
- Externalizar `environment` API URL  
- Paginación y search HTTP cuando el backend lo exponga  

---

## 16. Referencias cruzadas

| Fase | Documento |
|------|-----------|
| 3.1 Foundation | [FASE_3_1_FOUNDATION.md](../frontend/FASE_3_1_FOUNDATION.md) |
| 3.2 Dashboard UI | [FASE_3_2_DASHBOARD_UI.md](../frontend/FASE_3_2_DASHBOARD_UI.md) |
| 3.3 Dashboard API | [FASE_3_3_DASHBOARD_API.md](../frontend/FASE_3_3_DASHBOARD_API.md) |
| 3.4 Productos | [FASE_3_4_PRODUCTOS.md](../frontend/FASE_3_4_PRODUCTOS.md) |
| Código de barras | [FASE_CODIGO_BARRAS.md](../frontend/FASE_CODIGO_BARRAS.md) |
| 3.5 Ventas | [FASE_3_5_VENTAS.md](../frontend/FASE_3_5_VENTAS.md) |
| 3.6 Compras | [FASE_3_6_COMPRAS.md](../frontend/FASE_3_6_COMPRAS.md) |
