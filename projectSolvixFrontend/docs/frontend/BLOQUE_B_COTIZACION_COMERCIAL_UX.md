# SOLVIX Frontend — BLOQUE B
## Cotización comercial: UX de líneas y Presentar

**Fecha:** 2026-09-27  
**Alcance:** solo Cotización Comercial. La máquina de estados **no** se modificó.

---

### Implementado

1. **Máximo 1 `MANO_OBRA` (UI)**  
   - Getter `tieneManoObra` en `CotizacionComercialFormComponent`.  
   - Chip “Agregar mano de obra” oculto si ya existe una línea.  
   - `agregarManoObra()` no-op si ya hay una.  
   - Al eliminar la línea, el chip reaparece.

2. **Detalle interno**  
   - Se ocultó la etiqueta visual **“Presentada”**.  
   - `fechaPresentacion` sigue en el modelo/DTO; PDF y consulta pública no se tocaron.

3. **Botón Presentar**  
   - Usa el patrón Dashboard de `solvix-button`:  
     `[loading]="procesando === 'presentar'"` + `[disabled]="procesando !== null"`.  
   - No se cambió `afterCommit` ni la generación del PDF.

---

### Archivos

- `cotizacion-comercial-form.ts` / `.html` / `.spec.ts`
- `cotizacion-comercial-detail.html` / `.spec.ts`

### Fuera de alcance (BLOQUE C)

- Esperar/mostrar progreso real de generación PDF post-presentar.
