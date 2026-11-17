# SOLVIX Backend — BLOQUE C.3.5
## Auditoría de estructura HTML / tablas de layout en PDFs

**Fecha:** 2026-09-28  
**Alcance:** inventario + clasificación + un candidato experimental futuro.  
**Sin cambios** a CSS, HTML, plantillas, OpenHTMLToPDF, logo, cache, QR ni frontend.

---

### 1. Objetivo

Determinar cuánto del coste residual de render (~1.8–2.2 s tras C.3.3) podría asociarse a:

- tablas usadas solo como layout visual;
- profundidad de anidamiento (hasta 3);
- cantidad de tablas por documento (16–24).

No implementar optimizaciones. No asumir causalidad solo por tamaño HTML.

---

### 2. Estado después de C.3.4

| Bloque | Resultado |
|---|---|
| C.3.3 | Logo optimizado; htmlChars ~76 KB; renderMs −42 %…−72 % |
| C.3.4 | `page-break-inside` / `-fs-table-paginate` **sin** mejora consistente → reglas se mantienen |
| Residual | ~1.8–2.2 s en `builder.run()` |

Hipótesis abierta: layout tabular anidado (compatibilidad OpenHTMLToPDF sin flex/grid).

---

### 3. Inventario de HTML

Plantillas estáticas (sin data URI / sin filas dinámicas). Nodos = tags de apertura contados por parser.

| Documento | chars plantilla | nodos | tables | tr | td | th | div | span | p | img |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 6 703 | 131 | **16** | 20 | 31 | 5 | 4 | 23 | 22 | 0* |
| COTIZACION (OT) | 8 341 | 158 | **19** | 25 | 44 | 5 | 4 | 25 | 25 | 1† |
| COMPROBANTE_RECEPCION | 10 331 | 181 | **24** | 29 | 52 | 0 | 9 | 25 | 34 | 1† |
| ACTA_ENTREGA | 9 389 | 175 | **22** | 26 | 43 | 0 | 9 | 24 | 43 | 0* |

\*Logo/firma se inyectan vía placeholders (`LOGO_HTML`, `FIRMA_HTML`) → en HTML expandido hay `img`.  
†Placeholder QR (`<img … src="${QR_DATA_URI}">`) ya en plantilla.

**HTML expandido post-C.3.3** (audit previo): ~75–78 KB; mismas tablas base + filas `DETALLE_ROWS` + data URI logo (~49 KB).  
El tamaño HTML ya no domina; la **topología** (tablas/anidamiento) sí permanece.

---

### 4. Inventario de tablas

Distribución por profundidad (conteo de tablas cuyo nesting level = N):

| Documento | depth 1 | depth 2 | depth 3 | max | tablas con hijos anidados |
|---|---:|---:|---:|---:|---:|
| COTIZACION_COMERCIAL | 6 | 6 | **4** | 3 | 5 |
| COTIZACION | 6 | 5 | **8** | 3 | 7 |
| COMPROBANTE | 7 | 7 | **10** | 3 | 8 |
| ACTA | 7 | 10 | **5** | 3 | 6 |

Patrón compartido (shell Stitch en `comprobante-recepcion.css`):

```
cr-meta                          (d1)
cr-header
  └─ cr-brand-row                (d2)  logo | texto empresa
cr-banner                        (d1)
cr-two
  └─ cr-card ×2                  (d2)
       ├─ cr-card-head-inner     (d3)  [nº] título | badge
       └─ cr-split…              (d3)  campos en columnas
cr-card-full / cr-mid / cr-sign… (varía por doc)
cr-footer                        (d1)
```

---

### 5. Profundidad de anidamiento

#### Qué llega a profundidad 3

| Estructura | Docs | Función |
|---|---|---|
| `cr-card-head-inner` | Todos | Título de card `[01]` + badge lateral |
| `cr-split` / `cr-split-top` / `cr-split-gap` | Todos | Campos label/valor en 1–2 columnas |
| `cr-lines` + `cr-totales` | Cotización OT (dentro de card en `cr-mid`) | Detalle de líneas (en comercial depth 2) |
| `cr-label-row` | Comprobante (d3), Acta (d2) | Etiqueta + badge “Notas/Entregado” |
| `cr-qr-head` + `cr-qr-frame` | Cotización OT, Comprobante | Marco/panel QR |

No hay depth > 3 en plantillas actuales.

---

### 6. Clasificación de tablas

Leyenda: **A** datos tabulares reales · **B** layout visual · **C** mixta · **D** indeterminada

| Clase CSS | Tipo | Evidencia |
|---|---|---|
| `cr-meta` | **B** | Dos celdas meta izq/der; sin semántica tabular |
| `cr-header` | **B** | Brand \| contacto |
| `cr-brand-row` | **B** | Logo \| copy; anidada solo para alineación |
| `cr-banner` | **B** | Título doc \| chip OT/fechas |
| `cr-two` | **B** | Contenedor 2 columnas de cards |
| `cr-card` / `cr-card-full` | **B** | Marco visual de sección (head+body) |
| `cr-card-head-inner` | **B** | Título \| badge; solo alineación |
| `cr-split*` | **B** | Grid de campos; no es “tabla de datos” |
| `cr-label-row` | **B** | Label \| badge |
| `cr-lines` | **A** | thead Tipo/Descripción/Cant./P.unit/Subtotal + `DETALLE_ROWS` |
| `cr-totales` | **C** | 2 filas label/valor; tabular simple de resumen |
| `cr-mid` | **B** | Card detalle \| panel QR |
| `cr-qr-panel` / `cr-qr-head` / `cr-qr-frame` | **B** | Marco decorativo QR (frame = celdas vacías + img) |
| `cr-sign` | **B** | Dos pads de firma + gutter (C.3.4: page-break crítico) |
| `cr-sign-pad` | **B** | Contenedor del área de firma/sello |
| `cr-footer` | **B** | Empresa/WA \| autoría (C.3.4: page-break) |

**Resumen por documento (conteo aproximado de tablas):**

| Documento | A (datos) | B (layout) | C (mixta) |
|---|---:|---:|---:|
| COTIZACION_COMERCIAL | 1 (`cr-lines`) | 14 | 1 (`cr-totales`) |
| COTIZACION | 1 | 17 | 1 |
| COMPROBANTE | 0 | **24** | 0 |
| ACTA | 0 | **22** | 0 |

→ En comprobante/acta **100 %** de las tablas son layout. En cotizaciones, solo `cr-lines` (+ totales mixtos) es contenido tabular real.

---

### 7. Tablas de layout identificadas (detalle)

| Elemento | Función en plantilla | ¿Solo alineación? |
|---|---|---|
| `cr-brand-row` dentro de `cr-header` | Logo 60 px junto a nombre/lab/servicios | Sí |
| `cr-card-head-inner` | `[01] Título` vs badge `Titular`/`Líneas`/… | Sí |
| `cr-split` | Pares documento/teléfono, tipo/marca, etc. | Sí (contenido en `<p>`, tabla solo columnas) |
| `cr-qr-frame` | Borde/marco alrededor del QR (matriz de celdas) | Sí |
| `cr-sign` / `cr-sign-pad` | Dos columnas de firma | Sí, pero **protegidas por page-break** (C.3.4) |
| `cr-footer` | Dos columnas pie | Sí, **protegida** |

---

### 8. Candidatos de optimización

| Elemento | Documento | Prof. | Función | Tipo | Potencial simplificación | Riesgo |
|---|---|---:|---|---|---|---|
| `cr-card-head-inner` | Todos | 3 | Título \| badge | B | **Alto** (muchas instancias; baja depth 3) | Medio-bajo visual |
| `cr-brand-row` | Todos | 2 | Logo \| texto | B | Medio (1×/doc) | Medio (header corporativo) |
| `cr-split` (single-col / colspan=2) | Comercial etc. | 3 | Un campo envuelto en tabla | B | Medio | Bajo–medio |
| `cr-qr-frame` | OT / Comprobante | 3 | Marco QR | B | Medio | Medio (look QR) |
| `cr-meta` | Todos | 1 | Meta barra | B | Bajo | Bajo |
| `cr-sign*` / `cr-footer` | Según doc | 1–2 | Firmas / pie | B | — | **Alto** (excluido C.3.4) |
| `cr-lines` | Cotizaciones | 2–3 | Líneas | A | No simplificar como layout | Alto funcional |

---

### 9. Riesgos

- OpenHTMLToPDF **no soporta flex/grid** de forma útil → sustituir tablas de layout exige CSS 2.1-compatible (`inline-block`, floats, o menos anidación manteniendo tables más planas).
- Cambiar muchas clases a la vez mezcla efectos → imposible atribuir Δ `renderMs`.
- Firmar/footer ya descartados como primer experimento (C.3.4).
- `cr-lines` debe permanecer como tabla real.

---

### 10. Relación con renderMs

| Observación | Interpretación |
|---|---|
| htmlChars ya ~76 KB (C.3.3) | El residual **no** es tamaño del string HTML |
| 16–24 tablas, depth 3, ≥5–8 con hijos | Compatible con coste de **layout engine** OH2PDF |
| Comprobante (24 tablas, 0 datos) ≈ mismo renderMs que comercial (16 tablas) | Cantidad sola no ordena el coste; complejidad global + fuentes + paint |
| C.3.4 page-break sin efecto | El coste no está en esas 3 reglas |

**No causalidad demostrada** aún: hace falta un experimento A/B de **una** estructura.

Correlación débil observada: más tablas (comprobante 24) no implica renderMs mayor que comercial tras C.3.3; ambos ~1.8–2.2 s. La hipótesis “anidamiento/layout tables” sigue plausible pero **no medida**.

---

### 11. Experimento recomendado (NO implementado)

**Un solo candidato:** colapsar / eliminar el anidamiento de **`table.cr-card-head-inner`**.

#### Por qué cumple el filtro

| Criterio | Cumple |
|---|---|
| Exclusivamente layout | Sí — solo alinea título y badge |
| No transporta datos | Sí — textos están en spans internos |
| No afecta paginación | Sí — sin page-break propio |
| No afecta firma | Sí |
| No afecta footer | Sí |
| No afecta contenido semántico | Sí — mismos textos visibles |
| Fácilmente reversible | Sí — un patrón repetido; git restore |

#### Idea del experimento futuro (C.3.6 hipotético)

1. En **una** plantilla piloto (p.ej. `cotizacion-comercial.html`) o en el patrón CSS+HTML compartido de forma mínima: mover el contenido de `cr-card-head-inner` al `td.cr-card-head` sin tabla hija (p.ej. dos `span`/`div` con width/% CSS 2.1, o una sola fila ya existente).
2. Medir 2× generaciones vs baseline (`renderMs`, páginas, revisión visual del badge/título).
3. Si no hay ganancia estable → revertir (como C.3.4).
4. No tocar `cr-sign`, `cr-footer`, `cr-lines`, QR frame en el mismo cambio.

**Impacto esperado:** baja a media (quita ~3–5 tablas depth-3 por doc). Puede no mover el aguja si el coste está en paint/fuentes/layout global — por eso debe medirse aislado.

---

### 12. Conclusión

1. Inventario completo de nodos/tablas/profundidad para los 4 PDFs.
2. Clasificación: la gran mayoría de tablas son **layout (B)**; solo `cr-lines` es datos reales (A); `cr-totales` mixta (C).
3. Depth 3 concentrada en `cr-card-head-inner`, `cr-split`, QR frame y (en OT) líneas dentro de card.
4. **Candidato único de bajo riesgo para experimento posterior:** `cr-card-head-inner`.
5. Sin cambios permanentes en el código de plantillas/CSS.

**Decisión para el siguiente bloque:**  
ejecutar el experimento aislado de `cr-card-head-inner` **o** aceptar el residual ~2 s como coste de diseño Stitch-compatible con OpenHTMLToPDF, sin más refactors.

**Seguimiento C.3.6:** experimento ejecutado → **descartar** (sin mejora consistente). Ver `BLOQUE_C3_6_EXPERIMENTO_CARD_HEAD_PDF.md`.

---

### Anexo — Listado por documento (clase @ depth)

**COTIZACION_COMERCIAL (16):**  
meta@1, brand-row@2, header@1, banner@1, card-head-inner@3 ×2, split@3 ×2, card@2 ×2, two@1, card-head-inner@2, lines@2, totales@2, card-full@1, footer@1

**COTIZACION (19):**  
shell similar + card@2 (equipo), mid@1 con card(lines@3,totales@3) + qr-panel@2 (qr-head@3, qr-frame@3), footer@1

**COMPROBANTE (24):**  
shell two-cards + card problemas (label-rows@3) + mid QR + sign@1 (sign-pad@2 ×2) + footer

**ACTA (22):**  
shell two-cards + card-full (splits/label-rows@2) + sign + footer

### Validación

- Parser HTML sobre plantillas en `src/main/resources/templates/documentos/servicios/*.html`
- Sin modificaciones de archivos de producción
- Documento: este archivo
