# SOLVIX Backend — BLOQUE D.8
## Quitar "Fecha presentada" del PDF de Cotización Comercial

**Fecha:** 2026-09-29  
**Alcance:** presentación documental del PDF de Cotización Comercial.  
**Sin cambios:** entidad, DTO, `fechaPresentacion`, `presentar()`, estados, endpoints, otros PDFs (OT / recepción / entrega).

---

### 1. Problema

El PDF comercial mostraba en el banner:

```text
Fecha: <emisión>  •  Presentada: <fechaPresentacion>
```

Decisión UX: la fecha de presentación no debe verse en UI interna ni en el PDF comercial, aunque el campo backend se conserve.

---

### 2. Decisión UX

| Capa | Comportamiento |
|------|----------------|
| UI interna | Ya sin “Presentada” (previo) |
| PDF Cotización Comercial | Sin “Presentada” / “Fecha presentada” (**D.8**) |
| Backend `fechaPresentacion` | **Conservado** (lógica / integraciones) |
| PDF Cotización OT (`cotizacion.html`) | Conserva Presentada; layout de metadata ajustado aparte (ver `BLOQUE_UX_METADATA_BANNER_COTIZACION_OT.md`) |

---

### 3. Ubicación encontrada

| Archivo | Hallazgo |
|---------|----------|
| `templates/documentos/servicios/cotizacion-comercial.html` | Label `Presentada:` + `${FECHA_PRESENTACION}` |
| `DocumentoCotizacionComercialService` | Sigue enviando `FECHA_PRESENTACION` en vars (permitido; ya no se usa en plantilla) |
| `cotizacion.html` (OT) | También tiene “Presentada:” → **no tocado** |

---

### 4. Cambio aplicado

En `cotizacion-comercial.html`, el bloque de fechas queda:

```html
<p class="cr-fecha-row">
  <span class="cr-fecha-label">Fecha:</span>
  <span class="cr-fecha-value">${FECHA_COTIZACION}</span>
</p>
```

Se eliminaron: separador `•`, label `Presentada:`, valor `${FECHA_PRESENTACION}`.

Sin huecos/dividers huérfanos: la fila se compacta sola.

---

### 5. Datos backend conservados

- Entidad `CotizacionComercial.fechaPresentacion`
- DTO `CotizacionComercialResponseDTO.fechaPresentacion`
- `presentar()` sigue asignando la fecha
- `vars.put("FECHA_PRESENTACION", …)` puede permanecer (no se renderiza)

---

### 6. Validación PDF

Tras presentar una cotización comercial:

- El texto del PDF **no** contiene `Presentada` / `Fecha presentada`
- Sí contiene `Fecha` (emisión) y totales
- Plantilla OT / comprobante / acta sin cambios

---

### 7. Tests

- `DocumentoPlantillaAutoriaTest#cotizacionComercialSinQr` — plantilla y HTML sin Presentada  
- `CotizacionComercialServiceTest#presentarEditarYRepresentar` — PDFStripper sin Presentada; DTO conserva `fechaPresentacion`

---

### 8. Build

```bash
mvn "-Dtest=CotizacionComercialServiceTest,DocumentoPlantillaAutoriaTest" test
mvn -DskipTests compile
```

---

### 9. Regresión

| Documento | Impacto |
|-----------|---------|
| Cotización Comercial PDF | Label Presentada eliminado |
| Cotización OT PDF | Ninguno |
| Comprobante / Acta | Ninguno |
| Workflow comercial | Ninguno |
