# FASE 3.15.5.2 — Rediseño del workflow operativo de Orden de Servicio (Backend)

## Problema original

El workflow pedía motivos genéricos en casi todas las transiciones, saltaba de `EN_DIAGNOSTICO` a `COTIZADO` sin un hito claro de diagnóstico cerrado, y no contemplaba una nueva falla durante reparación.

## Nueva semántica

Flujo principal:

```
RECEPCIONADO → EN_DIAGNOSTICO → DIAGNOSTICADO → COTIZADO → APROBADO
→ EN_REPARACION → LISTO → ENTREGADO → CERRADO
```

Estados especiales:

- `ESPERA_REPUESTO` ↔ `EN_REPARACION` (repuestos pendientes)
- `EN_REPARACION` → `REQUIERE_APROBACION_ADICIONAL` (nueva falla; salida preparada para 3.15.7)
- `CANCELADO` solo hasta `APROBADO` inclusive (+ barrera de consumo neto de repuestos)

## Estados nuevos

| Estado | Significado |
|--------|-------------|
| `DIAGNOSTICADO` | Diagnóstico técnico diligenciado; listo para cotización inicial |
| `REQUIERE_APROBACION_ADICIONAL` | Nueva situación en reparación; bloqueo hasta ampliación (3.15.7) |

`COTIZADO` = hito de cotización inicial preparada. **Sin** entidad económica en esta fase.

## Matriz de transiciones

| Origen | Destinos |
|--------|----------|
| RECEPCIONADO | EN_DIAGNOSTICO, CANCELADO |
| EN_DIAGNOSTICO | DIAGNOSTICADO, CANCELADO |
| DIAGNOSTICADO | COTIZADO, CANCELADO |
| COTIZADO | APROBADO, CANCELADO |
| APROBADO | EN_REPARACION, CANCELADO |
| EN_REPARACION | ESPERA_REPUESTO, REQUIERE_APROBACION_ADICIONAL, LISTO |
| ESPERA_REPUESTO | EN_REPARACION |
| REQUIERE_APROBACION_ADICIONAL | EN_REPARACION (backend; FE no expone CTA) |
| LISTO | ENTREGADO |
| ENTREGADO | CERRADO |

## Motivos

- **Automáticos** en acciones normales (generados en `EstadoOrdenServicio.motivoAutomatico`).
- **Manuales** solo en: cancelación, nueva falla.

## Operaciones de dominio

| Método | Efecto |
|--------|--------|
| `completarDiagnostico` | Guarda ficha + `EN_DIAGNOSTICO` → `DIAGNOSTICADO` (transaccional) |
| `completarReparacion` | Guarda trabajo + `EN_REPARACION` → `LISTO` (transaccional) |
| `registrarNuevaFalla` | `EN_REPARACION` → `REQUIERE_APROBACION_ADICIONAL` |

Endpoints:

- `POST /api/v1/ordenes-servicio/{id}/diagnostico/completar`
- `POST /api/v1/ordenes-servicio/{id}/reparacion/completar`
- `POST /api/v1/ordenes-servicio/{id}/nueva-falla`
- `POST /api/v1/ordenes-servicio/{id}/estado` (sigue vigente; motivo opcional salvo excepciones)

## Migración

**V9** amplía CHECK de `ordenes_servicio.estado` e historial con los dos estados nuevos. Sin backfill.

## Compatibilidad

- V7 repuestos intacta.
- V8 historial intacta.
- OT en `COTIZADO` / `EN_DIAGNOSTICO` siguen válidas; completar diagnóstico atómico si ya hay texto.

## Alcance / fuera de alcance

**En alcance:** estados, matriz, motivos, operaciones atómicas, historial, preparación `REQUIERE_APROBACION_ADICIONAL`.

**Fuera:** Cotizacion formal (3.15.7), PDF/documentos (3.15.8), precios, firmas, SLA.

## Roadmap

- **3.15.7** Cotización de servicio (inicial, versiones, ampliaciones, aprobación).
- **3.15.8** Documentos (recepción, cotización PDF, acta de entrega).
