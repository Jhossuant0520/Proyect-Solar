# SOLVIX Backend — BLOQUE D.9
## Limpieza de texto de conformidad en Comprobante de Recepción

**Fecha:** 2026-09-29  
**Alcance:** plantilla `comprobante-recepcion.html` + vars en `DocumentoOrdenServicioService`.  
**Sin cambios:** Acta de Entrega, workflow, firma PNG, QR, footer, D.7.

---

### 1. Problema

El PDF mostraba:

> El cliente confirma la recepción del equipo por parte del taller para diagnóstico, revisión o servicio.

Texto redundante junto a la firma digital.

---

### 2. Cambio

**Plantilla** — se eliminó:

```html
<p class="cr-sign-meta">${DOCUMENTO_FIRMANTE_RECEPCION} · Conformidad de recepción</p>
<p class="cr-sign-meta">${TEXTO_CONFORMIDAD_RECEPCION}</p>
```

**Queda:**

```html
<p class="cr-sign-role">Firma del cliente</p>
<p class="cr-sign-who-strong">${NOMBRE_FIRMANTE_RECEPCION}</p>
<p class="cr-sign-meta">${DOCUMENTO_FIRMANTE_RECEPCION}</p>
```

**Servicio** — ya no rellena `TEXTO_CONFORMIDAD_RECEPCION`.

---

### 3. Conservado

- Firma (`FIRMA_HTML`)
- Nombre / documento del firmante
- QR, footer, estructura del comprobante
- Acta de Entrega sin cambios

---

### 4. Tests

- `DocumentoPlantillaAutoriaTest#comprobanteEncodingOtYQrCliente` — sin frase / sin placeholder
- `DocumentoOrdenServicioServiceTest#comprobanteRecepcionIncluyeFirma` — PDFStripper sin la frase

---

### 5. Build

```bash
mvn "-Dtest=DocumentoOrdenServicioServiceTest#comprobanteRecepcionIncluyeFirma,DocumentoPlantillaAutoriaTest#comprobanteEncodingOtYQrCliente" test
mvn -DskipTests compile
```
