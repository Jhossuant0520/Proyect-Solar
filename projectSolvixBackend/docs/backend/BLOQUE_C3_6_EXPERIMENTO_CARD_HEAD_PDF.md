# SOLVIX Backend — BLOQUE C.3.6
## Experimento A/B controlado: `table.cr-card-head-inner`

**Fecha:** 2026-09-28  
**Alcance:** único cambio experimental aislado sobre `cr-card-head-inner`.  
**Estado final:** plantillas HTML + CSS **restaurados 100 %** al original (post-C.3.3 / post-C.3.5).  
**Decisión:** **descartar**.

---

### 1. Objetivo

Responder con evidencia medible:

> ¿Eliminar esta tabla de layout concreta (`table.cr-card-head-inner`) mejora de forma consistente el `renderMs` de OpenHTMLToPDF?

No generalizar a “todas las tablas”. No adoptar el cambio sin superar el ruido observado en C.3.4 (±300–1000 ms) en **varios** documentos.

---

### 2. Estado base

| Bloque | Resultado relevante |
|---|---|
| C.3.3 | Logo PDF optimizado; htmlChars ~76 KB; residual `renderMs` ~1.8–2.2 s |
| C.3.4 | page-break / `-fs-table-paginate` **sin** mejora consistente; ruido alto |
| C.3.5 | Candidato único de bajo riesgo: `cr-card-head-inner` (layout, depth 3, sin datos/firma/footer) |

Método de medición: `PdfRenderAuditC32Test` (2 renders por tipo, métricas `PdfGenTiming` + conteo estructural). Preferir **run 2 (warm)**; run 1 comercial incluye carga fría de fuentes.

---

### 3. Estructura original

**Instancias:** exactamente **3** por documento × 4 plantillas = **12** en total.

| Documento | Instancias `cr-card-head-inner` | Profundidad típica |
|---|---:|---|
| COTIZACION_COMERCIAL | 3 | 3 (dentro de `cr-card` / `cr-card-full`) |
| COTIZACION | 3 | 3 |
| COMPROBANTE_RECEPCION | 3 | 3 |
| ACTA_ENTREGA | 3 | 3 |

**HTML actual (patrón repetido):**

```html
<td class="cr-card-head">
  <table class="cr-card-head-inner">
    <tr>
      <td class="cr-card-head-left">
        <span class="cr-num">[01]</span>
        <span class="cr-card-title">Información del Cliente</span>
      </td>
      <td class="cr-card-head-right">Titular</td>
    </tr>
  </table>
</td>
```

**Función:** alinear título (izq.) y badge (der.) en la cabecera oscura de cada card.

**CSS directo** (`styles/comprobante-recepcion.css`):

| Selector | Rol |
|---|---|
| `.cr-card-head` | fondo, padding 9×12, radius superior |
| `.cr-card-head-inner td` | `vertical-align: middle` |
| `.cr-card-head-left` | `text-align: left` |
| `.cr-card-head-right` | mono, 6.75pt, uppercase, `white-space: nowrap`, right |
| `.cr-num` / `.cr-card-title` | tipografía del título |

**Otras propiedades relevantes:**

- Sin `colspan` / `rowspan` en `cr-card-head-inner`.
- Sin page-break propio.
- Sin datos de negocio (solo literales de sección).
- Anchos de celda implícitos por contenido de tabla (no `width` fijo en CSS original).

---

### 4. Variante experimental

**Único alcance:** sustituir `table.cr-card-head-inner` → `div.cr-card-head-inner` + dos `span` (`inline-block`).

**No usado:** flexbox, CSS Grid.

**HTML experimental:**

```html
<td class="cr-card-head">
  <div class="cr-card-head-inner">
    <span class="cr-card-head-left">
      <span class="cr-num">[01]</span>
      <span class="cr-card-title">Información del Cliente</span>
    </span>
    <span class="cr-card-head-right">Titular</span>
  </div>
</td>
```

**CSS experimental (temporal):**

```css
.cr-card-head-inner { width: 100%; font-size: 0; }
.cr-card-head-left {
  display: inline-block; width: 72%;
  vertical-align: middle; text-align: left; font-size: 8pt;
}
.cr-card-head-right {
  display: inline-block; width: 27%;
  vertical-align: middle; text-align: right;
  /* resto tipográfico igual al original */
}
```

**Efecto estructural esperado:** −3 tablas por documento (16→13, 19→16, 24→21, 22→19). Confirmado en el audit expandido.

**No tocado:** `cr-lines`, `cr-totales`, `cr-card`, `cr-split`, QR, firma, footer, page-break, OpenHTMLToPDF, cache C.3.1, logo C.3.3, endpoints, frontend.

---

### 5. Métricas baseline (ORIGINAL)

Suite: `PdfRenderAuditC32Test` · fontsMs warm = 0 · logoMs = 0 (ruta audit; logo ya en HTML como data URI C.3.3).

| Documento | tables | htmlChars | run | totalMs | renderMs | pages | pdfBytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 16 | 75 936 | 1 | 5173 | 5044* | 1 | 1 743 017 |
| COTIZACION_COMERCIAL | 16 | 75 936 | **2** | **2468** | **2418** | 1 | 1 743 017 |
| COTIZACION | 19 | 78 135 | 1 | 1825 | 1805 | 1 | 1 746 662 |
| COTIZACION | 19 | 78 135 | **2** | **1795** | **1769** | 1 | 1 746 662 |
| COMPROBANTE | 24 | 78 268 | 1 | 1946 | 1932 | 1 | 1 750 335 |
| COMPROBANTE | 24 | 78 268 | **2** | **1726** | **1694** | 1 | 1 750 335 |
| ACTA | 22 | 77 464 | 1 | 2060 | 2036 | 2 | 1 748 835 |
| ACTA | 22 | 77 464 | **2** | **1886** | **1870** | 2 | 1 748 835 |

\*Run 1 comercial incluye `fontsMs≈41` (cold JVM de la suite).

---

### 6. Métricas variante

| Documento | tables | htmlChars | run | totalMs | renderMs | pages | pdfBytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | **13** | 75 952 | 1 | 4851 | 4721* | 1 | 1 743 060 |
| COTIZACION_COMERCIAL | **13** | 75 952 | **2** | **2044** | **2018** | 1 | 1 743 060 |
| COTIZACION | **16** | 78 109 | 1 | 1907 | 1886 | 1 | 1 746 655 |
| COTIZACION | **16** | 78 109 | **2** | **1817** | **1800** | 1 | 1 746 655 |
| COMPROBANTE | **21** | 78 242 | 1 | 1881 | 1814 | 1 | 1 750 436 |
| COMPROBANTE | **21** | 78 242 | **2** | **2049** | **2038** | 1 | 1 750 436 |
| ACTA | **19** | 77 480 | 1 | 1638 | 1619 | 2 | 1 748 861 |
| ACTA | **19** | 77 480 | **2** | **1755** | **1746** | 2 | 1 748 861 |

---

### 7. Comparación por documento (warm / run 2)

| Documento | Original renderMs | Variante renderMs | Δ | % |
|-----------|-------------------:|------------------:|--:|--:|
| COTIZACION_COMERCIAL | 2418 | 2018 | **−400** | **−16.5 %** |
| COTIZACION | 1769 | 1800 | **+31** | **+1.8 %** |
| COMPROBANTE | 1694 | 2038 | **+344** | **+20.3 %** |
| ACTA | 1870 | 1746 | **−124** | **−6.6 %** |

**totalMs warm (referencia):**

| Documento | Original | Variante | Δ |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 2468 | 2044 | −424 |
| COTIZACION | 1795 | 1817 | +22 |
| COMPROBANTE | 1726 | 2049 | +323 |
| ACTA | 1886 | 1755 | −131 |

**Lectura:**

- Mejora en comercial y (leve) en acta; **empeora** comprobante; cotización OT ≈ plana.
- Magnitudes (|Δ| ~30–400 ms) están **dentro / al borde del ruido C.3.4** (±300–1000 ms).
- **No** hay mejora consistente en ≥2 documentos estables fuera de ruido.
- Reducir 3 tablas/doc **no** mueve de forma fiable el residual ~2 s.

---

### 8. Validación visual

Comparación métrica original vs experimental (no se adoptó visualmente de forma permanente):

| Aspecto | Resultado |
|---|---|
| Páginas | Idénticas (1 / 1 / 1 / 2) |
| pdfBytes | Δ ~+25…+100 B (irrelevante; tipografía/layout box) |
| Título + badge | Contenido idéntico (mismos textos) |
| Encabezado / footer / firma / QR | Sin cambios de markup |
| Saltos de página | Sin cambio de conteo |
| Riesgo visual | Anchos fijos 72 %/27 % pueden diferir levemente del layout tabular implícito |

No se observó rotura documental (tests de audit OK). Aun así, **sin ganancia de render clara**, no justifica el riesgo de micro-regresión de alineación.

---

### 9. Tests

Tras restaurar el original:

| Suite | Resultado |
|---|---|
| `PdfRenderAuditC32Test` | OK (baseline + variante + post-restore) |
| `PdfLogoAssetC33Test` | OK (corrida previa post-restore) |
| `PdfFontBytesCacheTest` / `PdfLogoCacheTest` | OK |
| `DocumentoPlantillaAutoriaTest` | OK |
| `mvn -Dtest=…` compile/test backend relacionado | BUILD SUCCESS |

Ningún test eliminado. Variante **no** permanece en el árbol de fuentes.

---

### 10. Conclusión

1. `cr-card-head-inner` es layout puro y se puede sustituir por `div` + `inline-block` sin romper el pipeline OpenHTMLToPDF.
2. Eso reduce **3 tablas** por PDF y ~mantiene htmlChars / páginas / tamaño PDF.
3. El efecto en `renderMs` es **inconsistente** (mejora / neutro / regresión según documento) y **no supera claramente el ruido** de C.3.4.
4. Por tanto: **eliminar esta tabla concreta no demuestra una mejora medible y consistente** del renderizado.
5. No se extrapola este resultado negativo a `cr-split`, `cr-lines` u otras tablas; solo se cierra la hipótesis de este candidato.

---

### 11. Decisión

## **descartar**

- Variante **no** adoptada.
- HTML/CSS restaurados al estado original.
- Residual ~1.8–2.2 s de `builder.run()` permanece como coste del shell Stitch-compatible; próximos esfuerzos deberían buscar otros hotspots (p. ej. motor/renderer, tipografía embebida total, o un rediseño mayor de layout medido por etapas), **no** micro-sustituciones aisladas de una sola clase de tabla sin evidencia.

---

### Anexo — Criterio de éxito (no cumplido)

| Criterio | ¿Cumple? |
|---|---|
| Mejora `renderMs` consistente | No |
| En varios documentos | No (solo COM/ACTA parcial; COMP regresa) |
| Claramente sobre ruido C.3.4 | No |
| Sin degradación visual relevante | Aceptable / no concluyente; no justifica adopción |
