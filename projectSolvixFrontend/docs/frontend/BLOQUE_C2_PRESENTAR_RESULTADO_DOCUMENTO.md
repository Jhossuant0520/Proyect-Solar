# SOLVIX Frontend — BLOQUE C.2
## Presentar: resultado de documento independiente

**Fecha:** 2026-09-28  
**Alcance:** detalle de cotización comercial. Compatible con UX C.1 (loading / disabled).

---

### Contrato consumido

`CotizacionComercialResponseDTO.documentoGenerado` (+ `documentoVigente`).

| Caso | UI |
|---|---|
| Presentar + `documentoGenerado=true` | Snack éxito; PDF usable; refresh lista |
| Presentar + `documentoGenerado=false` | “Cotización presentada, pero no se pudo generar el PDF.” + CTA **Generar PDF** |
| Error HTTP Presentar | Solo fallo de **negocio** (no invita a Generar PDF) |

HTTP 200 **≠** éxito documental total.

---

### Recuperación

`regenerarDocumento` → actualiza `documentos` / `documentoVigente` y limpia `pdfPendienteTrasPresentar`.

No se ofrece re-Presentar (el estado ya es `PENDIENTE_APROBACION`).

### Futuro async

Si Presentar devolviera PDF pendiente de forma asíncrona, el mismo branch `documentoGenerado=false` + CTA sirve de base; el poll sería una capa extra (no implementada).
