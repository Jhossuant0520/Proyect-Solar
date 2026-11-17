# SOLVIX — FASE 3.15.5 Diseño de Repuestos en Órdenes de Servicio

**Tipo:** DISEÑO TÉCNICO → **implementado en backend FASE 3.15.6** (`FASE_3_15_6_REPUESTOS_INVENTARIO.md`)  
**Base:** Auditoría `FASE_3_15_4_AUDITORIA_REPUESTOS_INVENTARIO.md` + código real V1–V6  

| Etiqueta | Significado |
|----------|-------------|
| **IMPLEMENTADO** | Existe en código (incl. 3.15.6) |
| **PROPUESTO** | Diseño aún no codificado |
| **PENDIENTE** | Fuera de alcance (frontend, venta/cobro, analytics, reservas) |

---

## Objetivo

Permitir que una `OrdenServicio` use **Productos** como repuestos con esta regla oficial:

| Acción | ¿Modifica inventario? |
|--------|------------------------|
| Planificar / editar / quitar planificado | **No** |
| Confirmar consumo | **Sí** → `CONSUMO_SERVICIO` vía `InventarioService` |
| Devolver consumido | **Sí** → `DEVOLUCION_SERVICIO` vía `InventarioService` |

```
OrdenServicio
  → Repuesto planificado          (sin stock)
  → Confirmar consumo             (salida)
  → InventarioService.registrarMovimiento
  → MovimientoInventario CONSUMO_SERVICIO
       referenciaTipo = ORDEN_SERVICIO
       referenciaId   = idOrdenServicio
```

**No** implementar frontend, Venta/cobro ni analytics en esta fase de diseño.

---

## Qué se reutiliza vs qué se amplía

### Reutilizar (**IMPLEMENTADO**)

| Pieza | Uso |
|-------|-----|
| `InventarioService.registrarMovimiento` | Único mutador de stock |
| `Producto` | Identidad del repuesto (sigue siendo producto comercial) |
| `OrdenServicio` + estados/transiciones | Contenedor; no duplicar máquina de estados |
| Patrón Venta: planificar ≠ completar | Modelo mental de consumo |
| Patrón Devolución venta: costo congelado en línea | Costo histórico del repuesto |
| Snapshot `productoNombre` en `DetalleVenta` | Misma idea en línea de repuesto |
| Nested API `ventas/{id}/devoluciones` | Estilo de rutas bajo la OT |
| Index `idx_movimientos_referencia` | Consultar movimientos por OT |

### Ampliar (**IMPLEMENTADO** en 3.15.6)

| Pieza | Cambio |
|-------|--------|
| `TipoMovimientoInventario` | + `CONSUMO_SERVICIO`, `DEVOLUCION_SERVICIO` |
| `ReferenciaMovimiento` | + `ORDEN_SERVICIO` |
| CHECK SQL tipo/referencia | Migración V7 |
| Nueva entidad/tabla | `orden_servicio_repuestos` |
| Nuevo servicio | `OrdenServicioRepuestoService` |
| Endpoints | Bajo `/api/v1/ordenes-servicio/{id}/repuestos` |
| DTOs | Request/response + bodies consumir/devolver |

### No tocar semántica (**PROPUESTO** de no-cambio)

- No alterar cálculo de `PoliticaCosteoInventario` / `UltimoCostoPolitica` (siguen siendo de compras).
- No hacer que OT escriba en `MovimientoInventarioRepository` directamente.
- No convertir consumo en `VENTA`.
- No introducir reservas.

---

## Modelo

### Entidad **IMPLEMENTADA (3.15.6):** `OrdenServicioRepuesto`

Tabla: `orden_servicio_repuestos`

Relación:

```
OrdenServicio (1) ──< (N) OrdenServicioRepuesto >── (1) Producto
```

Producto **no** se convierte en Servicio. La OT **no** es un Producto.

### Campos mínimos necesarios

| Campo | Tipo | Oblig. | Notas |
|-------|------|--------|-------|
| `id` | Long | sí | PK |
| `ordenServicio` | FK | sí | OT dueña |
| `producto` | FK | sí | Producto comercial |
| `productoNombre` | String(150) | sí | Snapshot al crear (reporte estable si renombran) |
| `cantidadPlanificada` | int | sí | ≥ 1 |
| `cantidadConsumida` | int | sí | default 0; acumulado de salidas |
| `cantidadDevuelta` | int | sí | default 0; acumulado de entradas |
| `costoUnitario` | Decimal(14,2) | no | Snapshot; null = desconocido |
| `costoConocido` | boolean | sí | default false; espejo Venta |
| `anulado` | boolean | sí | default false; anulación lógica |
| `fechaRegistro` | datetime | sí | Alta de la línea |
| `fechaUltimoConsumo` | datetime | no | Útil para auditoría; opcional pero barato |
| `fechaUltimaDevolucion` | datetime | no | Idem |

### Campos que **no** se crean en MVP

| Campo tentador | Por qué no |
|----------------|------------|
| `movimientoId` único | Un consumo parcial ⇒ varios movimientos; consultar por `referenciaTipo+referenciaId` |
| `precioVenta` / cobro | Fase cobro **PENDIENTE** |
| `tecnicoId` | Fuera de alcance |
| `reservado` / stock comprometido | Sin reservas |
| Enum persistido redundante si se puede derivar | Ver § Estado de línea |

### Cantidad neta (**PROPUESTO**)

```
cantidadNetaConsumida = cantidadConsumida - cantidadDevuelta
```

Siempre: `0 ≤ cantidadDevuelta ≤ cantidadConsumida ≤ cantidadPlanificada`.

Ejemplo pedido:

| Momento | planificada | consumida | devuelta | neta |
|---------|-------------|-----------|----------|------|
| Plan | 3 | 0 | 0 | 0 |
| Tras consumir 2 | 3 | 2 | 0 | 2 |
| Tras devolver 1 | 3 | 2 | 1 | 1 |

**Una sola línea** soporta consumo parcial; no se crea una fila por cada unidad.

---

## Línea de repuesto — estado

### Enum de respuesta **PROPUESTO:** `EstadoRepuestoOrdenServicio`

Persistir **cantidades + `anulado`**; el estado expuesto al API se **deriva** (menos drift).

| Estado | Condición | Significado |
|--------|-----------|-------------|
| `ANULADO` | `anulado == true` | Línea cancelada; no consumible |
| `PLANIFICADO` | no anulado ∧ `cantidadConsumida == 0` | Solo plan; sin inventario |
| `PARCIAL` | no anulado ∧ `0 < cantidadNeta < cantidadPlanificada` | Consumo incompleto (o devolución parcial tras consumo) |
| `CONSUMIDO` | no anulado ∧ `cantidadNeta == cantidadPlanificada` | Todo el plan está consumido neto |
| `DEVUELTO` | no anulado ∧ `cantidadConsumida > 0` ∧ `cantidadNeta == 0` | Todo lo consumido volvió a stock |

No se usan nombres “porque sí”: estos cinco cubren planificación, parcial, total, devolución total y baja lógica.

---

## Planificación

**PROPUESTO — regla oficial:** planificar **no** llama a `InventarioService` ni cambia `stockActual`.

### Alta

- Producto debe existir, `activo == true` (misma regla que **IMPLEMENTADO** en `VentaService` al armar líneas).
- `cantidadPlanificada ≥ 1`.
- OT no terminal (`CERRADO` / `CANCELADO`).
- Stock cero **sí permite** planificar (encaja con `ESPERA_REPUESTO`).

### Edición de planificado

Permitida solo si `cantidadConsumida == 0` y no anulado:

- Cambiar `cantidadPlanificada` (≥ 1).
- **No** cambiar `productoId` en PUT (evitar historial confuso); si se equivocaron de producto: anular/eliminar y crear otra línea.

Si ya hubo consumo: no bajar `cantidadPlanificada` por debajo de `cantidadConsumida`.

### Eliminación / anulación

| Situación | Acción |
|-----------|--------|
| `cantidadConsumida == 0` | DELETE físico o soft `anulado=true` (recomendado: **DELETE** simple o anulado; ver API) |
| `cantidadConsumida > 0` | **No** borrar. Anular solo si `cantidadNeta == 0` (todo devuelto). Si neta > 0: devolver primero. |

Recomendación API:

- `DELETE` solo si `cantidadConsumida == 0` → elimina fila (o marca anulado).
- Si hubo movimientos: conservar fila; usar `devolver` + eventual anulado cuando neta=0.

---

## Consumo

**PROPUESTO — regla oficial:** solo `consumir` modifica inventario.

```
POST .../repuestos/{repuestoId}/consumir
body: { "cantidad": n }

1. Validar OT y línea
2. n ≥ 1
3. cantidadConsumida + n ≤ cantidadPlanificada
4. costoSnapshot = producto.costoActual   // puede null
5. Si costoUnitario de línea aún null y es el primer consumo:
     línea.costoUnitario = costoSnapshot
     línea.costoConocido = (costoSnapshot != null)
   Si ya hay costoUnitario congelado:
     reutilizar ese valor en el movimiento (no re-leer para “reconstruir historia”)
6. InventarioService.registrarMovimiento(
     producto,
     CONSUMO_SERVICIO,
     n,
     ORDEN_SERVICIO,
     orden.id,
     línea.costoUnitario,   // el congelado / snapshot
     usuario,
     "Consumo OT " + orden.numero + " repuesto #" + línea.id
   )
7. cantidadConsumida += n
8. fechaUltimoConsumo = now
```

### Primer consumo vs consumos siguientes (costo)

- **Primer** consumo de la línea: congela `Producto.costoActual` (o null).
- **Consumos posteriores** de la misma línea: usan el **mismo** `costoUnitario` ya congelado.  
  Motivo: una línea = un costo histórico; no promedio ponderado en MVP.  
  Si el negocio necesitara costos distintos por lote, serían **varias líneas** (mismo producto, dos planificaciones).

### Anti doble confirmación

- No hay endpoint “consumir todo” implícito sin cantidad.
- Cada request declara `cantidad`.
- Tope duro: `cantidadConsumida + n ≤ cantidadPlanificada`.
- Transacción única: movimiento + update línea; si stock falla, rollback (como venta).

No se requiere token de idempotencia en MVP; reintentos con la misma cantidad pueden sobrepasar el tope y fallar de forma segura.

---

## Devolución

**PROPUESTO**

```
POST .../repuestos/{repuestoId}/devolver
body: { "cantidad": n }

1. n ≥ 1
2. cantidadDevuelta + n ≤ cantidadConsumida
3. InventarioService.registrarMovimiento(
     producto,
     DEVOLUCION_SERVICIO,   // ENTRADA
     n,
     ORDEN_SERVICIO,
     orden.id,
     línea.costoUnitario,   // histórico congelado, nunca costoActual vigente
     usuario,
     "Devolución OT " + orden.numero + " repuesto #" + línea.id
   )
4. cantidadDevuelta += n
```

**Prohibido** usar `AJUSTE_ENTRADA` para esto.

Ejemplo: plan 2, consumido 2, devuelto 1 → neta 1.

---

## Costeo histórico

| Regla | Detalle |
|-------|---------|
| Momento | Al **primer** consumo de la línea |
| Fuente | `Producto.costoActual` en ese instante |
| null | Se conserva null; **nunca** 0 |
| Después | No se reconstruye con `costoActual` futuro |
| Movimiento | `costoUnitario` = valor congelado de la línea; `costoProductoResultante` = `producto.getCostoActual()` al registrar (**IMPLEMENTADO** en InventarioService) |
| Política ULTIMO_COSTO | **No** se aplica en consumo (solo compras **IMPLEMENTADO**) |

Productos con costo desconocido: **sí se pueden consumir** (igual que completar venta con costo null). Impacto:

- Stock sí baja.
- Costo del servicio incompleto hasta que haya costo conocido.
- Analytics futuros deben excluir null (patrón ya **IMPLEMENTADO**).

---

## Inventario

```
OrdenServicioRepuestoService
  → InventarioService.registrarMovimiento(...)
  → MovimientoInventario + Producto.stockActual
```

**Prohibido:** `ordenServicioService` / repuesto service restando `stockActual` a mano o guardando movimientos por repositorio propio.

---

## Movimientos

### Ampliar enums (**PROPUESTO**)

`TipoMovimientoInventario`:

| Valor | Dirección |
|-------|-----------|
| `CONSUMO_SERVICIO` | SALIDA |
| `DEVOLUCION_SERVICIO` | ENTRADA |

`ReferenciaMovimiento`:

| Valor |
|-------|
| `ORDEN_SERVICIO` |

Campos del movimiento: los **IMPLEMENTADOS** bastan (producto, cantidad, stocks, costos, referencia, usuario, fecha, observaciones). No duplicar libro en otra tabla.

---

## Referencia de OT

**PROPUESTO (contrato de trazabilidad):**

```
referenciaTipo = ORDEN_SERVICIO
referenciaId   = ordenServicio.id
```

Consulta: `MovimientoInventarioRepository.findByReferenciaTipoAndReferenciaId(ORDEN_SERVICIO, ordenId)` (**IMPLEMENTADO** el método genérico).

Detalle fino producto/línea: `observaciones` incluyen `repuesto #id` + número OT; opcional índice futuro por línea **PENDIENTE** si hace falta reporting fino.

No usar texto libre como **única** relación (la FK lógica es `referenciaTipo`+`referenciaId`).

---

## Estados de la Orden (permisos de operación)

Respetar transiciones **IMPLEMENTADAS**. Reglas de repuesto (**PROPUESTO**) encima:

| Estado OT | Agregar / editar plan | Eliminar plan (sin consumo) | Consumir | Devolver |
|-----------|----------------------|-----------------------------|----------|----------|
| RECEPCIONADO | Sí | Sí | Sí* | Sí |
| EN_DIAGNOSTICO | Sí | Sí | Sí* | Sí |
| COTIZADO | Sí | Sí | Sí* | Sí |
| APROBADO | Sí | Sí | Sí | Sí |
| EN_REPARACION | Sí | Sí | **Sí (principal)** | Sí |
| ESPERA_REPUESTO | Sí | Sí | Sí (cuando haya stock) | Sí |
| LISTO | Solo lectura plan; no agregar† | No | No† | Sí (corrección) |
| ENTREGADO | No | No | No | Sí (corrección excepcional) |
| CERRADO | **No** | **No** | **No** | **No** |
| CANCELADO | **No** | **No** | **No** | **No** |

\* Consumir temprano permitido por backend (stock manda); la UX puede desincentivarlo.  
† LISTO: **PROPUESTO** estricto — no nuevos planes ni consumos; solo devoluciones correctivas. Si se prefiere permitir remates en LISTO, documentar excepción en implementación; default = bloqueado.

### Cancelación OT → `CANCELADO`

| Caso | Regla **PROPUESTA** |
|------|---------------------|
| A — Solo planificado (`cantidadConsumida == 0`) | Permitir cancelar OT. Líneas → anular o dejar; **sin** movimiento. |
| B — Parcialmente consumido (`neta > 0`) | **Rechazar** `CANCELADO` hasta `cantidadNeta == 0` en todas las líneas (devolver primero). Mensaje claro. |
| C — Totalmente consumido y luego se quiere cancelar | Igual: devolver neta a 0 o no cancelar. **No borrar** movimientos históricos. |

No auto-revertir inventario al cambiar estado (evita magia; obliga devolución explícita).

---

## Validaciones (checklist)

| # | Regla |
|---|--------|
| 1 | `cantidadConsumida ≤ cantidadPlanificada` |
| 2 | `cantidadDevuelta ≤ cantidadConsumida` |
| 3 | No operar línea `anulado` |
| 4 | No operar OT `CERRADO`/`CANCELADO` (excepto lecturas) |
| 5 | Consumir: `n ≤ planificada - consumida` |
| 6 | Devolver: `n ≤ consumida - devuelta` |
| 7 | Producto activo al **planificar** |
| 8 | Producto inactivo: histórico visible; no nueva planificación |
| 9 | Stock: solo validado en `InventarioService` al consumir |
| 10 | Planificar con stock 0: permitido |
| 11 | No cambiar producto de una línea existente |
| 12 | DELETE solo sin consumo |

---

## Concurrencia

Dos OT consumen el mismo producto:

- Ambas llaman `registrarMovimiento`.
- Quien deje `stockNuevo < 0` falla con el mensaje **IMPLEMENTADO** de stock insuficiente.
- **No** segundo control en la OT.
- Limitación conocida: sin `@Version` en Producto (**IMPLEMENTADO**); mejora transversal **PENDIENTE**.

---

## Cancelación (resumen operativo)

Ya cubierto en § Estados. Inventario **nunca** se reescribe; solo nuevas filas `DEVOLUCION_SERVICIO`.

---

## API propuesta

Convención: nested bajo la OT (como `ventas/{id}/devoluciones`).  
Permiso: `ADMIN` (igual que OT actual).

Base: `/api/v1/ordenes-servicio/{ordenId}/repuestos`

| Método | Ruta | Body | Efecto inventario |
|--------|------|------|-------------------|
| GET | `/` | — | No |
| POST | `/` | alta planificada | No |
| PUT | `/{repuestoId}` | editar planificada | No |
| DELETE | `/{repuestoId}` | — | No (solo sin consumo) |
| POST | `/{repuestoId}/consumir` | `{ "cantidad": n }` | **Sí** CONSUMO_SERVICIO |
| POST | `/{repuestoId}/devolver` | `{ "cantidad": n }` | **Sí** DEVOLUCION_SERVICIO |

Listado de movimientos de una OT (opcional MVP+):

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/api/v1/inventario/movimientos?referenciaTipo=ORDEN_SERVICIO&referenciaId={id}` | Si el listado actual ya filtra por referencia (**verificar en implementación**); si no, ampliar query **PROPUESTO** menor |

No crear `/api/v1/repuestos` suelto en MVP.

---

## DTOs

### `RepuestoOrdenServicioRequestDTO` (POST/PUT)

| Campo | POST | PUT |
|-------|------|-----|
| `productoId` | obligatorio | no (ignorado / rechazado si viene distinto) |
| `cantidadPlanificada` | obligatorio ≥ 1 | obligatorio ≥ 1 (y ≥ consumida) |

### `ConsumirRepuestoRequestDTO`

| Campo | Regla |
|-------|--------|
| `cantidad` | `@NotNull` `@Min(1)` |

### `DevolverRepuestoRequestDTO`

| Campo | Regla |
|-------|--------|
| `cantidad` | `@NotNull` `@Min(1)` |

### `RepuestoOrdenServicioResponseDTO`

| Campo | Origen |
|-------|--------|
| `id` | línea |
| `ordenServicioId` | FK |
| `productoId` | FK |
| `productoNombre` | snapshot |
| `cantidadPlanificada` | |
| `cantidadConsumida` | |
| `cantidadDevuelta` | |
| `cantidadNeta` | calculada |
| `costoUnitario` | histórico (nullable) |
| `costoConocido` | |
| `estado` | derivado |
| `anulado` | |
| `fechaRegistro` | |
| `fechaUltimoConsumo` | |
| `fechaUltimaDevolucion` | |
| `puedeEditar` | booleans de acción para UI futura |
| `puedeEliminar` | |
| `puedeConsumir` | |
| `puedeDevolver` | |

Sin precios de cobro. Sin stock actual obligatorio (UI puede consultar producto aparte); opcional `stockDisponible` **PENDIENTE**/nice-to-have.

---

## Migración

**PROPUESTO:** `V7__orden_servicio_repuestos.sql` (nombre final al implementar).

Contenido conceptual:

1. Ampliar `chk_movimientos_tipo` con `CONSUMO_SERVICIO`, `DEVOLUCION_SERVICIO`.
2. Ampliar `chk_movimientos_referencia` con `ORDEN_SERVICIO`.
3. `CREATE TABLE orden_servicio_repuestos` (+ FKs a `ordenes_servicio`, `productos`, CHECKs de cantidades).
4. Índices: `(orden_servicio_id)`, `(producto_id)`.

**No ejecutar** hasta la fase de implementación de código.

Java en paralelo:

- Enums `TipoMovimientoInventario`, `ReferenciaMovimiento`
- Entidad + repo + service + controller + DTOs
- Tests listados abajo

---

## Tests (diseño de casos)

| # | Caso |
|---|------|
| 1 | Crear línea planificada sin movimiento |
| 2 | Editar cantidad planificada (sin consumo) |
| 3 | Eliminar línea sin consumo |
| 4 | Consumir parcial (plan 3 → cons 2) |
| 5 | Consumir completo |
| 6 | Rechazar sobreconsumo |
| 7 | Congelar costo histórico no null |
| 8 | Costo desconocido permanece null |
| 9 | Movimiento tipo `CONSUMO_SERVICIO` |
| 10 | `referenciaTipo=ORDEN_SERVICIO`, `referenciaId=orden.id` |
| 11 | Stock insuficiente → BusinessException Inventario |
| 12 | Devolución parcial |
| 13 | Devolución completa (neta 0 → estado DEVUELTO) |
| 14 | Rechazar devolver de más |
| 15 | Rechazar consumir línea anulada |
| 16 | Rechazar consumir/planificar en OT CERRADA/CANCELADA |
| 17 | Segundo consumo que excede resto → error (anti doble exceso) |
| 18 | Producto desactivado: línea histórica legible; nueva planifica rechazada |
| 19 | Cancelar OT con neta>0 → rechazado |
| 20 | Cancelar OT solo planificada → ok sin movimientos |
| 21 | Planificar con stock 0 → ok; consumir → falla stock |

---

## Analytics

**PENDIENTE** implementar. Quedará disponible vía movimientos + líneas:

- Costo de repuestos por OT (`sum(cantidadNeta * costoUnitario)` solo si `costoConocido`)
- Unidades consumidas / devueltas por producto
- Series `CONSUMO_SERVICIO` / `DEVOLUCION_SERVICIO` en libro

---

## Venta / cobro

**PENDIENTE.** El modelo ya conserva:

- producto, cantidades netas, costo histórico, OT

para una fase futura:

```
Repuestos consumidos + mano de obra → Cobro / Venta vinculada
```

sin volver a descontar stock.

---

## Pendientes (fuera de implementación inmediata de este diseño)

| Ítem | Estado |
|------|--------|
| Código backend + V7 | Siguiente paso tras aprobar este doc |
| Frontend sección Repuestos | **PENDIENTE** |
| Integración Venta/cobro | **PENDIENTE** |
| Mano de obra | **PENDIENTE** |
| Reservas de stock | **PENDIENTE** |
| Locking `@Version` en Producto | **PENDIENTE** transversal |
| Idempotency-Key en consumir | **PENDIENTE** opcional |

---

## Reglas oficiales (cierre)

1. **Planificar ≠ consumir.**  
2. **Salida de inventario solo al confirmar consumo** (`CONSUMO_SERVICIO`).  
3. **Devolución solo con** `DEVOLUCION_SERVICIO` vía `InventarioService`.  
4. **Costo histórico** = snapshot en el primer consumo de la línea; null permitido; nunca 0 inventado.  
5. **Trazabilidad** = `ORDEN_SERVICIO` + `id` de la OT.  
6. **No** saltarse `InventarioService`.  
7. **No** frontend ni Venta en la implementación que siga a este diseño, salvo que se abra una fase explícita.

Este documento es la especificación lista para implementar sin ambigüedades de dominio.
