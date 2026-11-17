# SOLVIX — FASE 3.15.1 Núcleo de Servicios Técnicos

## Objetivo

Construir el núcleo de dominio de taller:

```
Cliente → Equipo → OrdenServicio
```

Sin repuestos, inventario, cobro, Venta, rol TECNICO, garantías, evidencias ni analytics.

Documento histórico de auditoría: `FASE_3_15_AUDITORIA_SERVICIOS.md`.

---

## Separación Producto vs Servicio

| Producto comercial | Servicio técnico (esta fase) |
|--------------------|------------------------------|
| Stock, costo, compras, ventas | Cliente + equipo + orden de taller |
| `Producto` / categoría | `Equipo` + `OrdenServicio` |
| No se usa `CategoriaProducto.SERVICIO` como OT | No se usa `CONSUMIDOR_FINAL` como cliente de taller |

---

## Equipo

Entidad `Equipo` (tabla `equipos`).

| Campo | Obligatorio | Notas |
|-------|-------------|--------|
| `cliente` | **Sí** | FK a Cliente |
| `tipoEquipo` | **Sí** | COMPUTADOR, PORTATIL, IMPRESORA, MONITOR, SERVIDOR, CELULAR, OTRO |
| `marca` | No | |
| `modelo` | No | |
| `numeroSerie` | No | Sin unicidad global |
| `nombre` | No | Alias interno |
| `observaciones` | No | |
| `activo` | Sí (default true) | Soft-delete vía DELETE HTTP |
| `fechaRegistro` | Automática | |

**Identidad:** varios equipos idénticos o sin serial del mismo cliente están permitidos. No se impone unique global de serial.

---

## OrdenServicio

Entidad `OrdenServicio` (tabla `ordenes_servicio`).

| Campo | Notas |
|-------|--------|
| `numero` | `OS-{yyyy}-{000000}` vía `TipoSecuencia.ORDEN_SERVICIO` |
| `cliente` | FK — no se duplican nombre/email/teléfono |
| `equipo` | FK — debe pertenecer al mismo cliente |
| `estado` | Inicial `RECEPCIONADO` |
| `problemaReportado` | Opcional |
| `diagnostico` | Opcional (texto; sin flujo de cobro) |
| `trabajoRealizado` | Opcional |
| `observaciones` | Opcional |
| `fechaRecepcion` / `fechaActualizacion` / `fechaCierre` | Auditoría |
| `createdBy` | Username del ADMIN |

No hay DELETE físico de órdenes: cierre vía `CANCELADO` / `CERRADO`.

---

## Relaciones

```
Cliente 1 ─── N Equipo
Equipo  1 ─── N OrdenServicio
OrdenServicio N ─── 1 Cliente   (denormalizado en FK para consultas; coherente con equipo)
```

**Regla crítica:** al crear OT, `equipo.cliente_id` debe coincidir con `cliente_id` de la orden.

Cliente inactivo o `CONSUMIDOR_FINAL` → rechazo en altas de equipo/OT.

Cliente con OT históricas puede desactivarse después (FK se conserva); no puede abrir OT nuevas.

---

## Estados

```
RECEPCIONADO
EN_DIAGNOSTICO
COTIZADO
APROBADO
EN_REPARACION
ESPERA_REPUESTO
LISTO
ENTREGADO
CERRADO
CANCELADO
```

Incluidos en v1 porque el flujo de recepción→cierre los necesita; las transiciones evitan saltos.

---

## Transiciones

| Desde | Hacia |
|-------|--------|
| RECEPCIONADO | EN_DIAGNOSTICO, CANCELADO |
| EN_DIAGNOSTICO | COTIZADO, CANCELADO |
| COTIZADO | APROBADO, CANCELADO |
| APROBADO | EN_REPARACION, CANCELADO |
| EN_REPARACION | ESPERA_REPUESTO, LISTO, CANCELADO |
| ESPERA_REPUESTO | EN_REPARACION, CANCELADO |
| LISTO | ENTREGADO, CANCELADO |
| ENTREGADO | CERRADO |
| CERRADO / CANCELADO | (ninguna) |

Implementadas en `EstadoOrdenServicio.puedeTransicionarA`.

---

## Endpoints

Base ADMIN (`@PreAuthorize("hasRole('ADMIN')")`).

### Equipos — `/api/v1/equipos`

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/` | Crear |
| GET | `/` | Listar (`clienteId`, `soloActivos`) |
| GET | `/{id}` | Detalle |
| PUT | `/{id}` | Actualizar |
| DELETE | `/{id}` | Desactivar |

### Órdenes — `/api/v1/ordenes-servicio`

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/` | Crear (estado RECEPCIONADO) |
| GET | `/` | Listar (`clienteId`, `equipoId`, `estado`) |
| GET | `/{id}` | Detalle |
| PUT | `/{id}` | Actualizar textos (sin cambiar cliente/equipo/estado) |
| POST | `/{id}/estado` | Cambiar estado (`{ "estado": "..." }`) |

No públicos. Sin rol TECNICO.

---

## Seguridad

Solo **ADMIN**. No se modificaron roles ni SecurityConfig path matchers (queda bajo `.anyRequest().authenticated()` + `@PreAuthorize`).

---

## Migración

Archivo: `src/main/resources/db/migration/V6__equipos_orden_servicio.sql`

- Amplía `chk_secuencias_tipo` con `ORDEN_SERVICIO`
- Crea `equipos`, `ordenes_servicio` + FKs e índices

Ejecutar manualmente sobre MySQL (igual que V1–V5). Tests usan H2 `ddl-auto=create-drop`.

---

## Validaciones

- Cliente obligatorio, activo, no CONSUMIDOR_FINAL
- Equipo obligatorio y del mismo cliente
- Equipo activo al crear OT
- Transiciones de estado validadas
- OT terminal (CERRADO/CANCELADO) no editable
- No cambiar cliente/equipo en PUT de OT
- No cambiar cliente de equipo si ya tiene órdenes

---

## Tests

- `EquipoServiceTest` — crear, consultar, actualizar, cliente obligatorio, sin serial
- `OrdenServicioServiceTest` — crear, número OS, consulta, transición válida/inválida, equipo de otro cliente, mapa de estados

Ejecutar:

```bash
mvn test -Dtest=EquipoServiceTest,OrdenServicioServiceTest
```

---

## Pendientes (fases siguientes)

- Repuestos + InventarioService
- Cobro / vínculo Venta
- Rol o asignación TECNICO
- Evidencias / fotos
- Garantía post-entrega
- Frontend admin
- Analytics de taller
