# SOLVIX — FASE 3.6
## Módulo de Compras

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** ciclo completo de compras + devoluciones a proveedor + visualización de analytics  
**Fecha de documentación:** 2026-09-11  
**Cierre FASE 3.6:** visualización de analytics de compras (KPIs + serie + gasto por proveedor) sin tocar backend ni fiscalidad

---

### 1. Objetivo

Implementar el módulo administrativo de Compras integrado con el backend real: listar, crear, completar, cancelar, devolver y reembolsar, respetando costeo histórico, política de costo e inventario controlados exclusivamente por el servidor. Cerrar la presentación analítica de `/compras` con los datos que ya entrega `GET /api/v1/analytics/compras`.

---

### 2. Alcance

**Incluido**

- Lista + KPIs + gráficas analytics (`AnalyticsService.compras`)
- Filtros API (`proveedorId`, `estado`, `desde`, `hasta`) + búsqueda local
- Alta de compra (proveedor, líneas con `costoUnitario`, descuento, observaciones)
- Detalle con completar / cancelar
- Devoluciones y reembolso
- Distinción **costo histórico de línea** vs **costo actual del catálogo**
- Mensajes de inventario según estado

**Fuera de alcance**

- Editar/borrar compra
- CRUD Proveedores (coming-soon; compras solo lista activos)
- IVA / fiscalidad, paginación, export
- Recalcular política de costeo o stock en Angular
- Inventar filtros HTTP no soportados
- Inventar métricas analytics no entregadas por el backend
- Visualizar `productosComprados` (campo disponible; queda fuera de esta UI a propósito)

---

### 3. Rutas

Todas con `adminGuard`:

| URL | Componente | Propósito |
|-----|------------|-----------|
| `/compras` | `CompraListComponent` | Lista + KPIs + analytics + tabla |
| `/compras/nueva` | `CompraFormComponent` | Alta |
| `/compras/:id` | `CompraDetailComponent` | Detalle / ciclo de vida |
| `/compras/:id/devolucion` | `CompraDevolucionFormComponent` | Devolución a proveedor |
| `/compras/:id/devoluciones/:devolucionId` | `CompraDevolucionDetailComponent` | Detalle / reembolso |

---

### 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `CompraListComponent` | Filtros, KPIs, evolución, gasto por proveedor, tabla/cards |
| `CompraGastoEvolutionComponent` | Serie temporal Chart.js (compras / devoluciones / netas) |
| `CompraGastoProveedorComponent` | Barras horizontales de gasto por proveedor |
| `CompraFormComponent` | Armado de compra pendiente |
| `CompraDetailComponent` | Líneas históricas, completar/cancelar, devoluciones, costo catálogo informativo |
| `CompraDevolucionFormComponent` | Cantidades ≤ pendientes, motivo, reembolso opcional |
| `CompraDevolucionDetailComponent` | Documento DC-… + reembolso |

Helpers: `compra-ui.ts`, `compra-mapper.ts`.

---

### 5. Servicios

| Servicio | Uso |
|----------|-----|
| `CompraService` | Compras y devoluciones |
| `ProveedorService` | `listar(true)` |
| `ProductoService` | Catálogo activo + costo actual en detalle |
| `AnalyticsService.compras` | KPIs, serie y gasto por proveedor de lista |

---

### 6. Endpoints

| Método | Endpoint | Propósito | Parámetros | Cuándo |
|--------|----------|-----------|------------|--------|
| `GET` | `/api/v1/compras` | Listar | `proveedorId`, `estado`, `desde`, `hasta` | Lista |
| `GET` | `/api/v1/compras/{id}` | Detalle | — | Detalle / devolución |
| `POST` | `/api/v1/compras` | Crear (`PENDIENTE`) | `CompraRequestDTO` | Form |
| `POST` | `/api/v1/compras/{id}/completar` | Entrada inventario + costeo | — | Detalle |
| `POST` | `/api/v1/compras/{id}/cancelar` | Cancelar pendiente | — | Detalle |
| `GET` | `/api/v1/compras/{id}/devoluciones` | Listar devoluciones | — | Detalle |
| `POST` | `/api/v1/compras/{id}/devoluciones` | Registrar devolución | `DevolucionCompraRequestDTO` | Form |
| `GET` | `/api/v1/devoluciones-compra/{id}` | Detalle devolución | — | Detalle DC |
| `POST` | `/api/v1/devoluciones-compra/{id}/reembolsar` | Reembolsar | `ReembolsoRequestDTO` | Si `REGISTRADA` |
| `GET` | `/api/v1/proveedores` | Proveedores | `soloActivos=true` | Lista/form |
| `GET` | `/api/v1/productos` | Productos | `activo=true` | Form |
| `GET` | `/api/v1/analytics/compras` | Analytics de compras | `desde`, `hasta`, `agrupacion`, `proveedorId?` | Lista |

---

### 7. Flujo funcional

1. **Crear:** `POST /compras` → `PENDIENTE`. **No** mueve inventario.
2. **Completar:** backend aplica `PoliticaCosteoInventario` (p. ej. último costo), registra movimiento `COMPRA`, actualiza `producto.costoActual` y stock.
3. **Cancelar:** solo `PENDIENTE`; sin movimiento.
4. **Devolver:** solo `COMPLETADA` o `PARCIALMENTE_DEVUELTA`. Al registrar: salida `DEVOLUCION_COMPRA` inmediata; montos con costo **histórico** de `DetalleCompra`.
5. **Reembolsar:** marca dinero; **no** vuelve a mover stock.

Angular nunca hace `stock + cantidad`.

---

### 8. Estados y reglas

**`EstadoCompra`**

| Estado | Acciones UI |
|--------|-------------|
| `PENDIENTE` | Completar, Cancelar |
| `COMPLETADA` | Devolver |
| `PARCIALMENTE_DEVUELTA` | Devolver |
| `DEVUELTA` | Consulta |
| `CANCELADA` | Consulta |

**Devolución compra:** `REGISTRADA` | `REEMBOLSADA`  
Pendiente por línea (UI): `cantidad - cantidadDevuelta` (el DTO no expone `cantidadPendienteDevolucion`).

Validación UI: `Validators.max(pendiente)`, clamp antes de enviar; autoridad final = backend.

---

### 9. Responsabilidades

**FRONTEND**

- Presentación, formularios, validación básica
- Mostrar costo histórico de compra vs costo actual de catálogo (informativo)
- Mapper de analytics → KPIs / serie / proveedores (sin recalcular)

**BACKEND**

- Totales, descuentos, número `C-…` / `DC-…`
- Inventario y política de costeo
- Prorrateo de devoluciones
- Autorización ADMIN
- Fórmulas y agregaciones de analytics

---

### 10. Modelos / DTO / Mapper

- `core/models/compra.models.ts` — contratos alineados a Java
- `compra-mapper.ts`: `mapKpisCompras`, `mapSerieCompras`, `mapGastoPorProveedor`, `resumenProductosCompra`, `proveedorVisible`, `cantidadPendienteDevolucion`
- Formatters reutilizados de `venta-ui.ts` y `dashboard-format.ts`

Campos críticos de línea: `costoUnitario` (histórico), `subtotal`, `cantidadDevuelta`.

---

### 11. Componentes compartidos reutilizados

- `solvix-page-header`, `solvix-section-header`, `solvix-button` (tech)
- `solvix-badge`, `solvix-metric-card` (+ help/statusNote)
- loading / empty / error
- `solvix-section-state` (dashboard)
- Chart.js (mismo patrón que evolución de ventas)
- `DialogoConfirmacionDelete`, MatSnackBar

---

### 12. Seguridad

- `adminGuard` en todas las rutas
- Backend `@PreAuthorize("hasRole('ADMIN')")` en controladores de compras
- JWT interceptor

---

### 13. Estados visuales

- Lista: KPIs loading/error/hidden (si período “todas”), tabla empty/error
- Bloques analytics: loading / empty / error / ready por sección
- Detalle: mensajes contextuales de inventario por estado
- Devolución: líneas sin pendiente deshabilitadas
- Reembolso solo si `REGISTRADA`

---

### 14. Responsive / UX

- Jerarquía: KPIs → evolución → gasto por proveedor → tabla
- Desktop: KPIs en fila; split evolución | proveedores
- Tablet/móvil: cards apiladas; gráficas responsivas; tabla con scroll horizontal solo si hace falta
- Un solo scroll vertical principal (sin nested scroll en proveedores)
- Copy: inventario entra al completar; costo de línea no se reescribe con el catálogo
- Stitch proponía IVA/avatars/paginación: **no implementados** (sin contrato)

---

### 15. Stitch / referencia visual

- `REFERENCE_code/SeccionCompras.cursorrules`
- `REFERENCE_code/DetalleCompra.cursorrules`

Usados como referencia de jerarquía/spacing; no copia literal. Elementos sin backend (IVA, recepción stats, proveedores activos como 4º KPI) no se inventaron; el 4º KPI real es **Órdenes**.

---

### 16. Backend

**Backend no modificado** en FASE 3.6 frontend.  
Se adaptó Angular a contratos existentes.

---

### 17. Limitaciones actuales

- Sin editar compra / sin paginación / sin search HTTP por número
- Sin `cantidadPendienteDevolucion` en DTO (se deriva en UI)
- CRUD proveedores pending (coming-soon)
- `productosComprados` del analytics **no visualizado** (deliberado)
- En serie, `ganancia` del `VentasSerieDTO` reutilizado **no aplica** a compras y no se muestra
- No hay undo de devolución

---

## Visualización de Analytics

### Endpoint utilizado

Única fuente:

`GET /api/v1/analytics/compras`

Parámetros consumidos desde la lista: `desde`, `hasta`, `agrupacion` (`DIA` | `SEMANA` | `MES` | `ANIO`), `proveedorId?`.

Si el filtro de período es **Todos los períodos**, el bloque analytics se oculta (no se inventa un rango).

### Métricas visualizadas (KPIs)

Presentadas con `solvix-metric-card` + formatters existentes. **Sin recalcular** en Angular:

| Campo DTO | Etiqueta UI |
|-----------|-------------|
| `comprasNetas` | Compras netas |
| `comprasBrutas` | Compras del período |
| `devolucionesCompra` | Devoluciones a proveedores |
| `ordenes` | Órdenes |

También se respeta `estado` (`OK` / `VALOR_CERO` / `SIN_DATOS`) vía notas de métrica existentes.

### Gráficas agregadas

1. **Evolución del gasto** (`CompraGastoEvolutionComponent`)
   - Serie `CompraAnalyticsDTO.serie` (`VentasSerieDTO[]`)
   - Mapeo de presentación: `ventas` → compras brutas, `devoluciones` → devoluciones, `ventasNetas` → compras netas, `pedidos` → órdenes
   - Selector de métrica visible: compras / devoluciones / compras netas
   - Selector de agrupación: recarga el mismo endpoint (backend reagrupa)

2. **Gasto por proveedor** (`CompraGastoProveedorComponent`)
   - Lista `gastoPorProveedor` (`ProveedorGastoDTO`)
   - Muestra nombre, `comprasNetas`, `participacion`, `ordenes`
   - Orden preservado del backend (compras netas descendente)

### Componentes utilizados

- Nuevos: `compra-gasto-evolution`, `compra-gasto-proveedor`
- Mapper: `mapSerieCompras`, `mapGastoPorProveedor`, `mapKpisCompras`
- Compartidos: `solvix-metric-card`, `solvix-section-header`, `solvix-section-state`, formatters de dashboard/ventas
- Chart.js reutilizado (mismo enfoque que evolución de ventas del dashboard)

### Estados visuales

Cada bloque (KPIs contenedor, evolución, proveedores) soporta:

| Estado | Comportamiento |
|--------|----------------|
| LOADING | `solvix-loading-state` / section-state loading |
| EMPTY | mensaje humano (ej. “No hay compras registradas en este período…”) |
| ERROR | retry hacia `cargarAnalytics()` |
| SUCCESS / READY | cards o gráfica con datos |

### Campos del backend deliberadamente fuera de la UI

| Campo | Motivo |
|-------|--------|
| `productosComprados[]` | Disponible en DTO; no se agregó ranking de productos en `/compras` para no convertir la sección en un segundo dashboard. Queda para una fase posterior si se prioriza. |
| `VentasSerieDTO.ganancia` | Campo del DTO reutilizado de ventas; **no poblado / no aplica** a compras. |
| `periodo` del DTO analytics | El rango visible ya lo controlan los filtros de la lista. |
| `ProveedorGastoDTO.comprasBrutas` / `devoluciones` | Entregados; la barra muestra foco en **compras netas + participación** (suficiente para “¿a quién le compro más?”). Pueden ampliarse en UI sin cambiar backend. |

---

### 18. Validación

- `npm run build` — OK
- `ng test` — fallos **preexistentes** (Login, HomePage, Register, diálogos, HSP, Demanda Recibo, etc.). **Ningún fallo de suite de Compras** (no hay specs del módulo). No se modificaron tests para ocultar fallos.

---

### 19. Pendientes

- UI de proveedores
- Opcional: visualización de `productosComprados`
- Paginación / búsqueda por número en API
- Exponer pendiente de devolución en DTO si se desea menos lógica UI

---

### 20. Archivos relevantes

```
src/app/features/panelAdmin/compra/**
src/app/features/panelAdmin/compra/compra-gasto-evolution/**
src/app/features/panelAdmin/compra/compra-gasto-proveedor/**
src/app/features/panelAdmin/compra/compra-mapper.ts
src/app/core/services/compra.service.ts
src/app/core/services/proveedor.service.ts
src/app/core/services/analytics.service.ts
src/app/core/models/compra.models.ts
src/app/core/models/proveedor.models.ts
src/app/core/models/analytics.models.ts
REFERENCE_code/SeccionCompras.cursorrules
REFERENCE_code/DetalleCompra.cursorrules
docs/frontend/FASE_3_6_COMPRAS.md
```
