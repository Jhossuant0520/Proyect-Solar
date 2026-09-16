# SOLVIX — FASE 3.5
## Módulo de Ventas

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** ciclo completo de ventas + devoluciones  
**Fecha de documentación:** 2026-09-11

---

### 1. Objetivo

Gestionar el ciclo comercial de ventas en el panel: listar, crear, consultar, completar, cancelar y registrar devoluciones, sin duplicar totales, stock ni margen en Angular.

---

### 2. Alcance

**Incluido**

- Lista con filtros API + búsqueda local
- KPIs del período vía `AnalyticsService.resumen` + `mapKpisVentas`
- Crear venta (cliente opcional / consumidor final, líneas, descuentos)
- Detalle con completar / cancelar
- Devolución y reembolso
- Estados visuales y mapeo de errores HTTP

**Fuera de alcance**

- CRUD completo de Clientes (ruta coming-soon; ventas solo lista activos)
- Editar venta ya creada
- Paginación server-side
- Cálculo de totales en cliente

---

### 3. Rutas

Todas con `adminGuard` (+ `authGuard` del layout):

| URL | Componente | Propósito |
|-----|------------|-----------|
| `/ventas` | `VentaListComponent` | Lista + KPIs |
| `/ventas/nueva` | `VentaFormComponent` | Alta |
| `/ventas/:id` | `VentaDetailComponent` | Detalle / acciones |
| `/ventas/:id/devolucion` | `VentaDevolucionFormComponent` | Registrar devolución |
| `/ventas/:id/devoluciones/:devolucionId` | `VentaDevolucionDetailComponent` | Ver / reembolsar |

---

### 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `VentaListComponent` | Filtros, tabla/cards, KPIs |
| `VentaFormComponent` | Armado de venta y envío |
| `VentaDetailComponent` | Totales oficiales, líneas, completar/cancelar, lista devoluciones |
| `VentaDevolucionFormComponent` | Cantidades pendientes + motivo/reembolso |
| `VentaDevolucionDetailComponent` | Documento de devolución + reembolso |

Helpers: `venta-ui.ts`, `venta-mapper.ts`.

---

### 5. Servicios

| Servicio | Uso |
|----------|-----|
| `VentaService` | CRUD operativo de ventas/devoluciones |
| `ClienteService` | `listar(true)` en lista/form |
| `ProductoService` | Catálogo activo en formulario |
| `AnalyticsService` | KPIs de lista (`resumen`) |

---

### 6. Endpoints

| Método | Endpoint | Propósito | Parámetros | Cuándo |
|--------|----------|-----------|------------|--------|
| `GET` | `/api/v1/ventas` | Listar | `clienteId`, `estado`, `desde`, `hasta` | Lista |
| `GET` | `/api/v1/ventas/{id}` | Detalle | — | Detalle / devolución |
| `POST` | `/api/v1/ventas` | Crear | `VentaRequestDTO` | Formulario |
| `POST` | `/api/v1/ventas/{id}/completar` | Completar | body `{}` | Detalle |
| `POST` | `/api/v1/ventas/{id}/cancelar` | Cancelar | body `{}` | Detalle |
| `GET` | `/api/v1/ventas/{id}/devoluciones` | Listar devoluciones | — | Detalle |
| `POST` | `/api/v1/ventas/{id}/devoluciones` | Registrar devolución | `DevolucionVentaRequestDTO` | Form devolución |
| `GET` | `/api/v1/devoluciones-venta/{id}` | Detalle devolución | — | Detalle devolución |
| `POST` | `/api/v1/devoluciones-venta/{id}/reembolsar` | Reembolsar | `ReembolsoRequestDTO` | Si `REGISTRADA` |
| `GET` | `/api/v1/clientes` | Clientes | `soloActivos` | Lista/form |
| `GET` | `/api/v1/productos` | Productos | `activo=true` | Form |
| `GET` | `/api/v1/dashboard/resumen` | KPIs | `desde`, `hasta` | Lista |

---

### 7. Flujo funcional

1. **Crear:** el usuario arma líneas y envía `POST /ventas` → estado `PENDIENTE` → navega al detalle. Totales los calcula el backend.
2. **Completar:** confirmación → `POST .../completar` → backend descuenta stock y congela costos/márgenes según reglas propias.
3. **Cancelar:** solo `PENDIENTE` → `POST .../cancelar` → sin movimiento de inventario.
4. **Devolver:** si `COMPLETADA` o `PARCIALMENTE_DEVUELTA` → form con cantidades ≤ pendientes → `POST .../devoluciones`.
5. **Reembolsar:** si devolución `REGISTRADA` → `POST .../reembolsar` (dinero; inventario ya afectado al registrar).

---

### 8. Estados y reglas

**`EstadoVenta`**

| Estado | Acciones UI |
|--------|-------------|
| `PENDIENTE` | Completar, Cancelar |
| `COMPLETADA` | Registrar devolución |
| `PARCIALMENTE_DEVUELTA` | Registrar devolución |
| `DEVUELTA` | Solo consulta |
| `CANCELADA` | Solo consulta |

**Devolución:** `REGISTRADA` | `REEMBOLSADA`  
**Permite devolución:** `COMPLETADA` \|\| `PARCIALMENTE_DEVUELTA`

Métodos de pago, motivos y métodos de reembolso: catálogos en `venta-ui.ts` alineados a enums backend.

---

### 9. Responsabilidades

**FRONTEND**

- UI, filtros, validación básica (cantidades > 0, líneas requeridas)
- Presentación de totales oficiales
- `mapHttpError` (401/403/404/mensaje API)

**BACKEND**

- Totales, descuentos, stock, costo histórico de líneas
- Transiciones de estado
- Devoluciones y reembolsos
- Autorización ADMIN

---

### 10. Modelos / DTO / Mapper

- `core/models/venta.models.ts` — request/response ventas y devoluciones
- `venta-mapper.ts`:
  - `mapKpisVentas` (reordena KPIs de `mapKpis`, sin recalcular)
  - `resumenProductos`, `clienteVisible`
- Formatters compartidos: `formatImporte`, `formatFechaVenta` (`es-CO`)

---

### 11. Componentes compartidos reutilizados

- `solvix-page-header`, `solvix-section-header`, `solvix-button` (tech)
- `solvix-badge`, `solvix-metric-card`
- loading / empty / error
- `DialogoConfirmacionDelete`, MatSnackBar

---

### 12. Seguridad

- Rutas con `adminGuard`
- Backend ADMIN en controladores de ventas
- Guards no reemplazan `@PreAuthorize`

---

### 13. Estados visuales

- Lista: loading KPIs / loading tabla / empty / error / sin resultados de filtro
- Form: loading catálogo / error submit
- Detalle: confirmaciones + snackbars de éxito/error
- Devolución bloqueada si el estado no permite

---

### 14. Responsive / UX

- Tabla desktop + cards móvil
- Formulario dos columnas → apilado
- Mensajes claros: venta queda pendiente hasta completar; completar afecta inventario

---

### 15. Stitch / referencia visual

- `REFERENCE_code/SeccionVenta.cursorrules`
- `REFERENCE_code/DetalleVenta.cursorrules`

Adaptados; no HTML literal.

---

### 16. Backend

Backend no modificado en esta fase de frontend.

---

### 17. Limitaciones actuales

- Sin edición de venta
- Sin paginación
- Búsqueda por número/cliente local
- Módulo Clientes aún coming-soon
- KPIs de lista dependen de período; “todas” oculta KPIs si se elige esa opción (mismo patrón que compras)

---

### 18. Validación

- `npm run build` OK
- Fallos Karma preexistentes en otros módulos (Login/Home/etc.); no hay suite dedicada de ventas fallando por esta fase

---

### 19. Pendientes

- CRUD clientes
- Paginación / búsqueda HTTP por número
- Exportación
- Más acciones rápidas en lista (completar desde fila) si se desea

---

### 20. Archivos relevantes

```
src/app/features/panelAdmin/venta/**
src/app/core/services/venta.service.ts
src/app/core/services/cliente.service.ts
src/app/core/models/venta.models.ts
REFERENCE_code/SeccionVenta.cursorrules
REFERENCE_code/DetalleVenta.cursorrules
```
