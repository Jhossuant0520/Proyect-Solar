# SOLVIX Backend — BLOQUE C.3.7
## Benchmark final y cierre de rendimiento de PDFs

**Fecha:** 2026-09-28  
**Alcance:** solo medición + documentación. **Sin cambios funcionales** a HTML, CSS, plantillas, OpenHTMLToPDF, fuentes, logo, QR, firma, cache, endpoints ni frontend.  
**Artefacto de medición:** `PdfFinalBenchmarkC37Test` (5 generaciones consecutivas × 4 tipos).

---

### 1. Objetivo

Fijar la **línea base final** de rendimiento de generación PDF tras las optimizaciones justificadas de la cadena C.3, y responder:

> ¿Existe evidencia suficiente para justificar otra optimización del renderer, o el estado actual debe convertirse en la línea base de rendimiento?

---

### 2. Estado final de C.3

| Bloque | Resultado |
|---|---|
| C.3 | Instrumentación `PdfGenTiming` (etapas INFO) |
| C.3.1 | Cache JVM fuentes + logo → `fontsMs`/`logoMs` warm ≈ 0 |
| C.3.2 | Auditoría: hotspot logo 1414×2000 / ~1.29 MB |
| C.3.3 | Asset `LogoEmpresa1-pdf.png` (170×240 / ~37 KB) → html/PDF/`renderMs` ↓ material |
| C.3.4 | page-break / `-fs-table-paginate` **sin** mejora consistente → restaurado |
| C.3.5 | Inventario tablas; candidato `cr-card-head-inner` |
| C.3.6 | A/B `cr-card-head-inner` **sin** mejora consistente → **descartar** / restaurado |
| **C.3.7** | Benchmark final → **línea base** |

Renderer actual: **OpenHTMLToPDF** (`useFastMode()`). Sin evidencia suficiente para cambio de motor.

---

### 3. Metodología

| Aspecto | Detalle |
|---|---|
| Ambiente | JVM local, perfil `test`, H2; Windows |
| Pipeline medido | `baseEmpresaVars` (logo) → placeholders (+ QR si aplica) → `construirHtmlDesdeClasspath` → `htmlAPdf` |
| No incluido | `fileMs` / `dbMs` de producción (no hay write/DB en este bench → 0) |
| Firma | Acta usa placeholder HTML (sin crop real) → `signatureMs` = 0 |
| Ejecuciones | **5** consecutivas por tipo, mismos datos |
| Cold | run 1 de cada tipo (`phase=cold`) |
| Warm | runs 2–5 (`phase=warm`) — **análisis principal** |
| Nota JVM | Solo el run 1 comercial paga carga física de fuentes (`fontsMs=44`); docs siguientes ya tienen cache C.3.1 caliente |

Reproducible con:

```text
mvn -Dtest=PdfFinalBenchmarkC37Test test
```

Logs: `PDF-C37 …` (html/pages/size) + `PDF-GEN type=*_C37 …` (etapas).

---

### 4. Datos de prueba

Datos sintéticos fijos (mismo set en las 5 runs):

| Campo | Valor típico |
|---|---|
| Cliente | Cliente Benchmark C37 / CC 123 |
| Líneas cotización | 2 (comercial) / 1 (OT) |
| QR | `http://localhost:4200/consulta/ot/tok-c37` (COT + COMP) |
| Acta firma | placeholder textual (sin PNG) |

Estructural (constante en todas las runs del tipo):

| Documento | htmlChars | logoHtmlChars | pdfBytes | páginas |
|---|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 75 923 | 49 407 | 1 742 985 | 1 |
| COTIZACION | 78 010 | 49 407 | 1 746 556 | 1 |
| COMPROBANTE_RECEPCION | 78 164 | 49 407 | 1 750 287 | 1 |
| ACTA_ENTREGA | 77 482 | 49 407 | 1 748 853 | 2 |

`logoBytes` físicos cacheados: **37 006** (asset C.3.3). `fontsCount` = **27**.

---

### 5. Resultados por ejecución

#### COTIZACION_COMERCIAL

| run | phase | totalMs | renderMs | htmlMs | fontsMs | logoMs | qrMs | sigMs | fileMs | dbMs |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | cold | 4296 | 3908 | 32 | **44** | **4** | 0 | 0 | 0 | 0 |
| 2 | warm | 2543 | 2481 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | warm | 1736 | 1687 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | warm | 2306 | 2255 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | warm | 1707 | 1669 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |

#### COTIZACION (OT)

| run | phase | totalMs | renderMs | htmlMs | fontsMs | logoMs | qrMs | sigMs | fileMs | dbMs |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | cold* | 1972 | 1824 | 3 | 0 | 0 | 116 | 0 | 0 | 0 |
| 2 | warm | 1776 | 1717 | 4 | 0 | 0 | 29 | 0 | 0 | 0 |
| 3 | warm | 1629 | 1577 | 3 | 0 | 0 | 22 | 0 | 0 | 0 |
| 4 | warm | 1767 | 1718 | 3 | 0 | 0 | 19 | 0 | 0 | 0 |
| 5 | warm | 1645 | 1588 | 4 | 0 | 0 | 15 | 0 | 0 | 0 |

\*Cold de serie; fuentes ya calientes desde comercial. `qrMs` 116 en 1ª QR del tipo.

#### COMPROBANTE_RECEPCION

| run | phase | totalMs | renderMs | htmlMs | fontsMs | logoMs | qrMs | sigMs | fileMs | dbMs |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | cold* | 1860 | 1787 | 21 | 0 | 0 | 36 | 0 | 0 | 0 |
| 2 | warm | 1899 | 1832 | 3 | 0 | 0 | 11 | 0 | 0 | 0 |
| 3 | warm | 1783 | 1747 | 3 | 0 | 0 | 15 | 0 | 0 | 0 |
| 4 | warm | 1499 | 1470 | 4 | 0 | 0 | 11 | 0 | 0 | 0 |
| 5 | warm | 1732 | 1695 | 5 | 0 | 0 | 15 | 0 | 0 | 0 |

#### ACTA_ENTREGA

| run | phase | totalMs | renderMs | htmlMs | fontsMs | logoMs | qrMs | sigMs | fileMs | dbMs |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | cold* | 2013 | 1986 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | warm | 1633 | 1581 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | warm | 1679 | 1660 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | warm | 1750 | 1726 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | warm | 1610 | 1592 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |

---

### 6. Estadísticas (warm = runs 2–5)

| Documento | Warm min | Warm median | Warm avg | Warm max | Warm σ (total) | render median | Páginas |
|-----------|---------:|------------:|---------:|---------:|---------------:|--------------:|--------:|
| COTIZACION_COMERCIAL | 1707 | **2021** | 2073 | 2543 | 361 | **1971** | 1 |
| COTIZACION | 1629 | **1706** | 1704 | 1776 | 68 | **1652** | 1 |
| COMPROBANTE_RECEPCION | 1499 | **1758** | 1728 | 1899 | 146 | **1721** | 1 |
| ACTA_ENTREGA | 1610 | **1656** | 1668 | 1750 | 53 | **1626** | 2 |

`renderMs` warm (detalle):

| Documento | min | median | avg | max | σ |
|---|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 1669 | 1971 | 2023 | 2481 | 354 |
| COTIZACION | 1577 | 1652 | 1650 | 1718 | 68 |
| COMPROBANTE | 1470 | 1721 | 1686 | 1832 | 134 |
| ACTA | 1581 | 1626 | 1640 | 1726 | 58 |

---

### 7. Comparación histórica

Solo puntos metodológicamente análogos en **`renderMs` warm** (misma familia de pipeline OpenHTMLToPDF / datos sintéticos). No se mezclan runs individuales como serie continua.

| Hito | Método | COM | COT | COMP | ACTA |
|---|---|---:|---:|---:|---:|
| C.3 inicial (2ª gen, servicio) | full + logo grande | ~3467 | ~3103 | ~4k+ | ~4.7k |
| Post C.3.1 (2ª gen, servicio) | full + logo grande + cache | 3928 | 4090 | ~4k | ~4744 |
| Post C.3.3 (2ª gen, audit) | `htmlAPdf` + logo PDF | **1844** | **1789** | **1845** | **2197** |
| **C.3.7 mediana warm** | logo+html+pdf (5 runs) | **1971** | **1652** | **1721** | **1626** |

Lectura:

- El salto dominante documentado sigue siendo **C.3.3** (logo).
- C.3.1 eliminó coste repetido de I/O; no bajó `renderMs`.
- C.3.7 confirma un régimen estable ~**1.6–2.0 s** de `renderMs` mediana warm (varianza máquina/GC incluida).
- Diferencias C.3.3 ↔ C.3.7 son del orden del ruido ya visto en C.3.4/C.3.6; no indican regresiones nuevas.

Tamaños (referencia C.3.3 → C.3.7, estable):

| Métrica | Pre-C.3.3 | C.3.7 |
|---|---:|---:|
| htmlChars comercial | ~1.75 MB | ~76 KB |
| logoHtmlChars | ~1.72 MB | ~49 KB |
| pdfBytes comercial | ~2.75 MB | ~1.74 MB |

---

### 8. Interpretación

1. **Documento más pesado (mediana warm total / render):** `COTIZACION_COMERCIAL` (2021 / 1971 ms). También el de **mayor variabilidad** (σ total ≈ 361 ms).
2. **Más estable:** `ACTA_ENTREGA` y `COTIZACION` (σ ≈ 50–70 ms) pese a que el acta tiene 2 páginas.
3. **% de `totalMs` atribuible a `renderMs` (mediana warm):** ≈ **97–98 %** en todos los tipos. El residual no-render (template/html/qr) es marginal en warm.
4. **fonts / logo post C.3.1 + C.3.3 (warm):** `fontsMs = 0`, `logoMs = 0` en todas las runs warm. En cold comercial: fonts 44 ms + logo 4 ms (~1 % del cold total). **El I/O de assets ya no es el cuello.**
5. **QR warm:** ~11–29 ms (COT/COMP); no domina.
6. No hay ranking “mejor/peor UX” fuera de este contexto técnico: los cuatro documentos están en la misma banda de ~1.5–2.5 s warm.

---

### 9. Cuellos de botella restantes

| Factor | Evidencia | Acción justificada hoy |
|---|---|---|
| `builder.run()` OpenHTMLToPDF | 97 %+ del total warm | Sin micro-fix CSS/HTML con beneficio demostrado (C.3.4, C.3.6) |
| Tipografías embebidas (PDF ~1.74 MB) | peso binario residual | Posible auditoría tipográfica futura; no medida aquí |
| Layout tabular Stitch | C.3.5 | Experimentos aislados no ganaron; rediseño mayor = alto riesgo |
| Cambio de renderer | Sin PoC comparativo | **No justificado** con la evidencia actual |
| file/db en producción | no medidos en C.3.7 | Esperados pequeños vs render (C.3 histórico) |

---

### 10. Riesgos de seguir optimizando

| Camino | Riesgo | Beneficio esperado |
|---|---|---|
| Más experimentos CSS/page-break/tablas aisladas | Regresión visual; ruido de medición | Bajo (C.3.4/C.3.6 negativos) |
| Reducir set de fuentes | Tipografía rota / fallback | Medio; requiere auditoría |
| Cambiar motor PDF | Alto (layout, fuentes, QR, firma) | Desconocido sin PoC largo |
| Cachear PDF generado | Invalidación / versiones | Fuera de alcance C.3; no ataca `renderMs` de Presentar fresca |

Seguir optimizando **sin** hipótesis nueva y medible aumenta complejidad sin retorno demostrado.

---

### 11. Decisión técnica

Con base en la **mediana warm** de C.3.7:

| Pregunta | Respuesta |
|---|---|
| Rendimiento actual observado | ~**1.65–2.05 s** total warm (mediana por tipo); `renderMs` ≈ mismo orden |
| ¿Cuello residual relevante? | Sí: **OpenHTMLToPDF `renderMs`**, pero **estable** tras C.3.3 |
| ¿Evidencia para otra optimización ahora? | **No.** C.3.4 y C.3.6 no mejoraron; no hay candidato de bajo riesgo con beneficio demostrado |
| ¿Cambiar renderer? | **No** con la evidencia actual |

**Decisión de cierre C.3:**  
el estado post-C.3.3 (con C.3.1 vigente y experimentos C.3.4/C.3.6 descartados) **se convierte en la línea base de rendimiento PDF**. Nuevas iniciativas requieren hipótesis nueva, PoC medido y umbral de negocio explícito — fuera de este bloque.

---

### 12. Línea base final

**Identificador:** `C.3.7 / 2026-09-28` · `PdfFinalBenchmarkC37Test` · warm = runs 2–5

| Documento | Warm min | Warm median | Warm avg | Warm max | render median | Páginas |
|-----------|---------:|------------:|---------:|---------:|--------------:|--------:|
| COTIZACION_COMERCIAL | 1707 | **2021** | 2073 | 2543 | **1971** | 1 |
| COTIZACION | 1629 | **1706** | 1704 | 1776 | **1652** | 1 |
| COMPROBANTE_RECEPCION | 1499 | **1758** | 1728 | 1899 | **1721** | 1 |
| ACTA_ENTREGA | 1610 | **1656** | 1668 | 1750 | **1626** | 2 |

**Anclas estructurales:** htmlChars ~76–78 KB · logoHtmlChars ~49 KB · pdfBytes ~1.74–1.75 MB · fonts/logo warm = 0 · render ≈ 97 %+ del total.

**Respuesta final:** no hay evidencia suficiente para justificar otra optimización del renderer ahora; **este estado es la línea base**.

---

### Validación

```text
mvn -Dtest=PdfFinalBenchmarkC37Test test          → BUILD SUCCESS
mvn -Dtest=PdfRenderAuditC32Test,PdfLogoAssetC33Test,
       PdfFontBytesCacheTest,PdfLogoCacheTest,
       DocumentoPlantillaAutoriaTest,PdfFinalBenchmarkC37Test test
mvn -DskipTests compile                           → BUILD SUCCESS
```

Código funcional de producción: **sin cambios** en este bloque (solo test de medición + docs).
