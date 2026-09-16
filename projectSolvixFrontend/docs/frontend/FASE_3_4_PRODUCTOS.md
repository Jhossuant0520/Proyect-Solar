# SOLVIX — FASE 3.4
## Módulo de Productos

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** CRUD + detalle + ajuste de costo + movimientos  
**Fecha de documentación:** 2026-09-11

---

### 1. Objetivo

Permitir administrar el catálogo de productos del negocio: crear, editar, consultar, desactivar, ajustar costo e inspeccionar movimientos de inventario y historial de costos, respetando que el backend es la fuente de verdad de stock y costeo.

---

### 2. Alcance

**Incluido**

- Lista con filtros y KPIs de inventario (vía Analytics)
- Alta / edición de producto
- Detalle con movimientos y ajustes de costo
- Diálogo de ajuste de costo
- Categorías activas para el formulario
- Soft-desactivar producto
- Distinción costo histórico/actual vs “sin costo”

**Fuera de alcance**

- Módulo completo de Inventario (ruta coming-soon)
- CRUD de categorías en UI
- Recalcular costos o stock en Angular

---

### 3. Rutas

Todas bajo `AdminLayout` + `authGuard`, y además `adminGuard`:

| URL | Componente | Guards | Propósito |
|-----|------------|--------|-----------|
| `/productos` | `ProductoList` | `adminGuard` | Catálogo |
| `/productos/nuevo` | `ProductoComponent` | `adminGuard` | Alta |
| `/productos/:id/editar` | `ProductoComponent` | `adminGuard` | Edición |
| `/productos/:id` | `ProductoDetailComponent` | `adminGuard` | Detalle |

Redirects legacy: `/producto` → nuevo; `/listaproductos` → lista; `/editar-producto/:id` → editar.

---

### 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `ProductoList` | Filtros, tabla/cards, KPIs inventario, acciones |
| `ProductoComponent` | Formulario create/edit |
| `ProductoDetailComponent` | Ficha, stock, movimientos recientes, historial costos |
| `AjusteCostoDialogComponent` | Modal MatDialog para `POST` ajuste de costo |

Helpers: `productoClase.ts` (modelos), `producto-ui.ts` (labels/parseo).

---

### 5. Servicios

| Servicio | Uso |
|----------|-----|
| `ProductoService` | CRUD productos |
| `CategoriaProductoService` | Listar categorías |
| `InventarioService` | Ajustes de costo y movimientos |
| `AnalyticsService.inventario` | KPIs de lista (stock crítico, valor inventario) |

---

### 6. Endpoints

| Método | Endpoint | Propósito | Parámetros / body | Cuándo |
|--------|----------|-----------|-------------------|--------|
| `GET` | `/api/v1/productos` | Listar | `marca`, `categoriaId`, `precioMin`, `precioMax`, `stockMin`, `activo` | Lista |
| `GET` | `/api/v1/productos/{id}` | Detalle | — | Detalle / editar |
| `POST` | `/api/v1/productos` | Crear | `ProductoRequestDTO` | Alta |
| `PUT` | `/api/v1/productos/{id}` | Actualizar | `ProductoRequestDTO` | Edición |
| `DELETE` | `/api/v1/productos/{id}` | Desactivar (soft) | — | Lista / detalle |
| `GET` | `/api/v1/categorias-producto` | Categorías | `soloActivas` | Formulario |
| `POST` | `/api/v1/inventario/ajustes/costo` | Ajustar costo | request de ajuste | Diálogo |
| `GET` | `/api/v1/inventario/ajustes/costo` | Historial ajustes | `productoId` | Detalle |
| `GET` | `/api/v1/inventario/movimientos` | Movimientos | `productoId` | Detalle |
| `GET` | `/api/v1/analytics/inventario` | KPIs | `desde`, `hasta` | Cards de lista |

---

### 7. Flujo funcional

**Alta**

1. Admin abre `/productos/nuevo`.
2. Carga categorías activas.
3. Envía `POST /productos` (precio, costo opcional, stock inicial opcional).
4. Backend crea producto y, si aplica, movimiento inicial de stock.

**Edición**

1. Carga producto.
2. Campos de costo actual y stock inicial deshabilitados en UI.
3. `PUT` no reenvía `costoActual` (queda a cargo de ajuste).

**Ajuste de costo**

1. Diálogo pide costo nuevo + motivo (+ observaciones).
2. `POST /inventario/ajustes/costo`.
3. Backend actualiza costo vigente; stock **no** cambia.
4. Detalle refresca historial.

**Desactivar**

1. Confirmación.
2. `DELETE /productos/{id}` → `activo=false`.

---

### 8. Estados y reglas

| Concepto | Regla en UI (alineada al backend) |
|----------|-----------------------------------|
| Costo desconocido | `costoConocido === false` → “Sin costo” (no es $0) |
| Costo en create | Vacío → se envía como desconocido |
| Costo en edit | Solo vía ajuste |
| Stock | Create: `stockInicial`; edit: no se muta desde el form |
| Activo | Badge + filtro; inactivo no se “desactiva” otra vez |
| Motivos de ajuste | `CORRECCION_ERROR`, `ACTUALIZACION_PROVEEDOR`, `CARGA_DE_COSTO_INICIAL`, `REVALUACION`, `OTRO` |

---

### 9. Responsabilidades

**FRONTEND**

- Formularios y validación básica
- Presentación de costo/stock/activo
- Filtros soportados por API + búsqueda local por nombre/id

**BACKEND**

- Persistencia
- Soft-delete
- Movimientos de inventario
- Política de costeo / validez del ajuste
- Autorización ADMIN

---

### 10. Modelos / DTO / Mapper

- `ProductoModel` / request-response en `productoClase.ts`
- Respuestas de inventario (`inventario.models.ts`)
- Lista usa `formatMoney` / `formatMetricValue` para KPIs (mismo formatter del dashboard)
- No hay mapper de negocio que recalcule valor de inventario: viene de Analytics

---

### 11. Componentes compartidos reutilizados

- `solvix-page-header`, `solvix-button` (tech), `solvix-badge`
- `solvix-metric-card`, `solvix-field-help`
- `solvix-loading-state` / `empty` / `error`
- `DialogoConfirmacionDelete`, MatDialog, MatSnackBar

---

### 12. Seguridad

- `adminGuard` en todas las rutas de productos
- Backend: `@PreAuthorize("hasRole('ADMIN')")` en controladores
- JWT vía interceptor

---

### 13. Estados visuales

- Lista: loading / empty / error / filtros sin resultados
- Detalle: loading / error / ready
- Diálogo: validación de costo igual al vigente cuando ya hay costo conocido
- KPIs: `COSTO_INCOMPLETO` en valor de inventario si aplica

---

### 14. Responsive / UX

- Tabla desktop + cards móvil
- Copy: “Dinero invertido en inventario” (costo actual × stock), no valor de venta
- Formulario con ayudas (`solvix-field-help`) sobre imagen URL (enlace, no upload de archivo de producto)

---

### 15. Stitch / referencia visual

- `REFERENCE_code/SecionProdcuto.cursorrules` — lista
- `REFERENCE_code/VistaDetalladaProducto.cursorrules` — detalle + modal de costo

Adaptados a Angular/SCSS/componentes SOLVIX; no se copia HTML.

---

### 16. Backend

Backend no modificado por esta fase de frontend (se usan APIs existentes de productos/inventario/categorías).

---

### 17. Limitaciones actuales

- No hay UI de administración de categorías
- No hay upload de imagen de producto (solo URL)
- Módulo Inventario global aún coming-soon
- Búsqueda por nombre es local sobre la página cargada
- Sin paginación server-side

---

### 18. Validación

- Integrado en `npm run build` del frontend
- Sin suite dedicada de productos en Karma al cierre de la fase

---

### 19. Pendientes

- CRUD categorías
- Paginación
- Pantalla Inventario unificada
- Upload de imagen si el backend lo soporta en el futuro

---

### 20. Archivos relevantes

```
src/app/features/panelAdmin/producto/producto-list/*
src/app/features/panelAdmin/producto/producto.*
src/app/features/panelAdmin/producto/producto-detail/*
src/app/features/panelAdmin/producto/ajuste-costo-dialog/*
src/app/features/panelAdmin/producto/productoClase.ts
src/app/features/panelAdmin/producto/producto-ui.ts
src/app/core/services/producto.service.ts
src/app/core/services/inventario.service.ts
src/app/core/services/categoria-producto.service.ts
REFERENCE_code/SecionProdcuto.cursorrules
REFERENCE_code/VistaDetalladaProducto.cursorrules
```
