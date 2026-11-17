# SOLVIX Backend — BLOQUE B
## Cotización comercial: máximo una MANO_OBRA

**Fecha:** 2026-09-27  
**Alcance:** regla de líneas. La máquina de estados **no** se modificó.

---

### Regla

Una cotización comercial admite **0 o 1** línea con tipo `MANO_OBRA`.

Validación en `CotizacionComercialService.aplicarDetalles` (crear y actualizar):

> "La cotización comercial solo puede tener una línea de mano de obra."

Sin migración SQL ni constraint de BD.

### Tests

`CotizacionComercialServiceTest.maximoUnaManoObra`:

- PRODUCTO + MANO_OBRA + OTRO → OK  
- 2× MANO_OBRA en crear → BusinessException  
- actualizar introduciendo 2× MANO_OBRA → BusinessException  

CREATE → BORRADOR y PRESENTAR → PENDIENTE_APROBACION permanecen como estaban.
