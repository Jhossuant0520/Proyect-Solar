# SOLVIX — FASE 3.15.4 Auditoría: Repuestos + Inventario en Órdenes de Servicio

**Tipo:** AUDITORÍA Y DISEÑO (sin implementación)  
**Fecha de referencia:** código backend actual (Inventario V1–V4, OrdenServicio V6, Frontend 3.15.2–3.15.3)  
**Restricción:** No se modificó código, entidades, tablas, endpoints, InventarioService, Venta, OrdenServicio ni frontend.

Leyenda de estados en este documento:

| Etiqueta | Significado |
|----------|-------------|
| **IMPLEMENTADO** | Existe hoy en código/DB y se comporta así |
| **PROPUESTO** | Decisión de diseño recomendada; aún no existe |
| **PENDIENTE** | Trabajo futuro explícitamente fuera de alcance ahora |

---

## Preguntas rectoras (respuesta corta)

### ¿Cuándo un repuesto se convierte realmente en una salida de inventario?

**PROPUESTO (recomendación):** solo al **confirmar consumo** del repuesto (uso real en la reparación), no al agregarlo como planificado a la OT.

Patrón análogo al **IMPLEMENTADO** en Ventas:

| Venta (IMPLEMENTADO) | OT + Repuesto (PROPUESTO) |
|----------------------|---------------------------|
| Líneas en `PENDIENTE` sin movimiento | Línea `PLANIFICADO` sin movimiento |
| `completar` → salida `VENTA` | `consumir` → salida de consumo de servicio |
| `cancelar` PENDIENTE sin tocar stock | anular planificado sin tocar stock |
| Completada → reversión vía `DEVOLUCION_VENTA` | Consumido → reversión vía entrada de devolución de servicio |

### ¿Cómo se mantiene la trazabilidad OT → Repuesto → Producto → MovimientoInventario?

**PROPUESTO:**

```
OrdenServicio
  └─ OrdenServicioRepuesto (línea) ──► Producto
           │
           └─ al consumir ──► InventarioService.registrarMovimiento
                  tipo = CONSUMO_SERVICIO (nuevo)
                  referenciaTipo = ORDEN_SERVICIO (nuevo)
                  referenciaId = id de la OrdenServicio (o de la línea; ver § Trazabilidad)
                  costoUnitario = Producto.costoActual al momento del consumo (puede ser null)
```

Hoy **IMPLEMENTADO:** no hay vínculo OT↔inventario. `ReferenciaMovimiento` no incluye `ORDEN_SERVICIO`.

---

## Estado actual de Inventario

**IMPLEMENTADO**

- Único mutador de stock: `InventarioService.registrarMovimiento(...)`.
- No existen métodos separados `registrarSalida` / `registrarEntrada` / `registrarDevolucion`.
- Dirección fija por `TipoMovimientoInventario` → `DireccionMovimiento` (ENTRADA/SALIDA).
- Controles de stock negativo: chequeo en servicio + `CHECK` DB en `movimientos_inventario`.
- **No** hay reservas de inventario.
- **No** hay `@Version` ni `SELECT FOR UPDATE` sobre `Producto.stockActual`.
- Órdenes de servicio **no** llaman a InventarioService (V6: OT independiente de Producto/Inventario/Venta).

Tipos de movimiento **IMPLEMENTADOS**:

| Tipo | Dirección |
|------|-----------|
| COMPRA | ENTRADA |
| VENTA | SALIDA |
| DEVOLUCION_VENTA | ENTRADA |
| DEVOLUCION_COMPRA | SALIDA |
| AJUSTE_ENTRADA | ENTRADA |
| AJUSTE_SALIDA | SALIDA |
| MERMA | SALIDA |
| CARGA_INICIAL | ENTRADA |

Referencias **IMPLEMENTADAS** (`ReferenciaMovimiento`):

`VENTA` | `COMPRA` | `DEVOLUCION_VENTA` | `DEVOLUCION_COMPRA` | `AJUSTE_MANUAL` | `CARGA_INICIAL`

`ORDEN_SERVICIO` en movimientos: **no existe** (sí existe como `TipoSecuencia` para numeración OS-yyyy-######).

---

## Estado actual de Producto

**IMPLEMENTADO** — un Producto usado como repuesto **sigue siendo Producto comercial**. No se convierte en “Servicio”.

Campos relevantes para repuestos:

| Campo | Notas |
|-------|--------|
| `id` | PK |
| `nombre` | Visible |
| `codigoBarras` | Lookup |
| `costoActual` | `BigDecimal` **nullable** = costo desconocido (`tieneCostoConocido()`) |
| `stockActual` | Solo debe mutarse vía InventarioService |
| `activo` | Soft availability |
| categoría / precios | Comerciales; el cobro de OT es **PENDIENTE** |

Regla de dominio (confirmada por arquitectura actual y por esta auditoría):

> Una Orden de Servicio **NO** es un Producto.  
> Un repuesto **SÍ** puede ser un Producto.  
> El Producto conserva identidad de inventario.

---

## Estado actual de MovimientoInventario

**IMPLEMENTADO** — libro de inventario (tabla `movimientos_inventario`).

| Campo | Obligatorio | Rol |
|-------|-------------|-----|
| `producto` | Sí | Qué se movió |
| `tipo` | Sí | Clasificación + dirección |
| `direccion` | Sí | ENTRADA/SALIDA (derivada del tipo) |
| `cantidad` | Sí (> 0) | Unidades |
| `stockAnterior` | Sí | Snapshot |
| `stockNuevo` | Sí | Snapshot |
| `costoUnitario` | No | Costo aplicado en **esta** operación (puede null) |
| `costoProductoResultante` | No | Snapshot de `Producto.costoActual` al registrar (V4) |
| `fecha` | Sí | Cuándo |
| `referenciaTipo` | Sí | Documento origen (`ReferenciaMovimiento`) |
| `referenciaId` | No | Id del documento (null en ajustes manuales) |
| `usuarioRegistro` | No | Quién |
| `observaciones` | No | Texto |

---

## Cómo se realizan actualmente las salidas

**IMPLEMENTADO** — flujo común:

1. Caller valida su documento de negocio.
2. Caller decide `costoUnitario` (o pasa `null`).
3. `registrarMovimiento` calcula stock, rechaza si `stockNuevo < 0`, persiste producto + movimiento.

### Salida por venta (patrón más relevante)

**IMPLEMENTADO** en `VentaService.completar`:

```
costoAplicado = producto.getCostoActual()   // puede ser null
detalle.costoUnitario = costoAplicado
detalle.costoConocido = (costoAplicado != null)
registrarMovimiento(
  tipo=VENTA,
  referenciaTipo=VENTA,
  referenciaId=venta.id,
  costoUnitario=costoAplicado,
  ...)
```

- Crear venta `PENDIENTE`: **no** mueve stock.
- Cancelar venta `PENDIENTE`: **no** mueve stock.
- Completar: congela costo en la línea y sale inventario.
- Reversión: `DevolucionVentaService` → `DEVOLUCION_VENTA` (entrada) usando el **costo congelado de la línea de venta**, no el `costoActual` vigente.

### Otras salidas

| Origen | Tipo | `costoUnitario` |
|--------|------|-----------------|
| Completar compra (es entrada) | COMPRA | del detalle compra; política ULTIMO_COSTO actualiza `costoActual` **antes** |
| Devolución compra | DEVOLUCION_COMPRA | costo histórico del detalle compra |
| Ajuste / merma | AJUSTE_SALIDA / MERMA | `null` |
| Carga inicial | CARGA_INICIAL | `producto.costoActual` |

`PoliticaCosteoInventario` / `UltimoCostoPolitica`: **IMPLEMENTADO** solo para actualizar `costoActual` en **compras**. **No** se invoca en salidas.

---

## Alternativas de consumo

### Alternativa A — Descontar al agregar a la OT

| Aspecto | Análisis |
|---------|----------|
| Trazabilidad | Posible si se crea movimiento al instante |
| Stock negativo | Protegido al consumir; pero planificación agresiva |
| Cancelación cliente | Requiere reversión inmediata o stock “huérfano” |
| Cliente rechaza | Mismo problema |
| Reemplazo de repuesto | Salida + entrada o doble movimiento |
| Devolución | Necesaria casi siempre al corregir |
| Concurrencia | Igual que hoy (sin lock de filas) |
| Complejidad | Baja al inicio, alta en cancelaciones |
| Encaje SOLVIX | **Malo**: rompe el patrón Venta (planificar ≠ consumir) y choca con `ESPERA_REPUESTO` |

### Alternativa B — Planificar sin stock; consumir al confirmar uso

| Aspecto | Análisis |
|---------|----------|
| Trazabilidad | Línea OT + movimiento solo en consumo |
| Stock negativo | Validado solo al consumir (como completar venta) |
| Cancelación | Planificado: borrar/anular línea sin inventario |
| Cliente rechaza | Si aún planificado: sin impacto stock |
| Reemplazo | Cambiar línea planificada libremente |
| Devolución | Solo si ya estaba `CONSUMIDO` |
| Concurrencia | Misma protección que ventas |
| Complejidad | Media (estados de línea) |
| Encaje SOLVIX | **Bueno**: espejo de Venta PENDIENTE→COMPLETADA; encaja con `ESPERA_REPUESTO` |

### Alternativa C — Reservar stock

| Aspecto | Análisis |
|---------|----------|
| Trazabilidad | Requiere modelo de reserva + liberación |
| Stock negativo | Evita over-promise, pero inventa stock “comprometido” |
| Cancelación | Liberar reserva |
| Complejidad | Alta |
| Encaje SOLVIX | **Malo hoy**: **no existe** reserva en InventarioService ni docs; duplicaría control de stock |

---

## Recomendación

**PROPUESTO — adoptar Alternativa B (planificar → consumir).**

Razones alineadas a arquitectura actual:

1. Replica el contrato mental ya **IMPLEMENTADO** en Ventas.
2. Respeta `ESPERA_REPUESTO` sin fingir consumo.
3. Cancelar OT o cambiar repuesto planificado no inventa reversas.
4. Un solo punto de verdad de stock: `InventarioService.registrarMovimiento`.
5. Evita construir un sistema de reservas (**PENDIENTE**/no necesario en MVP).

**Decisión explícita:**  
> El repuesto **no** es salida de inventario al listarlo en la OT.  
> Es salida solo cuando ADMIN confirma **consumo**.

---

## Estados de OT involucrados

Máquina de estados **IMPLEMENTADA** (sin cambios propuestos aquí):

| Estado OT | Agregar planificado | Quitar/anular planificado | Confirmar consumo | Notas |
|-----------|---------------------|---------------------------|-------------------|--------|
| RECEPCIONADO | PROPUESTO: opcional / raro | Sí | Desaconsejado UX | Aún no hay diagnóstico |
| EN_DIAGNOSTICO | PROPUESTO: sí (cotizar necesidades) | Sí | Raro | |
| COTIZADO | PROPUESTO: sí | Sí | No típico | Cotización aún sin montos de cobro |
| APROBADO | PROPUESTO: sí | Sí | Posible | Cliente aceptó |
| EN_REPARACION | PROPUESTO: sí | Sí si no consumido | **Principal** | Consumo real |
| ESPERA_REPUESTO | PROPUESTO: sí (planificar faltantes) | Sí | Al llegar el repuesto | Estado ya existe sin inventario |
| LISTO | PROPUESTO: solo lectura de consumidos; planificados pendientes a resolver | Limitado | Excepcional | |
| ENTREGADO | PROPUESTO: no agregar; reversión excepcional | No | No | |
| CERRADO | **Prohibido** modificar | — | — | Terminal |
| CANCELADO | **Prohibido** modificar; ver cancelación | — | — | Terminal |

Estas reglas de “cuándo agregar/consumir” son **PROPUESTAS de producto/UX+servicio OT**.  
La máquina de estados de la OT **IMPLEMENTADA** no se duplica ni se reescribe: solo se relacionan operaciones de repuesto con ella.

---

## Cancelaciones

Escenarios:

| Caso | Situación | Comportamiento PROPUESTO |
|------|-----------|---------------------------|
| A | Repuesto **no** consumido (planificado) | Anular/eliminar línea. **Sin** movimiento. |
| B | Repuesto **ya** consumido | No “borrar en silencio”. Requiere **reversión de inventario** (entrada) + marcar línea. |
| C | “Reservado” | **N/A**: reservas no existen (**IMPLEMENTADO**: no hay). |
| D | Retirado físicamente del inventario | Equivale a consumido (ya hubo salida). Cancelar OT ⇒ reversión explícita o dejar costo absorbido según política de negocio futura. |

Si la OT pasa a `CANCELADO`:

- Líneas planificadas → anular (**PROPUESTO**).
- Líneas consumidas → deben revertirse o quedar documentadas como costo de servicio cancelado (**PENDIENTE** de regla de negocio fina; no improvisar en InventarioService).

No inventar reversas automáticas mágicas fuera de `registrarMovimiento`.

---

## Reversiones

**PROPUESTO** (espejo de devolución de venta):

```
Repuesto CONSUMIDO
  → operación “devolver a inventario” / “deshacer consumo”
  → InventarioService.registrarMovimiento(
       tipo = DEVOLUCION_SERVICIO (nuevo, ENTRADA),
       referenciaTipo = ORDEN_SERVICIO (o doc de devolución de repuesto),
       costoUnitario = costo congelado de la línea de repuesto
     )
  → línea pasa a DEVUELTO / cantidadDevuelta += n
```

**No** usar `AJUSTE_ENTRADA` como atajo habitual: ensucia analytics y pierde semántica.  
**No** mutar stock directo en Producto.

**IMPLEMENTADO** a reutilizar como patrón: `DevolucionVentaService` (entrada + costo histórico de línea).

---

## Trazabilidad

### Hoy

**IMPLEMENTADO:** `referenciaTipo` + `referenciaId` navegan Venta/Compra/Devoluciones/Ajuste/Carga.  
**IMPLEMENTADO:** no hay `ORDEN_SERVICIO` en `ReferenciaMovimiento` ni en CHECK SQL `chk_movimientos_referencia`.

### Propuesto

Ampliar enum + migración CHECK:

1. `ReferenciaMovimiento.ORDEN_SERVICIO`
2. Preferencia de `referenciaId`:
   - **Opción 1 (recomendada para MVP):** `referenciaId = ordenServicio.id` y la línea guarda `movimientoId` (o se busca por producto+OT+fecha).
   - **Opción 2 (más fuerte):** documento/línea `OrdenServicioRepuesto.id` como `referenciaId` con valor `ORDEN_SERVICIO_REPUESTO` — mejor para múltiples consumos del mismo producto.

También **PROPUESTO** nuevo `TipoMovimientoInventario`:

| Tipo | Dirección | Uso |
|------|-----------|-----|
| `CONSUMO_SERVICIO` | SALIDA | Consumo de repuesto |
| `DEVOLUCION_SERVICIO` | ENTRADA | Vuelta a stock desde OT |

**No** reutilizar `VENTA`/`DEVOLUCION_VENTA` para no mezclar cobro comercial con consumo interno de taller (y no forzar Venta prematura).

---

## Cantidades

**PROPUESTO** en línea de repuesto (entidad futura):

| Campo | Rol |
|-------|-----|
| `cantidadPlanificada` | Lo que se espera usar / cotizar |
| `cantidadConsumida` | Lo que ya salió de inventario |
| `cantidadDevuelta` | Lo que volvió (≤ consumida) |

MVP simplificado viable:

- Una línea = una intención.
- Estados de línea: `PLANIFICADO` | `CONSUMIDO` | `DEVUELTO` | `ANULADO`.
- Consumo parcial: o bien varias líneas, o `cantidadConsumida` ≤ `cantidadPlanificada`.

**PENDIENTE:** decidir si MVP permite consumo parcial en una sola línea o exige 1:1.

Diferenciar planificado vs consumido es **necesario** bajo Alternativa B.

---

## Reservas

**IMPLEMENTADO:** no hay reservas.

**PROPUESTO para MVP:** **no** implementar reservas.

Riesgo aceptado (igual que ventas concurrentes): dos OT pueden planificar más unidades de las disponibles; el **consumo** falla con “Stock insuficiente…”.

**PENDIENTE (futuro):** stock disponible = `stockActual - sum(planificado no consumido)` solo si el negocio lo exige. Es capa encima de InventarioService, no dentro de él al inicio.

---

## Concurrencia

**IMPLEMENTADO:**

- `@Transactional` en mutadores.
- Rechazo si `stockNuevo < 0`.
- CHECK DB de stocks ≥ 0.
- **Sin** locking optimista/pesimista sobre stock de producto.

**PROPUESTO:** no crear segunda lógica. El consumo de repuestos debe llamar al mismo `registrarMovimiento` y heredar la misma protección (y la misma limitación de carrera).

Mejora de locking de stock = **PENDIENTE** transversal (afectaría también ventas), no específica de OT.

---

## Costo histórico

Arquitectura V4 **IMPLEMENTADA**:

- `MovimientoInventario.costoUnitario` = costo de **esa** operación.
- `MovimientoInventario.costoProductoResultante` = `Producto.costoActual` al registrar.
- Ventas congelan `DetalleVenta.costoUnitario` / `costoConocido` al completar.
- Devoluciones usan el costo **congelado de la línea**, no el vigente.

**PROPUESTO para repuestos (alineado a Venta, no a PoliticaCosteo en salida):**

Al **consumir**:

```
costoLinea = producto.costoActual   // snapshot; puede ser null
línea.costoUnitario = costoLinea
línea.costoConocido = (costoLinea != null)
movimiento.costoUnitario = costoLinea
movimiento.costoProductoResultante = producto.costoActual
```

- **No** recalcular con `UltimoCostoPolitica` en el consumo (esa política es de compras).
- **No** usar un “costo histórico genérico” distinto del snapshot: el histórico **es** el valor congelado en la línea + el movimiento.
- Reversión posterior usa `línea.costoUnitario`, no el `costoActual` del día.

---

## Costos desconocidos

**IMPLEMENTADO:** `costoActual == null` significa desconocido; **nunca** se convierte en `0` en ventas/ajustes/analytics.

**PROPUESTO:**

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se puede consumir repuesto con costo null? | **Sí** (como se puede completar venta sin costo) |
| ¿Impacto inventario? | Stock sí baja; `costoUnitario` y `costoProductoResultante` quedan null |
| ¿Rentabilidad futura? | Costo de servicio incompleto; analytics deben excluir null (patrón ya usado) |
| ¿Cobro? | Precio de venta al cliente es otra capa (**PENDIENTE**); no confundir con costo |
| ¿Forzar costo antes de consumir? | Opcional UX; **no** inventar 0 en backend |

---

## Relación futura con Venta

**PENDIENTE — no convertir consumo en Venta automática ahora.**

Datos a conservar en la línea de repuesto para cobro futuro:

| Dato | Para qué |
|------|----------|
| `productoId` / nombre snapshot | Identidad |
| `cantidadConsumida` | Facturable |
| `costoUnitario` / `costoConocido` | Margen |
| (futuro) `precioUnitario` cobrado | Ingreso |
| `ordenServicioId` | Agrupar cobro |

Flujo conceptual futuro (**PENDIENTE**):

```
OT (repuestos consumidos + mano de obra)
  → documento de cobro / Venta vinculada
  → NO volver a descontar inventario (ya consumido)
```

Si se cobrara creando una Venta “normal” sin cuidado, se **doble-descontaría** stock. Por eso el tipo `CONSUMO_SERVICIO` debe ser distinto de `VENTA`.

---

## Mano de obra (solo concepto)

| Concepto | Inventario | Naturaleza |
|----------|------------|------------|
| Repuesto | Sí (Producto físico) | Línea ligada a Producto |
| Mano de obra | No | Servicio / cargo; **PENDIENTE** |

No implementar en esta fase.

---

## Recomendación de modelo

### Entidad futura `OrdenServicioRepuesto` (**PROPUESTO**)

| Campo | Notas |
|-------|--------|
| `id` | PK |
| `ordenServicio` | FK |
| `producto` | FK Producto comercial |
| `cantidadPlanificada` | ≥ 1 |
| `cantidadConsumida` | default 0 |
| `cantidadDevuelta` | default 0 |
| `estado` | PLANIFICADO / CONSUMIDO / DEVUELTO / ANULADO |
| `costoUnitario` | null hasta consumir |
| `costoConocido` | boolean |
| `fechaPlanificacion` / `fechaConsumo` | auditoría ligera |
| `movimientoConsumoId` / `movimientoDevolucionId` | opcional FK lógica |

### Operaciones de servicio (**PROPUESTO**)

| Operación | Inventario |
|-----------|------------|
| `agregarRepuesto` | No |
| `actualizarPlanificado` | No |
| `anularPlanificado` | No |
| `consumirRepuesto` | `CONSUMO_SERVICIO` salida |
| `devolverRepuesto` | `DEVOLUCION_SERVICIO` entrada |

### Qué NO hacer

- No mutar `Producto.stockActual` fuera de InventarioService.
- No usar `VENTA` como tipo de movimiento de taller.
- No crear reservas en MVP.
- No convertir OT en Producto.
- No auto-generar Venta al consumir.

---

## Frontend futuro (solo diseño)

**PENDIENTE** — en `/servicios/:id`:

```
Sección Repuestos
Producto | Cant. planificada | Cant. consumida | Estado | Costo histórico | Acciones
```

Acciones según estado de línea y de OT.  
Fuera de alcance de esta auditoría implementar UI.

---

## Analytics (impacto futuro)

**PENDIENTE** — con tipos nuevos se podrá medir:

- consumo de repuestos por producto/OT
- costo de servicio (solo líneas con `costoConocido`)
- rentabilidad servicio (cuando exista cobro)
- rotación ligada a taller (además de ventas)

Hoy analytics de inventario **IMPLEMENTADO** entiende VENTA/COMPRA/devoluciones/ajustes; habría que extender filtros cuando existan `CONSUMO_SERVICIO` / `DEVOLUCION_SERVICIO`.

---

## Cambios backend necesarios

Todo esto es **PENDIENTE** de implementación (no se hace en 3.15.4):

| Cambio | Tipo |
|--------|------|
| Enum `TipoMovimientoInventario`: `CONSUMO_SERVICIO`, `DEVOLUCION_SERVICIO` | DB CHECK + Java |
| Enum `ReferenciaMovimiento`: `ORDEN_SERVICIO` (y/o línea) | DB CHECK + Java |
| Entidad/tabla `orden_servicio_repuestos` | Nueva |
| Servicio de aplicación OT→InventarioService | Nuevo (no modificar semántica de InventarioService salvo enums) |
| Endpoints ADMIN bajo `/ordenes-servicio/{id}/repuestos`… | Nuevos |
| Reglas por estado OT | En servicio de repuestos |
| Tests de consumo, cancelación planificado, devolución, stock insuficiente, costo null | Nuevos |

**InventarioService.registrarMovimiento** puede permanecer como API única; los callers nuevos lo usan.  
**No** modificar Venta ni el núcleo de costeo de compras para el MVP de repuestos.

---

## Fases posteriores (sugeridas)

| Fase | Contenido | Estado |
|------|-----------|--------|
| 3.15.4 | Esta auditoría | **HECHO (doc)** |
| 3.15.5 | Backend: modelo línea + consumir/devolver + enums movimiento | **PENDIENTE** |
| 3.15.6 | Frontend: sección Repuestos en detalle OT | **PENDIENTE** |
| 3.15.x | Cobro OT / vínculo con Venta sin doble stock | **PENDIENTE** |
| 3.15.x | Mano de obra | **PENDIENTE** |
| Futuro | Reservas de stock (si el negocio lo exige) | **PENDIENTE** |
| Futuro | Locking de stock transversal | **PENDIENTE** |

---

## Resumen ejecutivo

| Tema | Veredicto |
|------|-----------|
| Inventario actual | Libro único vía `registrarMovimiento`; salidas tipadas |
| Producto como repuesto | Sí, sin cambiar de naturaleza |
| Costo en consumo | Snapshot de `costoActual` (V4 / patrón Venta); null permitido |
| Momento de salida | **Al confirmar consumo**, no al planificar (**Alternativa B**) |
| Reservas | No en MVP |
| Trazabilidad | Extender `ReferenciaMovimiento` + tipos de movimiento de servicio |
| Cancelación | Planificado sin stock; consumido exige devolución explícita |
| Venta | No automática; conservar costo/cantidad para cobro futuro |
| Código en esta fase | **Ninguno** — solo este documento |

---

## Archivos de referencia (IMPLEMENTADO)

- `.../ModulComercialService/InventarioService.java`
- `.../ModulComercialModel/MovimientoInventario.java`
- `.../ModulComercialModel/TipoMovimientoInventario.java`
- `.../ModulComercialModel/ReferenciaMovimiento.java`
- `.../ModulComercialService/VentaService.java` (`completar` / `cancelar`)
- `.../ModulComercialService/DevolucionVentaService.java`
- `.../ModulComercialService/costeo/UltimoCostoPolitica.java`
- `.../ModulProductoModel/Producto.java`
- `.../ModulServicioTecnicoModel/OrdenServicio.java` / `EstadoOrdenServicio.java`
- Migraciones `V1`–`V4` (inventario/costo), `V6` (OT sin inventario)
