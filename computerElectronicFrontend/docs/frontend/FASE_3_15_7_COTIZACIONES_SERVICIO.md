# SOLVIX — FASE 3.15.7 Cotizaciones de servicio (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Backend:** API `/api/v1/ordenes-servicio/{ordenId}/cotizaciones`  
**Restricción:** No se modificó backend, DTOs ni endpoints.

---

## Objetivo

Gestionar cotizaciones **iniciales** y **adicionales** desde `/servicios/:id`, con resumen económico autorizado y CTAs de dominio (crear / presentar / aprobar / rechazar) alineados al workflow 3.15.7.

Principio: **SOLVIX no simplifica la ingeniería. SOLVIX simplifica la forma de entenderla.**

---

## Contratos

Base: `${environment.apiBaseUrl}/v1/ordenes-servicio/{ordenId}/cotizaciones`

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/` | Listar cotizaciones |
| GET | `/resumen-economico` | Totales autorizados |
| GET | `/{cotizacionId}` | Detalle |
| POST | `/inicial` | Cotización inicial (desde DIAGNOSTICADO) |
| POST | `/adicional` | Ampliación (desde REQUIERE_APROBACION_ADICIONAL) |
| PUT | `/{cotizacionId}` | Editar borrador |
| POST | `/{cotizacionId}/presentar` | BORRADOR → PENDIENTE_APROBACION |
| POST | `/{cotizacionId}/aprobar` | Aprobación del cliente |
| POST | `/{cotizacionId}/rechazar` | Rechazo (observación opcional) |
| DELETE | `/{cotizacionId}` | Eliminar borrador |

Modelos: `core/models/cotizacion-servicio.models.ts`  
Servicio: `core/services/cotizacion-servicio.service.ts`

---

## Estado OT — `PENDIENTE_APROBACION`

Se añadió a `EstadoOrdenServicio` y a `servicio-ui`:

- Labels, tones, `WORKFLOW_PRINCIPAL` (entre COTIZADO y APROBADO)
- Transiciones espejo backend
- `textoProximaAccion` actualizado
- Se eliminó el mensaje «Ampliación de cotización disponible en próxima fase»

### CTAs de dominio (no transición directa)

| Estado OT | Acción principal | Comportamiento FE |
|-----------|------------------|-------------------|
| DIAGNOSTICADO | Preparar cotización | Diálogo crear inicial |
| COTIZADO | Presentar cotización | Confirmar presentar |
| PENDIENTE_APROBACION | Aprobar cotización | Confirmar aprobación |
| REQUIERE_APROBACION_ADICIONAL | Ampliar cotización | Diálogo crear adicional |
| APROBADO | Iniciar reparación | `cambiarEstado` directo |

`tipoAccionWorkflow`: `crearCotizacion` / `presentarCotizacion` / `aprobarCotizacion`.

---

## UI

Panel `ServicioCotizacionesPanelComponent` en el detalle, **antes de Repuestos**.

Capas:

1. Resultado fácil — total / estado / CTAs
2. Resumen económico autorizado
3. «Ver detalles técnicos» — líneas, precios, subtotales

Diálogos (`MatDialog`, `solvix-dialog-panel`, Tech-Minimal):

1. Crear / editar — líneas REPUESTO (desde planificados), MANO_OBRA, OTRO; preview local; total oficial post-save
2. Presentar — «¿Presentar esta cotización al cliente?»
3. Aprobar — título «Confirmar aprobación»
4. Rechazar — observación opcional

---

## Seguridad

Ruta admin existente. Endpoints backend `ADMIN`. Sin cambios de guards.

---

## Archivos tocados

- `core/models/cotizacion-servicio.models.ts` (nuevo)
- `core/services/cotizacion-servicio.service.ts` (nuevo)
- `core/models/orden-servicio.models.ts`
- `features/panelAdmin/servicios/servicio-ui.ts` (+ spec)
- `features/panelAdmin/servicios/servicio-cotizaciones-panel/**` (nuevo)
- `features/panelAdmin/servicios/servicio-detail/**`
- `docs/frontend/FASE_3_15_7_COTIZACIONES_SERVICIO.md` (este documento)
