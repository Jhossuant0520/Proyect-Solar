# SOLVIX Backend — BLOQUE C.3.2
## Auditoría del costo de renderizado PDF (OpenHTMLToPDF)

**Fecha:** 2026-09-28  
**Alcance:** inspección + medición + hotspots + propuesta. **Sin optimizaciones implementadas.**  
**C.3.1:** no modificado (cache fuentes/logo intacto).

---

### 1. Objetivo

Identificar con evidencia qué características del HTML/CSS/recursos/plantillas contribuyen al alto `renderMs` (~3–4 s, ~90 %+ del total) tras el cache de C.3.1, para decidir con precisión qué tocar en C.3.3.

---

### 2. Contexto C.3

- Instrumentación `PdfGenTiming` (`System.nanoTime` → ms).
- Cuello principal confirmado: `builder.run()` / `renderMs`.
- Tipos: `COTIZACION_COMERCIAL`, `COTIZACION`, `COMPROBANTE_RECEPCION`, `ACTA_ENTREGA`.

---

### 3. Resultado C.3.1

| Métrica | Antes | Después (2ª+ gen) |
|---|---|---|
| `fontsMs` | ~40–122 | **≈ 0** |
| `logoMs` | ~9–69 | **≈ 0** |
| `fontsCount` | 27 | 27 |
| `renderMs` | ~3–4 s (dominante) | **sigue ~3–4 s** |

Conclusión C.3.1: I/O de recursos ya no es el cuello. El costo restante está **dentro** de OpenHTMLToPDF.

---

### 4. Arquitectura actual del render

```
Orquestador (Documento*Service)
  → DocumentoPlantillaSupport.baseEmpresaVars()  (+ LOGO_HTML cacheado C.3.1)
  → HtmlToPdfService.construirHtmlDesdeClasspath
       · lee plantilla HTML
       · incrusta CSS enlazado en <style>
       · reemplaza ${PLACEHOLDERS}
  → HtmlToPdfService.htmlAPdf
       · PdfRendererBuilder
       · useFastMode()
       · useDefaultPageSize(LETTER 8.5×11 in)
       · registrar 27 fuentes (bytes desde PdfFontBytesCache)
       · withHtmlContent(html, classpath:/templates/documentos/servicios/)
       · toStream(baos)
       · builder.run()   ← renderMs (agregado)
  → DocumentoPdfStorageService.guardar
```

**Dónde nace el HTML final:** `HtmlToPdfService.construirHtmlDesdeClasspath` → string que recibe `withHtmlContent`.

---

### 5. Análisis HTML

#### Shell compartido

Los cuatro documentos usan el diseño Stitch basado en **tablas anidadas** + CSS `comprobante-recepcion.css`:

| Documento | CSS | Plantilla (líneas aprox.) |
|---|---|---|
| COTIZACION_COMERCIAL | `comprobante-recepcion.css` + `cotizacion.css` | 211 |
| COTIZACION (OT) | idem | 249 |
| COMPROBANTE_RECEPCION | solo `comprobante-recepcion.css` | 297 |
| ACTA_ENTREGA | `comprobante-recepcion.css` + `acta-entrega.css` | 280 |

`documentos-servicios.css` existe pero **no** se enlaza en estas plantillas Stitch (legado).

#### Métricas del HTML **ya expandido** (audit `PdfRenderAuditC32Test`)

| Tipo | htmlChars | ≈ KB | tables | nest máx | tr | td | div | span | img | data URI | CSS inlined |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 1 747 240 | 1706 | 16 | **3** | 22 | 41 | 4 | 23 | 1 | 1 | 19 658 |
| COTIZACION | 1 749 439 | 1708 | 19 | **3** | 26 | 49 | 4 | 25 | 2 | 2 | 19 658 |
| COMPROBANTE | 1 749 572 | 1708 | **24** | **3** | 29 | 52 | 9 | 25 | 2 | 2 | 17 572 |
| ACTA | 1 748 768 | 1707 | 22 | **3** | 26 | 43 | 9 | 25 | 1 | 1 | 18 759 |

Hallazgos:

- **~98 % del HTML es el data URI del logo** (`logoHtmlChars ≈ 1 720 711`).
- Layout = tablas anidadas hasta profundidad **3** (header brand dentro de header, cards, splits, firmas).
- Casi no hay `style=` inline en plantillas (0 en muestras).
- No hay flex/grid en el HTML.
- Elementos repetitivos: cards `[01]/[02]/[03]`, filas de detalle, paneles QR/firma.

---

### 6. Análisis CSS

#### Archivo dominante

`styles/comprobante-recepcion.css` — **940 líneas / ~17.6 KB** (shell de todos los PDF Stitch).

#### Propiedades presentes (inspección)

| Propiedad / patrón | ¿Presente? | Notas |
|---|---|---|
| `display:flex` / `grid` | **No** | Correcto: OpenHTMLToPDF no soporta flex/grid de forma útil |
| `position:absolute/fixed` | **No** | — |
| `float` | **No** | — |
| `transform` (2D) | **No** (solo `text-transform`) | — |
| `opacity` / `filter` | **No** en QR (comentario explícito) | — |
| `box-shadow` | **No** | — |
| `border-radius` | **Sí, abundante** (~18 reglas) | 3px–999px; coste de pintura/clip desconocido pero presente |
| `overflow: hidden` | **Sí** | cards / QR panel |
| `white-space: nowrap` | **Sí** | chips, montos, labels |
| `border-collapse: collapse` + `separate` | **Sí** | reglas específicas por especificidad OpenHTML |
| `page-break-inside: avoid` / `break-inside: avoid` | **Sí** | `.cr-sign-wrap`, `table.cr-sign`, `.cr-footer` |
| `-fs-table-paginate: avoid` | **Sí** | extensión Flying Saucer / OpenHTML en firmas |
| `@page` | **Sí** | LETTER + márgenes mm |
| `nth-child(even)` | **Sí** | `cotizacion.css` filas de líneas |
| Pseudo-elementos `::before/::after` | **No** | — |

#### Evidencia externa (OpenHTMLToPDF)

- Issue [#551](https://github.com/danfickle/openhtmltopdf/issues/551): tablas anidadas + `page-break-inside: avoid` pueden degradar layout de forma severa.
- README proyecto: sin flex/grid; motor ligero pero limitado.
- `useFastMode()` ya está activo (recomendación oficial de rendimiento).

---

### 7. Análisis imágenes

| Recurso | Formato | Bytes | Dimensiones reales | Uso declarado CSS/HTML | Embedding |
|---|---|---:|---|---|---|
| **Logo** `LogoEmpresa1.png` (classpath configurado) | PNG | **1 290 484** | **1414 × 2000** | `max-width/max-height: 60px` (`.cr-logo-box img`) | data URI Base64 completo en **cada** HTML |
| `logo-empresa.png` (default código) | PNG | 140 752 | 500 × 500 | idem | no usado si props apunta a LogoEmpresa1 |
| QR | PNG | pequeño (matriz 180×180) | 180×180 gen; CSS/HTML **104×104** | data URI | Cotización OT + Comprobante |
| Firma (Acta) | PNG recortado | variable | CSS max 48×200 | data URI | Solo Acta |

**Config:** `solvix.empresa.logo-classpath=static/branding/LogoEmpresa1.png`  
**Observación de despliegue:** en el workspace, `LogoEmpresa1.png` aparece en `target/classes/...` (~1.29 MB) y **no** en `src/main/resources/static/branding/` (solo `logo-empresa.png`). El runtime de tests carga el del classpath (`target`).

**Conclusión imágenes:** el logo se renderiza a ~60 px pero se **decodifica y embebe a resolución completa 1414×2000**. Esto infla HTML (~1.7 MB), PDF (~2.75 MB) y trabajo dentro del renderer (decode + scale). **Hotspot #1 respaldado por números.**

QR y firma no dominan el tamaño del HTML frente al logo.

---

### 8. Análisis paginación

| Tipo | Páginas (audit) | page-break relevantes | Tablas | Imágenes data URI |
|---|---:|---|---:|---:|
| COTIZACION_COMERCIAL | **1** | footer/sign avoid (shell) | 16 | 1 (logo) |
| COTIZACION | **1** | idem + panel QR | 19 | 2 (logo+QR) |
| COMPROBANTE | **1** | sign-wrap + sign + footer avoid | 24 | 2 |
| ACTA_ENTREGA | **2** | idem + firma | 22 | 1 (+ firma vacía en audit) |

- Acta es el único que pasa a **2 páginas** en la muestra de auditoría (contenido + bloque firmas/legales).
- Aun así, `renderMs` de Acta (2ª gen ~3.8 s) es **similar** a Comprobante 1 página (~4.1 s) → el costo no se explica solo por número de páginas; el **documento base + imagen grande + layout tabular** pesan más.

---

### 9. Configuración OpenHTMLToPDF

**Versión:** `com.openhtmltopdf:openhtmltopdf-pdfbox:1.0.10`

| Opción | Estado actual |
|---|---|
| `useFastMode()` | **Habilitado** |
| Page size | LETTER 8.5×11 in (`useDefaultPageSize`) |
| Contenido | `withHtmlContent(html, classpath:/templates/documentos/servicios/)` |
| Fuentes | 27× `useFont(supplier → ByteArrayInputStream, family, weight, NORMAL, subset=false)` vía cache C.3.1 |
| URI resolver custom | **No** (base classpath por defecto) |
| SVG plugin | **No** |
| PDF/A / PDF/UA | **No** |
| Compresión explícita | **No** configurada (default PDFBox) |
| Interactive forms | **No** |

**Subfases internas:**

> OpenHTMLToPDF expone `builder.run()` como operación agregada y **no permite medir internamente** parse / layout / pagination / paint con la API pública actual sin instrumentar la librería.

`PdfGenTiming.renderMs` = tiempo exclusivo de `builder.run()`.

---

### 10. Métricas (benchmark controlado C.3.2)

Fuente: `PdfRenderAuditC32Test` — HTML preconstruido + 2× `htmlAPdf` por tipo  
(aisla `renderMs`; `htmlMs`/`logoMs`/`dataMs` = 0 porque vars ya estaban listas).

| Tipo | run | totalMs | fontsMs | renderMs | render% | pages | pdfBytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 1 | 7986 | 30 | **7625** | **95.5 %** | 1 | 2 753 944 |
| COTIZACION_COMERCIAL | 2 | 6714 | 0 | **6674** | **99.4 %** | 1 | 2 753 944 |
| COTIZACION | 1 | 4879 | 0 | **4842** | **99.2 %** | 1 | 2 757 587 |
| COTIZACION | 2 | 4769 | 0 | **4756** | **99.7 %** | 1 | 2 757 587 |
| COMPROBANTE | 1 | 4243 | 0 | **4210** | **99.2 %** | 1 | 2 761 262 |
| COMPROBANTE | 2 | 4097 | 0 | **4074** | **99.4 %** | 1 | 2 761 262 |
| ACTA | 1 | 4181 | 0 | **4163** | **99.6 %** | 2 | 2 759 761 |
| ACTA | 2 | 3791 | 0 | **3775** | **99.6 %** | 2 | 2 759 761 |

**Interpretación:** tras warm-up, `renderMs/totalMs ≈ 99 %` en este microbenchmark de render puro. En pipeline completo (C.3/C.3.1) el ratio era ~90 % porque aún hay data/html/QR/file/db; el orden de magnitud de `renderMs` es el mismo.

Todos los tipos comparten el **mismo orden** de coste (~3.8–6.7 s warm). Comercial aparece más alto en cold de la suite (primera del test).

---

### 11. Hotspots encontrados

| Hotspot | Evidencia | Impacto esperado | Riesgo | Dificultad |
|---|---|---|---|---|
| **Logo sobredimensionado** (1414×2000, 1.29 MB → data URI ~1.72 M chars; CSS 60×60) | htmlChars≈1.7 MB; logoHtmlChars≈1.72 M; pdf≈2.75 MB | **Alto** sobre parse/decode/scale dentro de `run()` y tamaño PDF | **Bajo** (asset dedicado PDF, mismo aspecto a 60 px) | Baja |
| **Tablas anidadas (depth 3, 16–24 tables)** | conteo HTML; layout Stitch; issues OH2PDF #551 | Medio–alto en layout | Medio (refactor visual) | Media–alta |
| **`page-break-inside: avoid` + `-fs-table-paginate: avoid` en firmas/footer** | CSS líneas 744–755, 871; known cost OH2PDF | Medio (sobre todo si crece a multipágina) | Medio (puede romper “firma junta”) | Media |
| **CSS shell grande + muchos `border-radius` / `overflow:hidden`** | 940 líneas CSS compartidas; ~18 border-radius | Bajo–medio | Medio (look & feel) | Media |
| **27 registros de fuente (15 TTF + aliases)** | `fontsCount=27`; Inter+JetBrains+DejaVu | Bajo en `fontsMs` (ya cacheado); posible coste residual en FontResolver al registrar | Medio (encoding/tiltes) | Media |
| **QR 180 px → 104 px** | `QrCodeService` DEFAULT_SIZE=180 | Bajo | Bajo | Baja |
| **Acta 2 páginas** | PDFBox page count | Bajo relativo (renderMs similar a 1 página) | — | — |

**No inventados / descartados como no presentes:** flexbox, grid, position fixed/absolute, SVG, box-shadow, opacity en QR.

---

### 12. Riesgo de cada hotspot (resumen)

1. **Logo asset** — riesgo funcional/visual mínimo si se mantiene proporción y nitidez a 60–120 CSS px.  
2. **Tablas / page-break** — riesgo visual alto; requiere pruebas pixel/PDF por tipo.  
3. **CSS radius/overflow** — riesgo visual medio.  
4. **Recorte de fuentes** — riesgo de tildes/fallback si se elimina DejaVu o un weight usado.  
5. **Cambio de motor** — fuera de alcance; no justificado aún sin intentar (1).

---

### 13. Opciones de optimización (solo propuesta — no implementadas)

| # | Opción | Impacto potencial | Riesgo | Reversible |
|---|---|---|---|---|
| A | Generar/usar logo PDF reducido (p.ej. ≤180–240 px ancho, PNG optimizado o JPEG) y apuntar `logo-classpath` | Alto | Bajo | Sí |
| B | Generar QR ya a 104–120 px | Bajo | Bajo | Sí |
| C | Auditar weights/aliases realmente usados en CSS; reducir registros | Bajo–medio | Medio | Sí |
| D | Relajar `page-break-inside: avoid` donde no sea crítico | Medio | Medio | Sí |
| E | Aplanar anidación de tablas (menos depth) | Medio–alto | Alto | Parcial |
| F | Simplificar CSS (menos radius/overflow) | Bajo–medio | Medio | Sí |
| G | Cambiar motor PDF | Incierto / alto esfuerzo | Muy alto | Difícil |

---

### 14. Recomendación priorizada (para C.3.3)

Criterios: menor riesgo funcional → menor riesgo visual → mayor impacto `renderMs` → facilidad de revertir.

**Prioridad 1 (C.3.3 inmediato):**  
**Optimizar el asset del logo corporativo para PDF** (Opción A).

- Evidencia cuantitativa más fuerte de este bloque.  
- No cambia plantillas ni contratos.  
- Reversible cambiando el archivo / property.  
- Debe medirse de nuevo con `PdfGenTiming` (antes/después, 2 gens).

**Prioridad 2:** QR a tamaño de presentación (B) — bajo esfuerzo, impacto menor.

**Prioridad 3 (solo si A no baja `renderMs` a un umbral aceptable):** experimento controlado de CSS page-break (D) en una sola plantilla, con comparación visual.

**No recomendar aún:** cambio de motor (G), ni refactor masivo de tablas (E) como primer paso.

---

### 15. Qué NO debe tocarse

- Cache C.3.1 (`PdfFontBytesCache`, logo HTML cache)
- Contratos REST / Presentar / `documentoGenerado`
- Endpoints, TX, @Async, colas
- Frontend / UX
- OpenHTMLToPDF versión/motor (en C.3.3 salvo decisión explícita posterior)
- Contenido legal / cláusulas (salvo encoding)
- Orden/family de fuentes sin auditoría de uso

---

### 16. Conclusión

1. Tras C.3.1, **`renderMs` sigue siendo ~95–99 % del costo de render puro**.  
2. Los cuatro documentos comparten el **mismo shell tabular + CSS pesado**; ninguno es un outlier extremo (Acta 2 págs. no explica por sí solo los 4 s).  
3. El hallazgo diferencial más claro es el **logo 1414×2000 / 1.29 MB embebido completo** frente a un display de **60 px**.  
4. OpenHTMLToPDF no permite descomponer `builder.run()`; la decisión de C.3.3 debe basarse en experimentos A/B medidos con la instrumentación existente.

---

### 17. Siguiente paso propuesto (C.3.3)

1. Preparar asset `LogoEmpresa` optimizado para PDF (sin cambiar layout HTML).  
2. Asegurar que el archivo vive en `src/main/resources` (hoy el grande solo se observó en `target/classes`).  
3. Re-ejecutar benchmark 2× por tipo; comparar `renderMs`, `totalMs`, tamaño PDF/HTML.  
4. Si el margen es insuficiente, planificar experimento B/D con criterios de aceptación visual.

---

### Anexo — Artefactos de auditoría

| Artefacto | Rol |
|---|---|
| `PdfRenderAuditC32Test` | Solo lectura: estructura HTML + 2 renders/tipo + pages |
| Logs `PDF-AUDIT` / `PDF-GEN` | Evidencia de esta corrida |
| Este documento | Entrega C.3.2 |

**Tests ejecutados:** `mvn -Dtest=PdfRenderAuditC32Test test` → BUILD SUCCESS.  
**Sin cambios** a plantillas, CSS, renderer, cache C.3.1 ni contratos.
