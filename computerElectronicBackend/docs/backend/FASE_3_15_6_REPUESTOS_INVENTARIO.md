# SOLVIX — FASE 3.15.6 Repuestos + Inventario (Backend)

**Tipo:** IMPLEMENTACIÓN BACKEND  
**Diseño:** `FASE_3_15_5_DISENO_REPUESTOS.md`  
**Restricción:** Sin frontend, Venta/cobro, técnico, garantías ni analytics.

---

## Objetivo

Permitir planificar y consumir Productos como repuestos en una `OrdenServicio`, moviendo inventario **solo** al confirmar consumo o devolución, siempre vía `InventarioService`.

---

## Modelo

Entidad `OrdenServicioRepuesto` (`orden_servicio_repuestos`):

| Campo | Rol |
|-------|-----|
| ordenServicio / producto | FKs |
| productoNombre | Snapshot |
| cantidadPlanificada / Consumida / Devuelta | Contadores |
| costoUnitario + costoConocido | Histórico congelado (DTO: `costoHistorico`) |
| anulado | Baja lógica |
| fechas | registro / último consumo / última devolución |

Estado **derivado** (`EstadoRepuestoOrdenServicio`): PLANIFICADO, PARCIAL, CONSUMIDO, DEVUELTO, ANULADO.

```
cantidadNetaConsumida = cantidadConsumida - cantidadDevuelta
```

---

## API

Base: `/api/v1/ordenes-servicio/{id}/repuestos` — `ADMIN`

| Método | Ruta | Inventario |
|--------|------|------------|
| GET | `/` | No |
| POST | `/` | No (planificar) |
| PUT | `/{repuestoId}` | No |
| DELETE | `/{repuestoId}` | No (anular si neta=0) |
| POST | `/{repuestoId}/consumir` | CONSUMO_SERVICIO |
| POST | `/{repuestoId}/devolver` | DEVOLUCION_SERVICIO |

---

## Planificación

- Producto activo, cantidad ≥ 1, OT en estados permitidos (hasta ESPERA_REPUESTO).
- Stock 0 permitido al planificar.
- **No** llama a InventarioService.

---

## Consumo

- Solo en `EN_REPARACION` o `ESPERA_REPUESTO` (uso físico confirmado).
- Cantidad ≤ planificada − neta (permite reconsumir unidades previamente devueltas).
- Primer consumo congela `Producto.costoActual` (o null).
- Consumos siguientes reutilizan el mismo costo.
- `InventarioService.registrarMovimiento(CONSUMO_SERVICIO, ORDEN_SERVICIO, ordenId, …)`.

---

## Devolución

- Permitida en `EN_REPARACION`, `ESPERA_REPUESTO`, `LISTO`, `ENTREGADO`.
- Cantidad ≤ consumida − devuelta.
- Movimiento `DEVOLUCION_SERVICIO` con costo histórico de la línea.
- **No** usa AJUSTE_ENTRADA.

---

## Costeo histórico

| Caso | Resultado |
|------|-----------|
| costoActual conocido | Snapshot en línea + movimiento |
| costoActual null | null; nunca 0 |
| Cambio posterior de costoActual | No altera la línea |

---

## Inventario

```
OrdenServicioRepuestoService → InventarioService → MovimientoInventario + stock
```

Único dueño del stock: InventarioService.

---

## Movimientos

| Tipo | Dirección |
|------|-----------|
| CONSUMO_SERVICIO | SALIDA |
| DEVOLUCION_SERVICIO | ENTRADA |

`ReferenciaMovimiento.ORDEN_SERVICIO` + `referenciaId = ordenServicio.id`.

---

## Trazabilidad

Consulta por `referenciaTipo=ORDEN_SERVICIO` y `referenciaId` de la OT.  
Observaciones incluyen número OT y id de línea.

---

## Workflow (3.15.5.1)

- `EN_REPARACION → ESPERA_REPUESTO` exige al menos una línea no anulada con cantidad pendiente.
- Mensaje: «No existen repuestos pendientes que justifiquen poner la orden en espera.»
- Cancelar OT bloqueado si consumo neto > 0.
- Mensaje: «No se puede cancelar la orden porque existen repuestos consumidos pendientes de devolución.»
- Planificar / consumir / devolver **no** escriben historial de estado.

---

## Validaciones

- Cantidades no negativas; neta ≤ planificada; devuelta ≤ consumida.
- No operar líneas anuladas / OT CERRADA o CANCELADA.
- LISTO/ENTREGADO: no planificar ni consumir; sí devolver.
- Producto inactivo: visible en historial; no nueva planificación.

---

## Transaccionalidad

`consumir` y `devolver` son `@Transactional`: línea + movimiento + stock en una sola unidad; fallo ⇒ rollback.

---

## Seguridad

`@PreAuthorize("hasRole('ADMIN')")` en `OrdenServicioController`. Sin cambios a SecurityConfig.

---

## Migración

`V7__orden_servicio_repuestos.sql` (ya aplicada en fases previas):

- Amplía CHECKs de tipo/referencia de movimientos.
- Crea `orden_servicio_repuestos` con FKs e índices.

**No se creó V9:** el schema de repuestos ya existía. Esta iteración endureció reglas de negocio y completó frontend.

---

## Tests

`OrdenServicioRepuestoServiceTest` + limpieza en `ComercialTestSupport`.

Cobertura: planificación, consumo solo en reparación, edición vs neta, anulación, consumo parcial/total, reconsumo tras devolución, stock, costo null/congelado, ESPERA_REPUESTO con pendiente, cancelación, producto inactivo, pertenencia a OT.

---

## Limitaciones

- Sin reservas de stock.
- Sin cobro/Venta automática.
- Sin idempotency-key en consumir.
- Costo único por línea (no promedio por lote).

---

## Frontend

Completado en `docs/frontend/FASE_3_15_6_REPUESTOS_SERVICIOS.md`.

---

## Pendientes futuros

- Cobro OT / vínculo Venta sin doble stock
- Mano de obra
- Analytics de CONSUMO_SERVICIO / DEVOLUCION_SERVICIO
- Locking optimista de Producto (transversal)
