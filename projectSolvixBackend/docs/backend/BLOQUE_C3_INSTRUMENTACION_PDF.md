# SOLVIX Backend — BLOQUE C.3
## Instrumentación de rendimiento PDF (solo medición)

**Fecha:** 2026-09-28  
**Alcance:** logs de timing. Sin cache, sin async, sin cambios funcionales.  
**Decisión:** MEDIR → REPORTAR → DECIDIR (no optimizar en C.3).

---

### A. Archivos modificados / creados

| Archivo | Rol |
|---|---|
| `PdfGenTiming.java` | Helper ThreadLocal + `System.nanoTime()` |
| `HtmlToPdfService.java` | template / html / fonts / render |
| `DocumentoPlantillaSupport.java` | companyVars + logo |
| `DocumentoPdfStorageService.java` | fileWrite |
| `QrCodeService.java` | qr |
| `DocumentoCotizacionComercialService.java` | orquestación COTIZACION_COMERCIAL + data/db |
| `DocumentoOrdenServicioService.java` | COTIZACION / COMPROBANTE / ACTA + firma + db |
| `CotizacionComercialService.java` | correlacion `PRESENTAR_COTIZACION_COMERCIAL` |
| `docs/backend/BLOQUE_C3_INSTRUMENTACION_PDF.md` | este documento |

### B. Cómo se midió

1. `PdfGenTiming.start(type, id)` en el orquestador (try-with-resources).
2. Etapas anidadas leen `PdfGenTiming.current()` y acumulan ms.
3. Reloj: `System.nanoTime()` → milisegundos.
4. **INFO:** una línea resumen por PDF.
5. **DEBUG:** cada etapa (`data-loaded`, `fonts-loaded`, …).
6. Generaciones vía tests de integración (H2 + OpenHTMLToPDF real), **2+ veces** por tipo.

```
logging.level.com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.PdfGenTiming=DEBUG
```

### C. Ejemplo de logs (INFO)

```
PDF-GEN correlate=PRESENTAR_COTIZACION_COMERCIAL id=1
PDF-GEN type=COTIZACION_COMERCIAL id=1 gen=67e1e7d7 totalMs=7890 dataMs=2 companyVarsMs=2 templateMs=24 htmlMs=178 fontsMs=92 fontsCount=27 fontsBytes=12434816 logoMs=69 logoBytes=1290484 qrMs=0 signatureMs=0 renderMs=7244 fileMs=16 dbMs=21
```

### D. Resultados reales (ms)

Ambiente: tests Spring Boot en Windows / JVM local (no producción).  
`fontsCount=27` en todas las generaciones (confirma hipótesis 15–27 registros TTF; ~15 archivos físicos + aliases).  
`fontsBytes` suma lecturas por registro (aliases re-leen el mismo TTF → ~12.4 MB contados).

#### COTIZACION_COMERCIAL

| run | total | data | company | template | html | fonts | logo | render | file | db |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1ª (cold) | **7890** | 2 | 2 | 24 | 178 | 92 | 69 | **7244** | 16 | 21 |
| 2ª (warm) | **3742** | 8 | 0 | 19 | 61 | 122 | 9 | **3467** | 19 | 5 |

- qr / signature: N/A (0)

#### COTIZACION (OT)

| run | total | data | html | fonts | logo | qr | render | file | db |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1ª | **3526** | 6 | 71 | 70 | 4 | 26 | **3264** | 13 | 3 |
| 2ª | **3257** | 1 | 50 | 47 | 4 | 19 | **3103** | 8 | 1 |

#### COMPROBANTE_RECEPCION

| run | total | html | fonts | logo | qr | render | file | db |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1ª (sesión OT) | **3573** | 47 | 53 | 28 | **219** | **3121** | 12 | 5 |
| 2ª | **3254** | 66 | 61 | 4 | 21 | **3064** | 10 | 2 |
| 3ª (regen) | **2943** | 47 | 46 | 6 | 12 | **2787** | 13 | 2 |

#### ACTA_ENTREGA

| run | total | data | html | fonts | logo | signature | render | file | db |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1ª | **3242** | 10 | 57 | 38 | 5 | 19 | **3048** | 12 | 1 |
| 2ª (regen) | **3194** | 4 | 52 | 43 | 3 | 9 | **3026** | 20 | 3 |

### E. Principal cuello

**OpenHTMLToPDF `builder.run()` (`renderMs`)**  
~87–92 % del total en todas las tipologías.

Ej. comercial cold: 7244 / 7890 ≈ **92 %**.  
Warm: 3467 / 3742 ≈ **93 %**.

### F. Segundo cuello

Depende del run:

1. **Carga de fuentes** (`fontsMs` 40–120 ms, `fontsCount=27`, ~12 MB leídos/contados) — coste **repetido en cada PDF**.
2. En cold comercial: **html** (178 ms) y **logo** (69 ms, ~1.26 MB).
3. En 1er comprobante de sesión: **QR** cold (219 ms); luego cae a ~12–26 ms.

Persistencia (`dbMs` 1–21) y filesystem (`fileMs` 8–20) **no son significativos**.

### G. Primera vs repetida

| Documento | 1ª total | 2ª total | Δ |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 7890 | 3742 | **−53 %** (JVM/OpenHTML cold start) |
| COTIZACION | 3526 | 3257 | −8 % |
| COMPROBANTE | 3573 → 2943 | | −18 % aprox. |
| ACTA | 3242 | 3194 | −1.5 % |

Tras el cold start de la JVM, el coste **estable** ronda **2.9–3.7 s**, dominado por render.  
Las fuentes **siguen costando** en cada generación (no hay cache → beneficio claro en C.3.1).

### H. Recomendación C.3.1 (solo decisión; no implementado aquí)

Prioridad sugerida:

1. **Cache de fuentes en memoria** (bytes TTF + registro una vez / reuso de supplier) — elimina ~27 lecturas classpath y reduce ruido en `builder` setup. Bajo riesgo, alto impacto relativo al setup.
2. **Cache de logo Base64** (bytes ~1.26 MB fijos) — pequeño en ms pero evita I/O + encode repetido.
3. **Revisar plantilla/CSS/complejidad OpenHTML** solo si tras (1)+(2) `renderMs` sigue >2.5 s — el renderer sigue siendo el 90 %+; cache de assets no lo reduce linealmente, pero baja overhead y puede estabilizar.

**No** como C.3.1 inmediato: async/colas, cambio de motor PDF, cambios de contrato Presentar.

### I. Confirmación funcional

- Sin cache de fuentes/logo.
- Sin cambio de OpenHTMLToPDF / TX / @Async / endpoints / estados.
- Contratos C.2 intactos (`documentoGenerado`).
- Timing: solo logs; IDs `gen=` no se persisten en DB.
- QR medido solo donde aplica; comercial `qrMs=0`.
- Firma solo en ACTA.

### J. Tests / build ejecutados

```
mvn -DskipTests compile                          → OK
mvn -Dtest=CotizacionComercialServiceTest#presentarEditarYRepresentar,
       DocumentoOrdenServicioServiceTest#generarComprobanteRecepcion
       +representarCotizacionGeneraNuevaVersionPdf
       +actaEntregaYRegenerar
       +otCreadaDocumentoPuedeNoEstarYRegenerarCreaVersion
   test                                          → BUILD SUCCESS (5 tests)
```

---

### Estrategia de log

| Nivel | Contenido |
|---|---|
| INFO | 1 línea: `totalMs`, `renderMs`, `fontsMs`, `fileMs`, `dbMs`, … |
| DEBUG | etapas `+XX ms` + start/total detalle firma |
| correlate | `PDF-GEN correlate=PRESENTAR_COTIZACION_COMERCIAL id=` (INFO, servicio Presentar) |

---

### Seguimiento

**C.3.1 implementado** (cache JVM fuentes + logo): ver `BLOQUE_C3_1_CACHE_RECURSOS_PDF.md`.  
Tras C.3.1, `fontsMs`/`logoMs` en 2ª+ generación ≈ 0; el cuello restante sigue siendo `renderMs`.

**C.3.2 auditado** (sin optimizaciones): ver `BLOQUE_C3_2_AUDITORIA_RENDER_PDF.md`.  
Hotspot principal respaldado: logo 1414×2000 / ~1.29 MB embebido vs display 60 px.

**C.3.3 implementado:** ver `BLOQUE_C3_3_OPTIMIZACION_ASSET_LOGO_PDF.md`.  
Asset `LogoEmpresa1-pdf.png` (170×240, ~37 KB); `renderMs` warm −42 % a −72 %; htmlChars −96 %.

**C.3.4 auditado:** ver `BLOQUE_C3_4_AUDITORIA_PAGINACION_PDF.md`.  
Exp. page-break / `-fs-table-paginate` sin mejora consistente → **mantener reglas**; CSS restaurado.

**C.3.5 auditado:** ver `BLOQUE_C3_5_AUDITORIA_ESTRUCTURA_HTML_PDF.md`.  
Mayoría tablas = layout; candidato aislado: `cr-card-head-inner`.

**C.3.6 experimentado:** ver `BLOQUE_C3_6_EXPERIMENTO_CARD_HEAD_PDF.md`.  
Sustituir `table.cr-card-head-inner` por `div`+`inline-block` **sin** mejora consistente de `renderMs` → **descartar**; HTML/CSS restaurados.

**C.3.7 cerrado:** ver `BLOQUE_C3_7_BENCHMARK_FINAL_PDF.md`.  
Línea base final (mediana warm ~1.65–2.05 s); residual = `renderMs` OpenHTMLToPDF; **sin evidencia** para más micro-opts ni cambio de renderer.
