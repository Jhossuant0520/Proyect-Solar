# SOLVIX Backend — UX Metadata Banner Cotización OT

**Fecha:** 2026-09-29  
**Alcance:** layout del banner en PDF `cotizacion.html` (cotización de servicio / OT).  
**Sin cambios:** DTO, `fechaPresentacion`, `numeroCotizacion`, `numeroOrden`, tipo `INICIAL`, API, lógica de negocio, PDF comercial (D.8).

---

### 1. Problema

En el banner derecho, Orden y Presentada compartían una sola fila:

```text
Orden: OS-…  •  Presentada: 29/09/2026 16:26
```

Con el ancho del `cr-banner-right` (~42 %), el label `Presentada:` y la fecha/hora podían quedar en líneas distintas, desbalanceando la cabecera.

---

### 2. Decisión UX

| Elemento | Tratamiento |
|----------|-------------|
| Cotización + chip | Sin cambio visual (fila principal) |
| Orden | Fila propia: label + valor asociados |
| Presentada + fecha/hora | Fila propia: label + valor asociados |
| Badge tipo (`INICIAL`) | Conservado debajo, jerarquía secundaria |
| Variables plantilla | Todas conservadas |

No se tocó `docs/frontend/BLOQUE_D9_UX_CARD_FIRMA_RECEPCION.md` (otro bloque UX).

---

### 3. Cambio aplicado

- `templates/documentos/servicios/cotizacion.html` — tabla `cr-cot-meta` con filas Orden / Presentada.
- `templates/documentos/servicios/styles/cotizacion.css` — estilos de la tabla de metadata.

Otros PDFs (comprobante, acta, cotización comercial) no usan `cr-cot-meta`.
