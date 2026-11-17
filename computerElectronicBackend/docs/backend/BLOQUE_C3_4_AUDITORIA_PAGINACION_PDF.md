# SOLVIX Backend — BLOQUE C.3.4
## Auditoría controlada de paginación y tablas (OpenHTMLToPDF)

**Fecha:** 2026-09-28  
**Alcance:** inventario + experimentos temporales aislados. **Sin cambios permanentes.**  
**Estado final:** CSS/plantillas restaurados al estado post-C.3.3.

---

### 1. Objetivo

Determinar si `page-break-inside: avoid`, `-fs-table-paginate: avoid` y/o la estructura tabular contribuyen de forma **medible** al `renderMs` residual (~1.8–2.2 s) tras C.3.3.

---

### 2. Estado después de C.3.3

| Métrica | Valor aprox. |
|---|---|
| Logo PDF | 170×240 / ~37 KB |
| htmlChars | ~76 KB |
| renderMs warm | ~1.8–2.2 s |
| Hotspots C.3.2 restantes | tablas anidadas, page-break, `-fs-table-paginate` |

---

### 3. Inventario de tablas

Fuente: plantillas HTML + audit expandido (`PdfRenderAuditC32Test`).

| Documento | tables (HTML) | max nest | Layout tables | Contenido (líneas) | Sign block | Footer |
|---|---:|---:|---|---|---|---|
| COTIZACION_COMERCIAL | 16 | 3 | meta, header, brand-row, banner, two, cards, splits, head-inner, lines, totales, footer | `cr-lines` | No | Sí |
| COTIZACION (OT) | 19 | 3 | idem + panel QR | `cr-lines` | No | Sí |
| COMPROBANTE_RECEPCION | **24** | 3 | idem + más cards/splits + **sign** | — | **Sí** | Sí |
| ACTA_ENTREGA | 22 | 3 | idem + entrega + **sign** | — | **Sí** | Sí |

**Anidamiento típico (depth 3):**  
`cr-header` → `cr-brand-row` → celdas;  
`cr-two` → `cr-card` → `cr-card-head-inner` / `cr-split`;  
`cr-sign-wrap` → `cr-sign` → `cr-sign-pad`.

Casi todas las tablas son **layout** (réplica Stitch), no tablas de datos. La excepción relativa es `cr-lines` (filas de cotización).

---

### 4. Inventario de reglas page-break

**Archivo único:** `styles/comprobante-recepcion.css` (shell compartido por los 4 PDFs).

| # | Selector | Reglas | Docs afectados | Clasificación |
|---|---|---|---|---|
| 1 | `.cr-sign-wrap` | `page-break-inside: avoid;` + `break-inside: avoid;` | Comprobante, Acta | **A** necesario (firma junta) + **C** potencialmente costoso |
| 2 | `.cr-sheet table.cr-sign` | `page-break-inside: avoid;` + `break-inside: avoid;` + **`-fs-table-paginate: avoid;`** | Comprobante, Acta | **A** + **C** |
| 3 | `.cr-footer` | `page-break-inside: avoid;` | **Todos** | **A** (footer intacto) / **D** no concluyente en docs de 1 pág. |

**No encontrados:** `page-break-before`, `page-break-after`, reglas en `cotizacion.css` / `acta-entrega.css`.

Conteos por tipo (reglas CSS aplicables vía shell):

| Documento | selectores page-break-inside:avoid | `-fs-table-paginate` | Páginas (baseline) |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 1 (footer) | 0 | 1 |
| COTIZACION | 1 (footer) | 0 | 1 |
| COMPROBANTE | 3 (sign-wrap, sign, footer) | 1 | 1 |
| ACTA | 3 | 1 | **2** |

---

### 5. Experimento 1

**Cambio temporal único:** comentar/quitar solo `page-break-inside: avoid` (3 ocurrencias).  
**Conservado:** `break-inside: avoid`, `-fs-table-paginate: avoid`.  
**Método:** `PdfRenderAuditC32Test` × 2 runs/tipo.  
**Restaurado inmediatamente** tras la corrida.

---

### 6. Resultados experimento 1

`renderMs` (ms) — comparar preferentemente **run 2 (warm)**:

| Tipo | Baseline r2 | Exp1 r2 | Δ | Páginas |
|---|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 2813 | 1882 | −931* | 1→1 |
| COTIZACION | 1776 | 1788 | +12 | 1→1 |
| COMPROBANTE | 1823 | 1755 | −68 | 1→1 |
| ACTA | 1838 | 2189 | +351 | 2→2 |

\*La 1ª corrida comercial de cada suite oscila 4.1–4.7 s (cold JVM); no se toma como evidencia.

**Visual / integridad (observado en métricas):** páginas iguales; `pdfBytes` idénticos salvo Acta (+57 B, irrelevante). Sin evidencia de partición distinta en conteo de páginas.

**Conclusión Exp1:** **no hay mejora consistente** en ≥2 docs. Cotización/comprobante ≈ ruido; Acta empeoró en esa muestra.

---

### 7. Experimento 2

**Cambio temporal único:** quitar solo `-fs-table-paginate: avoid` en `.cr-sign`.  
**Conservado:** ambas `page-break-inside` / `break-inside`.  
**Nota:** esta regla **solo aplica** a Comprobante/Acta (tienen `cr-sign`). Comercial/OT no deberían verse afectados estructuralmente.

---

### 8. Resultados experimento 2

| Tipo | Baseline r2 | Exp2 r2 | Δ | Páginas |
|---|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 2813 | 2158 | −655* | 1→1 |
| COTIZACION | 1776 | 2043 | +267 | 1→1 |
| COMPROBANTE | 1823 | 2438 | **+615** | 1→1 |
| ACTA | 1838 | 1977 | +139 | 2→2 |

\*Otra vez, ruido de suite/cold; no reproducible como ganancia aislada (C.3.3 warm comercial estaba ~1844).

**Conclusión Exp2:** **sin beneficio**; en Comprobante/Acta (donde sí aplica) no baja `renderMs` de forma consistente.

---

### 9. Comparación renderMs (síntesis)

| Experimento | ¿Mejora consistente? | ¿Cambio de páginas? |
|---|---|---|
| Quitar `page-break-inside: avoid` | **No** | No |
| Quitar `-fs-table-paginate: avoid` | **No** | No |

Varianza entre corridas (≈ ±300–1000 ms en extremos) > delta atribuible a estas reglas.

El coste residual ~2 s **no se explica** por estas pocas reglas de paginación en documentos típicos de 1–2 páginas.

---

### 10. Impacto visual

- No se detectó cambio de número de páginas.
- En muestras de 1 página, `page-break-inside` en footer/firma tiene poco margen para “activar” algoritmos caros descritos en OH2PDF #551 (tablas grandes multipágina).
- Riesgo visual de quitar las reglas: **alto** en Acta/Comprobante multipágina futuros (firma partida).

---

### 11. Impacto en número de páginas

| Tipo | Baseline | Exp1 | Exp2 |
|---|---:|---:|---:|
| Comercial | 1 | 1 | 1 |
| Cotización | 1 | 1 | 1 |
| Comprobante | 1 | 1 | 1 |
| Acta | 2 | 2 | 2 |

---

### 12. Riesgos

| Acción | Riesgo |
|---|---|
| Eliminar page-break en firmas | Firma/sello partidos entre páginas |
| Eliminar `-fs-table-paginate` | Misma clase de problemas en tablas de firma |
| Refactor masivo de tablas anidadas | Alto riesgo visual; esfuerzo grande; **no medido** aquí |

---

### 13. Recomendación

**Decisión: A — Mantener las reglas actuales** porque el beneficio medido **no es significativo**.

Justificación:

1. Exp1 y Exp2 no producen reducción consistente de `renderMs`.
2. Las reglas protegen integridad documental (firmas/footer) con bajo coste aparente en docs cortos.
3. El residual ~2 s apunta más a **complejidad de layout tabular (16–24 tablas, depth 3)** y trabajo intrínseco de OpenHTMLToPDF que a estas 3 declaraciones CSS.

**No** se recomienda B (modificación puntual de page-break) en este momento.

**C (investigar estructura de tablas)** queda como opción **futura** solo si el negocio exige bajar de ~2 s: sería un rediseño controlado de layout (sustituir tablas de layout por bloques más simples), con alto riesgo visual — **fuera de C.3.4**.

**No** cambiar el motor PDF todavía.

---

### Confirmación de restauración

Tras los experimentos:

```css
.cr-sign-wrap { page-break-inside: avoid; break-inside: avoid; }
.cr-sheet table.cr-sign { page-break-inside: avoid; break-inside: avoid; -fs-table-paginate: avoid; }
.cr-footer { page-break-inside: avoid; }
```

Sin comentarios `C.3.4 EXP*`. Sin archivos `.c34bak` residuales.  
Proyecto funcionalmente equivalente a post-C.3.3.

---

### Validación ejecutada

```
Baseline  → PdfRenderAuditC32Test BUILD SUCCESS
Exp1      → PdfRenderAuditC32Test BUILD SUCCESS → restore page-break
Exp2      → PdfRenderAuditC32Test BUILD SUCCESS → restore -fs-table-paginate
```
