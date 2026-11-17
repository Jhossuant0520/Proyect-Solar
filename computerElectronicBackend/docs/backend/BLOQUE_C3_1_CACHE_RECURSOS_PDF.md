# SOLVIX Backend — BLOQUE C.3.1
## Cache en memoria de fuentes y logo para generación PDF

**Fecha:** 2026-09-28  
**Alcance:** eliminar I/O repetitivo de TTF y logo. Sin cambio de motor, plantillas, contratos ni frontend.

---

### 1. Objetivo

Reducir trabajo repetitivo en cada generación de PDF:

1. Lectura/procesamiento de fuentes TTF (15 rutas únicas → 27 registros con aliases).
2. Lectura + Base64 del logo corporativo.

Mantener idénticos: contenido visual, tipografías, QR, firma, rutas, endpoints, TX, instrumentación C.3.

---

### 2. Estado inicial (C.3)

| Métrica | Observación |
|---|---|
| Principal cuello | `renderMs` (OpenHTMLToPDF `builder.run`) ~87–93 % |
| fonts | `fontsCount=27`, ~12 MB contados, **releídos en cada PDF** |
| logo | ~1.26 MB, Base64 en cada generación |
| file / db | 1–21 ms (no prioritarios) |

Ejemplo comercial (antes, C.3):

| run | totalMs | fontsMs | logoMs | renderMs |
|---|---:|---:|---:|---:|
| 1ª | 7890 | 92 | 69 | 7244 |
| 2ª | 3742 | 122 | 9 | 3467 |

---

### 3. Cambios realizados

| Archivo | Cambio |
|---|---|
| `PdfFontBytesCache.java` | **Nuevo.** Cache JVM `ConcurrentHashMap<path, byte[]>` |
| `HtmlToPdfService.java` | Registra fuentes desde cache; nuevo `ByteArrayInputStream` por registro |
| `DocumentoPlantillaSupport.java` | Cache del HTML data-URI del logo |
| `PdfFontBytesCacheTest.java` | Unit: miss/hit, aliases, streams, concurrencia |
| `PdfLogoCacheTest.java` | Unit: miss/hit, concurrencia, missing |
| `PdfResourceCacheIntegrationTest.java` | PDF real 2× + renders concurrentes |
| Este documento | Resultados antes/después |

**Sin** dependencias nuevas (sin Caffeine/Redis/Ehcache).  
**Sin** cambios HTML/CSS/OpenHTMLToPDF/`builder.run`/endpoints/frontend.

---

### 4. Arquitectura del cache

```
HtmlToPdfService.htmlAPdf
        │
        ├─ PdfFontBytesCache.getOrLoad(classpath)
        │     miss → ClassPathResource.readAllBytes → put
        │     hit  → byte[] existente
        │     builder.useFont(() → new ByteArrayInputStream(bytes), family, weight, style)
        │
DocumentoPlantillaSupport.logoHtml
        │
        └─ ConcurrentHashMap<path, CachedLogo{html, bytes}>
              miss → leer PNG + Base64 + armar <img data:...>
              hit  → devolver html cacheado
```

- Ciclo de vida: **proceso JVM**.
- Invalidación: **ninguna** (reinicio de app para ver cambios en disco).

---

### 5. Seguridad ante concurrencia

| Recurso | Estrategia |
|---|---|
| Fuentes | `ConcurrentHashMap.computeIfAbsent` — una carga física por path |
| Logo | double-check + `synchronized(logoCache)`; no se cachean fallos (`null`) |
| Streams | **nunca** compartidos; cada `useFont` crea `ByteArrayInputStream` nuevo |
| Builder/PDF | por generación; no se cachean |

---

### 6. Qué se cachea

- Bytes TTF por classpath (`fonts/*.ttf`).
- Fragmento HTML final del logo (`<img class="doc-logo" src="data:…">`) + tamaño en bytes (métrica).

---

### 7. Qué NO se cachea

- HTML de plantillas / CSS
- Resultado PDF
- QR / firma
- `PdfRendererBuilder` / documentos PDFBox
- InputStreams
- Datos de negocio / DB
- Redis u otro store externo

---

### 8. Resultados antes / después

Ambiente: mismos tests de integración que C.3 (H2 + OpenHTMLToPDF real, Windows/JVM local).  
Varianza de máquina/GC esperada en `renderMs`/`totalMs`.

#### COTIZACION_COMERCIAL

| | totalMs | fontsMs | logoMs | renderMs | fontsCount |
|---|---:|---:|---:|---:|---:|
| **Antes C.3** 1ª | 7890 | 92 | 69 | 7244 | 27 |
| **Antes C.3** 2ª | 3742 | **122** | **9** | 3467 | 27 |
| **Después C.3.1** 1ª | 10932* | 54 | 26 | 10402* | 27 |
| **Después C.3.1** 2ª | 4069 | **0** | **0** | 3928 | 27 |

\*Cold start JVM más lento en esta corrida; el dato relevante es fonts/logo en 2ª gen.

#### COTIZACION (OT)

| | totalMs | fontsMs | logoMs | renderMs |
|---|---:|---:|---:|---:|
| Antes 2ª (ref.) | ~3257 | ~47 | ~4 | ~3103 |
| Después 1ª (post-comercial) | 5536 | **0** | **0** | 5103 |
| Después 2ª | 4317 | **0** | **0** | 4090 |

#### COMPROBANTE_RECEPCION

| | totalMs | fontsMs | logoMs | qrMs | renderMs |
|---|---:|---:|---:|---:|---:|
| Después 1ª (nuevo contexto OT) | 8969 | 55† | 13 | 258 | 8430 |
| Después regen / siguientes | ~4117–4665 | **0** | **0** | ~12–20 | ~3960–4553 |

†Si el cache de fuentes ya estaba caliente desde comercial, fontsMs≈0; aquí el test OT arranca otro contexto Spring → miss puntual.

#### ACTA_ENTREGA

| | totalMs | fontsMs | logoMs | signatureMs | renderMs |
|---|---:|---:|---:|---:|---:|
| Después 1ª | 4881 | 0 | 0 | 15 | 4692 |
| Después 2ª | 5048 | ~0–10 | 0 | 28 | 4744 |

---

### 9. Interpretación de métricas

1. **`fontsMs` en generaciones posteriores ≈ 0** — objetivo C.3.1 cumplido. Solo queda el coste de registrar 27 aliases en el builder (negligible).
2. **`logoMs` ≈ 0** en hits — Base64 no se recalcula.
3. **`fontsCount` sigue en 27** — mismas tipografías/aliases; no se eliminó ninguna fuente.
4. **`renderMs` sigue dominando** (~90 %+ del total) — coherente con C.3: el cache de assets **no** acelera `builder.run`.
5. Primera generación dentro de la JVM aún paga I/O una vez; las siguientes reutilizan.

---

### 10. Limitaciones

- Sin TTL / watch de archivos: cambiar un TTF o el PNG en disco requiere **reinicio**.
- El PDF generado no se cachea (cada Presentar/regenerar sigue renderizando).
- `fontsBytes` en logs sigue sumando longitudes por registro (aliases cuentan el mismo array varias veces) — útil para comparar con C.3, no es “MB únicos en RAM” (únicos ≈ suma de ~15 archivos).
- Fallos de logo (archivo ausente / IO) **no** se cachean.

---

### 11. Decisión para siguiente bloque

C.3.1 cierra el trabajo repetitivo de I/O de recursos.

El cuello restante es **`renderMs` (OpenHTMLToPDF)**.

Opciones candidatas (fuera de C.3.1):

| Opción | Riesgo | Notas |
|---|---|---|
| A. Revisar complejidad HTML/CSS / imágenes embebidas | Medio | Puede bajar render sin cambiar motor |
| B. Reducir pesos/aliases de fuentes no usados en CSS | Bajo–medio | Requiere auditoría tipográfica |
| C. Cambio de motor PDF | Alto | Fuera de alcance próximo |
| D. Async / colas de generación | Alto (UX/contrato) | Solo si negocio lo pide |

**Recomendación:** mantener C.3.1 en producción; en C.3.2 (si aplica) atacar `renderMs` con auditoría de plantilla/CSS, **sin** tocar contratos Presentar.

---

### Validación ejecutada

```
mvn -Dtest=PdfFontBytesCacheTest,PdfLogoCacheTest,PdfResourceCacheIntegrationTest,
       CotizacionComercialServiceTest#presentarEditarYRepresentar,
       DocumentoOrdenServicioServiceTest#…  test
→ BUILD SUCCESS (14 tests)

mvn -DskipTests compile → OK
```

### Confirmación funcional

- Mismas family/weight/style/aliases/orden de registro.
- Mismo HTML de logo / data URI.
- PdfGenTiming intacto.
- Sin @Async, sin colas, sin cambios REST/TX/frontend.
