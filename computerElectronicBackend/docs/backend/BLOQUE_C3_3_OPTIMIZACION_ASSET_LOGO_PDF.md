# SOLVIX Backend — BLOQUE C.3.3
## Optimización del asset del logo en PDFs

**Fecha:** 2026-09-28  
**Alcance:** únicamente asset de logo para PDFs + property. Sin cambios a OpenHTMLToPDF, HTML/CSS/plantillas, QR, firma, cache C.3.1 ni frontend.

---

### 1. Objetivo

Reducir el tamaño del logo embebido como data URI en los PDFs para bajar:
- `htmlChars` / `logoHtmlChars`
- bytes procesados por el renderer
- tamaño del PDF
- potencialmente `renderMs`

---

### 2. Evidencia C.3.2

| Métrica | Valor |
|---|---|
| Logo | `LogoEmpresa1.png` 1414×2000, **1 290 484 bytes** |
| Display CSS | máx. **60×60** px |
| `htmlChars` | ~1.75 MB |
| `logoHtmlChars` | ~1.72 MB (**~98 %** del HTML) |
| PDF | ~2.75 MB |
| `renderMs` warm | ~3.8–6.7 s (~95–99 % del total en audit) |

---

### 3. Problema detectado

El PDF embebe el PNG **completo** en Base64. El renderer escala a ~60 px, pero primero parsea/decodifica ~1.29 MB de imagen por documento.

---

### 4. Asset original

| Campo | Valor |
|---|---|
| Path | `static/branding/LogoEmpresa1.png` |
| Resolución | 1414 × 2000 |
| Bytes | 1 290 484 |
| Formato | PNG |
| Uso | **Conservado** (no destruido; no usado por PDFs tras C.3.3) |

Nota: el original se restauró también bajo `src/main/resources/static/branding/` (antes solo estaba en `target/classes`).

---

### 5. Asset optimizado

| Campo | Valor |
|---|---|
| Path | `static/branding/LogoEmpresa1-pdf.png` |
| Resolución | **170 × 240** (lado mayor = 240 px) |
| Bytes | **37 006** |
| Formato | PNG (`89 50 4E 47…`) |
| Aspect ratio | 170/240 = 0.7083 vs original 1414/2000 = 0.7070 (Δ < 0.2 %) |
| Reducción bytes | **97.1 %** |

Criterio de dimensionado: bounding box **240 px** en el lado mayor (altura), ~4× el display CSS de 60 px para calidad de impresión LETTER sin conservar 2000 px.

---

### 6. Estrategia

1. Generar asset dedicado PDF (HighQualityBicubic, ARGB, transparencia).
2. Apuntar `solvix.empresa.logo-classpath` al asset PDF.
3. No tocar plantillas, CSS, ni `DocumentoPlantillaSupport` (sigue leyendo `empresa.getLogoClasspath()` + cache C.3.1).
4. Medir antes/después con `PdfRenderAuditC32Test` + `PdfGenTiming`.

Flujo (sin cambios arquitectónicos):

```
LogoEmpresa1-pdf.png
  → PdfLogo cache (C.3.1)
  → Base64 / data URI
  → LOGO_HTML / companyVars
  → plantilla HTML
  → OpenHTMLToPDF
```

---

### 7. Cambios realizados

| Archivo | Cambio |
|---|---|
| `static/branding/LogoEmpresa1.png` | Original restaurado en `src` (referencia) |
| `static/branding/LogoEmpresa1-pdf.png` | **Nuevo** asset PDF |
| `application.properties` | `logo-classpath=static/branding/LogoEmpresa1-pdf.png` |
| `EmpresaDocumentoProperties` | default → `LogoEmpresa1-pdf.png` |
| `PdfLogoAssetC33Test` | existencia, PNG, data URI liviano, PDF + cache |
| `PdfRenderAuditC32Test` | asserts `htmlChars`/`logoHtmlChars` post-C.3.3 |
| Este documento | evidencia |

**No modificado:** HtmlToPdfService, CSS, HTML, QR, firma, PdfFontBytesCache, endpoints, frontend.

---

### 8. Compatibilidad

- Formato: PNG (mismo que antes) → OpenHTMLToPDF estable.
- Data URI: `data:image/png;base64,…` sin cambio de contrato.
- Transparencia: canal alpha preservado en export ARGB.
- Sin WebP/AVIF/SVG.

---

### 9. Validación visual

- Aspect ratio preservado (ver §5).
- CSS sin cambios → misma caja ~60×60 / posición.
- Preview generado: `target/c33-visual-samples/LogoEmpresa1-pdf-preview.png`.
- PDF de cada tipo generados en audit (1 pág. comercial/OT/comprobante; 2 pág. acta) sin error.
- Revisión manual recomendada en UI: Presentar comercial + OT + comprobante + acta.

Criterios esperados: sin deformación, sin pixelación apreciable a 60 CSS px, sin cambio de layout.

---

### 10. Benchmark antes / después

Misma metodología: `PdfRenderAuditC32Test` (HTML expandido + 2× `htmlAPdf`).

#### Tamaños estructurales

| Métrica | Antes (C.3.2) | Después (C.3.3) | Δ |
|---|---:|---:|---:|
| logo bytes | 1 290 484 | 37 006 | **−97.1 %** |
| logoHtmlChars (comercial) | 1 720 711 | 49 407 | **−97.1 %** |
| htmlChars (comercial) | 1 747 240 | 75 936 | **−95.7 %** |
| pdfBytes (comercial) | 2 753 944 | 1 743 017 | **−36.7 %** |
| pages | 1 / 1 / 1 / 2 | 1 / 1 / 1 / 2 | sin cambio |

#### `renderMs` (2ª generación warm)

| Tipo | Antes | Después | Δ |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 6674 | **1844** | **−72 %** |
| COTIZACION | 4756 | **1789** | **−62 %** |
| COMPROBANTE | 4074 | **1845** | **−55 %** |
| ACTA_ENTREGA | 3775 | **2197** | **−42 %** |

#### `totalMs` (2ª generación)

| Tipo | Antes | Después | Δ |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 6714 | **1922** | **−71 %** |
| COTIZACION | 4769 | **1807** | **−62 %** |
| COMPROBANTE | 4097 | **1861** | **−55 %** |
| ACTA | 3791 | **2206** | **−42 %** |

`fontsMs` / `logoMs` siguen en 0 (cache C.3.1).  
`fontsCount` = 27 (sin cambio).

---

### 11. Impacto en renderMs

La reducción del logo **sí** bajó `renderMs` de forma material (≈ 42–72 % en 2ª gen), aunque no en la misma proporción que los bytes del asset (−97 %).  
El resto (~1.8–2.2 s) sigue atribuible a layout tabular / OpenHTMLToPDF (C.3.2).

---

### 12. Impacto en tamaño HTML

- `htmlChars`: ~1.75 MB → **~76 KB** (−95.7 %).
- `logoHtmlChars`: ~1.72 MB → **~49 KB** (−97.1 %).

---

### 13. Impacto en tamaño PDF

- ~2.75 MB → **~1.74 MB** (−37 % aprox.).
- El PDF aún embebe tipografías Unicode (Inter / JetBrains / DejaVu); el logo ya no domina el HTML, pero las fuentes siguen pesando en el binario.

---

### 14. Limitaciones

- Optimización aislada al logo PDF; QR / CSS / tablas no tocados.
- `renderMs` residual ~2 s sigue siendo relevante para UX de Presentar.
- Si alguien cambia `logo-classpath` de vuelta al original, se reintroduce el hotspot.
- El preview visual en este bloque es del asset; la revisión humana del PDF en UI sigue siendo recomendable.

---

### 15. Conclusión

C.3.3 cumple el criterio de aceptación:

- PDFs usan `LogoEmpresa1-pdf.png`
- Original intacto
- Cache C.3.1 operativo
- HTML/PDF mucho más livianos
- `renderMs` mejora medible y atribuible al asset
- Sin cambios a OpenHTMLToPDF / CSS / plantillas estructurales

---

### 16. Siguiente decisión

Opciones residuales (prioridad C.3.2):

1. **QR a tamaño de presentación** (bajo riesgo, bajo impacto relativo ahora).
2. Experimentos CSS `page-break-inside` / tablas (mayor riesgo visual).
3. Evaluar si ~2 s de `renderMs` es aceptable de negocio antes de más cambios.

**Recomendación:** desplegar C.3.3; medir en entorno real Presentar; decidir C.3.4 solo si el umbral UX aún no se cumple.

---

### Validación ejecutada

```
mvn -Dtest=PdfLogoAssetC33Test,PdfLogoCacheTest,PdfFontBytesCacheTest,
       PdfRenderAuditC32Test,PdfResourceCacheIntegrationTest test
→ BUILD SUCCESS (13 tests)
```
