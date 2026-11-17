# SOLVIX Frontend — BLOQUE D.7
## Normalización visual de firma digital

**Fecha:** 2026-09-29  
**Alcance:** apariencia profesional de firma (fondo blanco + trazo negro) en recepción y entrega.  
**Sin cambios:** workflow, estados, entidades, rutas de almacenamiento, QR, layout PDF, listado Servicios, D.1/D.3/D.6.

---

### 1. Problema

La firma se capturaba con colores dependientes del tema:

| Tema | Fondo canvas | Trazo |
|------|--------------|-------|
| Oscuro (default) | `#020617` | `#F8FAFC` (casi blanco) |
| Claro | `#f4f7fb` | `#0f172a` |

El PNG persistido reproducía esa apariencia → en PDF se veía **firma blanca sobre fondo azul/oscuro**.

---

### 2. Apariencia anterior vs nueva

**Antes (tema oscuro):** fondo oscuro + trazo claro.  
**Después (siempre):** fondo `#FFFFFF` + trazo `#000000`, PNG autosuficiente.

---

### 3. Auditoría

| Pieza | Antes | Decisión D.7 |
|-------|-------|--------------|
| `solvix-signature-pad` | A: canvas oscuro + stroke blanco (tema dark) | Colores fijos + export compuesto |
| Dialog entrega | Canvas **duplicado** con misma lógica de tema | Migrado a `solvix-signature-pad` |
| `EntregaFirmaService` | Persiste PNG tal cual (≤500 KB) | Sin transformación (FE garantiza) |
| `recortarFirmaParaActa` | Asumía trazo claro sobre fondo oscuro | Detecta D.7 **y** histórico |

---

### 4. Signature pad

Constantes:

```ts
SOLVIX_FIRMA_FONDO = '#FFFFFF'
SOLVIX_FIRMA_TRAZO = '#000000'
```

- CSS del wrap/canvas: fondo blanco (no `surface-2` del tema)
- `strokeStyle` fijo negro
- Antialiasing nativo (`lineCap`/`lineJoin` round)
- Mouse / touch / stylus sin cambios

---

### 5. Exportación PNG

Al capturar:

1. Crear canvas auxiliar  
2. `fillRect` blanco  
3. `drawImage` del lienzo firmado  
4. `toDataURL('image/png')`

Así el archivo **no depende de transparencia ni CSS**.

---

### 6. Recepción / Entrega

Misma infraestructura:

```text
solvix-signature-pad → Base64 PNG → EntregaFirmaService → filesystem
→ comprobante recepción / acta entrega (img embebida)
```

Entrega deja de mantener un canvas propio.

---

### 7. PDFs

Sin rediseño. Solo:

- imagen con fondo blanco + tinta negra  
- recorte de bounding-box actualizado para ambos formatos de tinta

---

### 8. Firmas históricas

| Generación | Comportamiento |
|------------|----------------|
| **Nuevas** (post D.7) | Blanco + negro |
| **Históricas** | Se dejan igual en disco; el crop PDF sigue detectando trazo claro sobre fondo oscuro |

**No** hay migración masiva de archivos.  
Si se desea uniformar históricos: haría falta un job offline (leer PNG → recolorizar → reescribir) — **no implementado**.

---

### 9. Tests

Frontend:

- `solvix-signature-pad.spec.ts` — colores, limpia, export PNG, estado vacío  
- recepción dialog (existente)  
Backend:

- `DocumentoOrdenServicioServiceTest` / `OrdenServicioServiceTest` (firma recepción/entrega)  
- límite 500 KB intacto en `EntregaFirmaService`

---

### 10. Build

```bash
npx ng test --include=**/solvix-signature-pad.spec.ts --include=**/servicio-recepcion-dialog.spec.ts --browsers=ChromeHeadless --watch=false
npx ng build
mvn "-Dtest=DocumentoOrdenServicioServiceTest,OrdenServicioServiceTest" test
mvn -DskipTests compile
```

---

### 11. Validación visual (manual)

Generar 1 comprobante de recepción y 1 acta de entrega con firma real y verificar:

- fondo blanco  
- trazo negro  
- sin halo azul  
- sin invert/CSS  
- misma posición/escala en el PDF  

---

### 12. Archivos

- `shared/components/solvix-signature-pad/solvix-signature-pad.ts` (+ spec)  
- `servicio-entrega-dialog` (ts/html/scss) → usa pad compartido  
- `DocumentoOrdenServicioService.java` — detección de trazo D.7 + histórico  
- `docs/frontend/BLOQUE_D7_NORMALIZACION_FIRMA.md`
