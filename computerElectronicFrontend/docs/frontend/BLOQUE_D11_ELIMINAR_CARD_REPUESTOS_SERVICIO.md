# SOLVIX Frontend — BLOQUE D.11
## Eliminar card de Repuestos sin funcionalidad en Servicio Detalle

**Fecha:** 2026-09-29  
**Alcance:** presentación/UX de `servicio-detail` únicamente.

---

### 1. Problema detectado

En el detalle de Orden de Servicio existía una sección colapsable **Inventario / Repuestos** (`app-servicio-repuestos-panel`) que:

- ocupaba espacio y aumentaba el scroll,
- sugería gestión de repuestos desde el detalle,
- ya no era el flujo útil vigente (los repuestos se trabajan desde **Cotizaciones**).

---

### 2. Razón UX

Mantener una card aparente sin rol claro confunde. El flujo vigente es:

1. agregar líneas `REPUESTO` en la cotización,
2. continuar consumo/devolución e inventario según el **dominio** existente.

La gestión funcional de repuestos permanece en el dominio y flujo de Cotizaciones/Inventario; se elimina únicamente la representación sin funcionalidad de Servicio Detalle.

---

### 3. Qué se eliminó

| Elemento | Acción |
|----------|--------|
| Sección HTML «Repuestos» en `servicio-detail` | Eliminada |
| Import / uso de `ServicioRepuestosPanelComponent` | Eliminado |
| Carpeta `servicio-repuestos-panel/` (panel + diálogos planificar/cantidad + specs) | Eliminada (solo se usaba desde el detalle) |
| Clave de sección `'repuestos'` en `SeccionDetalleId` / `seccionesAbiertasPorEstado` | Eliminada; estados que la abrían pasan a abrir `tecnico` |

---

### 4. Qué NO se eliminó

- Entidad / API / endpoints de `OrdenServicioRepuesto`
- Consumo, devolución, movimientos de inventario
- `OrdenServicioService.listarRepuestos` y métodos de dominio
- Cotizaciones (líneas REPUESTO, precios, presentar/aprobar)
- Workflow `ESPERA_REPUESTO`, CTAs de espera
- Helpers en `servicio-ui` (`contarRepuestosPendientes`, labels, etc.)
- Listado de servicios

---

### 5. Relación con Cotizaciones

La sección **Cotizaciones** en Servicio Detalle **ya existía** y se conserva como acceso natural.

No se añadió navegación nueva ni una segunda UI de repuestos en este bloque.

**Observación (mejora futura opcional):** sin la card, el mensaje de requisitos «repuesto pendiente de consumir» sigue alimentándose del dominio vía `listarRepuestos`, pero ya no hay UI de consumo en el detalle. Si se requiere orientación explícita hacia consumo, documentar/diseñar en un bloque UX posterior (no inventado en D.11).

---

### 6. Limpieza de código

En `servicio-detail`:

- se mantiene `pendingRepuestos` / `repuestosItems` / `pendientesResumen` para **espera por repuesto** y resumen en **entrega**;
- se carga con `cargarRepuestos()` al aplicar orden (sin card);
- se quitó `onRepuestosChange` y el `ViewChild` `panelReparacion`.

---

### 7. Tests

- `servicio-detail.spec.ts` — caso D.11: no renderiza panel; sí Cotizaciones/Documentos/ficha; sigue llamando `listarRepuestos`.
- `estado-orden-ux.spec.ts` — secciones por estado sin `repuestos`.

Specs del panel eliminado ya no aplican.

---

### 8. Build

Ejecutar:

```bash
npx ng test --include=**/servicio-detail.spec.ts --include=**/estado-orden-ux.spec.ts --watch=false --browsers=ChromeHeadless
npx ng build
```

Backend: sin cambios.

---

### 9. Impacto visual

- Detalle más compacto, menos scroll.
- Sin hueco/divider/card vacía de Repuestos.
- Layout de columnas (técnica + cotizaciones | documentos + actividad) sin rediseño general.
