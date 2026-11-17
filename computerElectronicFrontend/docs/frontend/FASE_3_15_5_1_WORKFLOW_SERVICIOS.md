# SOLVIX — FASE 3.15.5.1 Workflow de Servicios (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Fecha:** 2026-09-17

---

## Wizard

`/servicios/nueva` es un asistente de 3 pasos:

1. **Cliente** — selección / alta inline (sin consumidor final).
2. **Equipo** — solo activos del cliente / alta inline.
3. **Recepción** — problema reportado + observaciones → crea OT en `RECEPCIONADO`.

Indicador Paso 1/3 · 2/3 · 3/3, Atrás / Continuar, estados loading/error.

---

## Navegación contextual

| Origen | Destino |
|--------|---------|
| `/servicios/nueva` | Sin prefill |
| `/servicios/nueva?clienteId=` | Paso equipo |
| `/servicios/nueva?clienteId=&equipoId=` | Paso recepción |
| Ficha cliente → Nueva orden | Prefill cliente |
| Card equipo → Nueva orden | Prefill cliente + equipo |

Un solo componente wizard. Sin duplicar lógica.

---

## Timeline

En `/servicios/:id`:

- Sección **Historial de la orden** (más reciente primero).
- Datos reales de `GET /historial`.
- Motivo, observación, usuario, fecha.

---

## Acciones por estado

Se eliminó el selector genérico / lista plana de estados.

Bloque **Próxima acción** + botón contextual + cancelación (si aplica) + espera de repuesto (en reparación).

Cada transición abre modal con motivo obligatorio.

---

## Integración Cliente → Equipo → OT

Desde `ClienteEquiposPanel`:

- Registrar equipo
- Nueva orden (cliente)
- Nueva orden (equipo concreto)

Tooltips en acciones relevantes.

---

## Decisiones UX

- Tech-Minimal (coherente con servicios).
- Una acción primaria por estado; cancelación como danger.
- Progreso visual informativo (no clicable para saltar estados).
- Bloqueo visual si falta diagnóstico / trabajo realizado.

---

## Limitaciones actuales

- Sin cotización monetaria.
- `ESPERA_REPUESTO` no consume inventario.
- Sin módulo global de Equipos en sidebar.
- OT antiguas pueden no tener historial previo.

---

## Tests

- Wizard: pasos, inline cliente/equipo, query params, creación OT.
- Detalle: acción contextual, modal, bloqueo, timeline.
- `OrdenServicioService`: estado + historial.
- `servicio-ui`: matriz actualizada.

---

## Build

```bash
npm run build
npx ng test --watch=false --browsers=ChromeHeadless
```
