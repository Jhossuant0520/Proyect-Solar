# FASE 3.15.5.3 — Entrega digital de Orden de Servicio (Backend)

## Operación

`POST /api/v1/ordenes-servicio/{id}/entrega`

Operación de dominio `registrarEntrega`:

1. Valida estado `LISTO`.
2. Exige `clienteConfirmo = true`.
3. Exige firma PNG (Base64 / data URL).
4. Persiste firma en filesystem (`solvix.servicios.firmas-dir`).
5. Crea `EntregaOrdenServicio`.
6. Transiciona `LISTO → ENTREGADO` (motivo automático).
7. Transiciona `ENTREGADO → CERRADO` (motivo automático).
8. Todo en una transacción.

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/{id}/entrega` | Registrar entrega |
| GET | `/{id}/entrega` | Consultar constancia |
| GET | `/entregas/firmas/{archivo}` | Servir firma (ADMIN) |

## Persistencia

Tabla `entregas_orden_servicio` (V10): orden única, fecha, usuario, confirmación, nombre/documento cliente, `firma_url`, observaciones.

Firma: archivo PNG en disco; MySQL solo guarda URL relativa.

## Seguridad

- `@PreAuthorize("hasRole('ADMIN')")`
- Sin endpoints públicos de firma
- Usuario desde JWT (no del body)

## Migración

`V10__entrega_orden_servicio.sql` — no altera V7–V9.

## Equipo — referenciaInterna

Columna física `equipos.nombre` se mantiene. Java/DTO: `referenciaInterna` (+ alias JSON `nombre`).

## Alcance / fuera

**En:** entrega atómica, firma manuscrita, cierre automático, historial.

**Fuera:** cotización formal, WhatsApp/correo, PDF completos, firma electrónica avanzada.
