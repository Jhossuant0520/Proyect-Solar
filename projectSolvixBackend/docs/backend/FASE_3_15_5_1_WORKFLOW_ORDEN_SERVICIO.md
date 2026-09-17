# SOLVIX — FASE 3.15.5.1 Workflow de Orden de Servicio (Backend)

**Tipo:** IMPLEMENTACIÓN BACKEND  
**Fecha:** 2026-09-17

---

## Problema original

Cambiar el estado de una OT era una operación demasiado libre: sin motivo, sin usuario, sin historial y sin requisitos por transición. Tampoco se bloqueaba la desactivación de equipos con OT activas.

---

## Arquitectura del workflow

La autoridad de transiciones permanece en `EstadoOrdenServicio.puedeTransicionarA`.

`OrdenServicioService.cambiarEstado(id, request, usuario)` es la única operación de negocio que:

1. Valida OT existente y no terminal.
2. Valida matriz origen → destino.
3. Valida motivo obligatorio.
4. Valida requisitos de campos (diagnóstico / trabajo).
5. Conserva la regla de cancelación con consumo neto de repuestos (3.15.6).
6. Cambia estado + escribe historial en la misma transacción.
7. Devuelve respuesta enriquecida.

El controller no modifica estado directamente.

---

## Estados

`RECEPCIONADO` → `EN_DIAGNOSTICO` → `COTIZADO` → `APROBADO` → `EN_REPARACION` ↔ `ESPERA_REPUESTO` → `LISTO` → `ENTREGADO` → `CERRADO`

Terminales: `CERRADO`, `CANCELADO`.

---

## Matriz de transiciones

| Desde | Hacia |
|-------|-------|
| RECEPCIONADO | EN_DIAGNOSTICO, CANCELADO |
| EN_DIAGNOSTICO | COTIZADO, CANCELADO |
| COTIZADO | APROBADO, CANCELADO |
| APROBADO | EN_REPARACION, CANCELADO |
| EN_REPARACION | ESPERA_REPUESTO, LISTO |
| ESPERA_REPUESTO | EN_REPARACION |
| LISTO | ENTREGADO |
| ENTREGADO | CERRADO |

Cancelación **no** permitida desde `EN_REPARACION`, `ESPERA_REPUESTO` ni `LISTO`.

---

## Requisitos por transición

| Transición | Requisitos |
|------------|------------|
| Cualquiera | Motivo + usuario autenticado |
| EN_DIAGNOSTICO → COTIZADO | `diagnostico` no vacío |
| EN_REPARACION → LISTO | `trabajoRealizado` no vacío |
| → CANCELADO | Motivo explícito + sin consumo neto de repuestos |

---

## Historial

Tabla: `historial_estado_orden_servicio` (Flyway **V8**)

Campos: orden, estado_anterior, estado_nuevo, motivo, observacion, usuario (username JWT), fecha_cambio.

Inmutable. Sin backfill de OT antiguas.

---

## Equipo activo / inactivo

- Inactivo: no permite nueva OT.
- Desactivar bloqueado si existe OT no terminal.
- Soft delete (`activo=false`).

---

## Endpoints

| Método | Path |
|--------|------|
| POST | `/api/v1/ordenes-servicio/{id}/estado` |
| GET | `/api/v1/ordenes-servicio/{id}/historial` |

Request estado:

```json
{ "nuevoEstado": "EN_DIAGNOSTICO", "motivo": "...", "observacion": "..." }
```

Alias JSON `estado` aceptado por compatibilidad.

Respuesta: `TransicionOrdenServicioResponseDTO` (orden + metadatos de transición).

---

## Errores de negocio

Mensajes claros vía `BusinessException` (HTTP 400), por ejemplo:

- `La transición X → Y no está permitida.`
- `No se puede pasar a COTIZADO porque el diagnóstico técnico está vacío.`
- `No se puede desactivar el equipo porque tiene una orden de servicio activa.`

---

## Seguridad

`@PreAuthorize("hasRole('ADMIN')")`. Usuario de auditoría = `Principal.getName()` (JWT). Frontend no envía usuario ni fecha.

---

## Decisiones de diseño

- Usuario como `VARCHAR` (mismo patrón que `created_by`), no FK a `usuarios`.
- Extender endpoint `/estado` en lugar de crear otro.
- No inventar cotización, repuestos ni garantías en esta fase.
- Preservar 3.15.6 (repuestos / cancelación con consumo).

---

## Fuera de alcance

Cotización formal, precios, técnico asignado, consumo de inventario desde workflow, facturación, pagos, garantías, analytics, SLA.

---

## Impacto futuro

- Cotización: añadir requisito en `COTIZADO → APROBADO`.
- Repuestos: `ESPERA_REPUESTO` ya existe; reservas/consumo se enganchan sin rehacer la matriz.
- Garantías: post-`CERRADO` / `ENTREGADO`.

---

## Migración manual MySQL

Sí: aplicar Flyway **V8** (o ejecutar el SQL de `V8__historial_estado_orden_servicio.sql` si el entorno no corre migraciones automáticamente).

`ddl-auto` de producción **no** sustituye Flyway.
