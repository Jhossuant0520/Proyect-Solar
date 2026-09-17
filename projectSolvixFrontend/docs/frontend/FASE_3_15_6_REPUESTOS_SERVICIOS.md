# SOLVIX — FASE 3.15.6 Repuestos en Servicios (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Backend:** `FASE_3_15_6_REPUESTOS_INVENTARIO.md`  
**Restricción:** No se modificó backend, DTOs ni endpoints.

---

## Objetivo

Permitir planificar, editar, anular, consumir y devolver **repuestos** (productos) en `/servicios/:id`, reutilizando el contrato existente de `/api/v1/ordenes-servicio/{id}/repuestos`.

---

## Contratos

| Método | Ruta | Inventario |
|--------|------|------------|
| GET | `/repuestos` | No |
| POST | `/repuestos` | No (planificar) |
| PUT | `/repuestos/{repuestoId}` | No |
| DELETE | `/repuestos/{repuestoId}` | No (soft-anular) |
| POST | `/repuestos/{repuestoId}/consumir` | Sí |
| POST | `/repuestos/{repuestoId}/devolver` | Sí |

Modelos en `orden-servicio.models.ts`:

- `EstadoRepuestoOrdenServicio`
- `RepuestoOrdenServicioResponseDTO`
- `RepuestoOrdenServicioRequestDTO`
- `ConsumirRepuestoRequestDTO`
- `DevolverRepuestoRequestDTO`

---

## UI

Panel `ServicioRepuestosPanelComponent` en el detalle de OT, **después de Sección técnica** y **antes de Fechas**.

Por línea:

- Chip de estado (`PLANIFICADO` / `PARCIAL` / `CONSUMIDO` / `DEVUELTO` / `ANULADO`)
- Cantidades: Planificado · Consumido · Devuelto · Pendiente
- Costo histórico con `formatMoney` **o** texto «Costo histórico no disponible» (nunca `$0` si es null)
- Badge «Producto inactivo» si `productoActivo === false`
- Acciones según flags del DTO + `canManage` + estado OT

Modales (`MatDialog`, Tech-Minimal):

1. **Agregar** — búsqueda por nombre + código (`ProductoService.listar({ activo: true })` + `resolverProductoPorCodigoBarras`)
2. **Editar cantidad** / **Consumir** / **Devolver** — cantidad acotada
3. **Anular** — confirmación soft-delete

Estados: loading / empty / error.

---

## Reglas de operación (UI alineada al backend)

| Acción | Cuándo |
|--------|--------|
| Planificar / editar / anular | OT no terminal y estados de planificación (hasta `ESPERA_REPUESTO`) |
| Consumir | Solo `EN_REPARACION` / `ESPERA_REPUESTO` (flags `puedeConsumir`) |
| Devolver | Según `puedeDevolver` (incluye LISTO/ENTREGADO en backend) |

La autoridad sigue siendo el backend.

---

## Próxima acción

`textoProximaAccion(estado, { pendingRepuestos })` ajusta el copy en `EN_REPARACION` y `ESPERA_REPUESTO` cuando hay unidades pendientes.

El detalle recibe `repuestosChange` del panel y muestra contexto de espera.

---

## Seguridad

Ruta admin existente. Endpoints backend `ADMIN`. Sin cambios de guards.

---

## Tests

| Spec | Cobertura |
|------|-----------|
| `servicio-repuestos-panel.spec.ts` | lista, empty/error, costo null, producto inactivo, agregar mock, consumir mock, pending emit |
| `orden-servicio.service.spec.ts` | GET/POST/PUT/DELETE/consumir/devolver |
| `servicio-ui.spec.ts` | próxima acción con pendientes, planificación, costo null |

---

## Build

```bash
npm run build
npx ng test --include=**/servicio-repuestos-panel.spec.ts --watch=false --browsers=ChromeHeadless
npx ng test --include=**/orden-servicio.service.spec.ts --watch=false --browsers=ChromeHeadless
npx ng test --include=**/servicio-ui.spec.ts --watch=false --browsers=ChromeHeadless
```

- `npm run build`: OK  
- Specs de esta fase: panel **8/8**, `orden-servicio.service` + `servicio-ui` **27/27** OK

---

## Limitaciones

- Sin cobro / Venta de OT.
- Sin mano de obra ni cotización monetaria de servicio.
- Sin módulo global de repuestos fuera del detalle de OT.
- Stock 0 se puede planificar; el consumo falla en backend si no hay stock.

---

## Archivos

**Creados**

- `servicio-repuestos-panel/*` (+ diálogos planificar / cantidad)
- `docs/frontend/FASE_3_15_6_REPUESTOS_SERVICIOS.md`

**Modificados**

- `orden-servicio.models.ts`
- `orden-servicio.service.ts` (+ spec)
- `servicio-detail.ts` / `.html`
- `servicio-ui.ts` (+ spec)
