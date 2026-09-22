# FASE 3.15.8 — Documentos PDF / QR de Orden de Servicio (Backend)

## Objetivo

Generar PDFs corporativos (comprobante de recepción, cotización, acta de entrega) con QR de consulta pública, sin exponer costos internos ni datos sensibles en la consulta por token.

## Formato de página

**LETTER** (8.5 × 11 in). Decisión documentada para documentos comerciales de taller en Colombia (compatibilidad con impresoras y presentaciones de cotización). OpenHTMLToPDF `PdfRendererBuilder` usa tamaño LETTER explícito.

## Plantillas HTML/CSS

- Ruta: `templates/documentos/servicios/`
- CSS base: `styles/documentos-servicios.css`
- CSS por documento (Tech-Minimal SOLVIX):
  - `styles/comprobante-recepcion.css`
  - `styles/acta-entrega.css`
  - `styles/cotizacion.css`
- OpenHTMLToPDF **no** resuelve `classpath:` en `<link>`. `HtmlToPdfService` incrusta **todos** los `styles/*.css` enlazados en `<style>`.

Placeholders y generación automática no cambian. QR = `${QR_DATA_URI}`. Cotización: `{{DETALLE_ROWS}}`. Acta: `${FIRMA_HTML}`.

## Dependencias

- `openhtmltopdf-pdfbox` 1.0.10
- `zxing` core / javase 3.5.3

## Migración

`V12__documentos_orden_servicio.sql`

- `ordenes_servicio.token_consulta` VARCHAR(64) UNIQUE (UUID sin guiones)
- Tabla `documentos_orden_servicio` (metadatos + `storage_key` + `hash_sha256` + `token_documento` opcional)

## Modelo

| Pieza | Rol |
|-------|-----|
| `TipoDocumentoOrdenServicio` | `COMPROBANTE_RECEPCION`, `COTIZACION`, `ACTA_ENTREGA` |
| `DocumentoOrdenServicio` | Metadatos; **el snapshot histórico son los bytes PDF** |
| `OrdenServicio.tokenConsulta` | QR de consulta OT (`/consulta/ot/{token}`) |

## Almacenamiento

- Directorio: `solvix.servicios.documentos-dir`
- Archivos: `{UUID}.pdf` (storageKey)
- **Sin URL pública de archivos** — descarga solo vía controlador ADMIN

## QR

| Documento | URL en QR |
|-----------|-----------|
| Comprobante / Acta | `{frontend.base-url}/consulta/ot/{tokenConsulta}` |
| Cotización | `{frontend.base-url}/consulta/documento/{tokenDocumento}` |

## Hooks (best-effort, sin rollback de OT)

Tras `afterCommit`:

1. `OrdenServicioService.crear` → `generarComprobanteRecepcion` / `asegurarComprobanteRecepcion`
2. `CotizacionServicioService.presentar` → `generarCotizacionPdf`
3. `OrdenServicioService.registrarEntrega` → `generarActaEntrega`

Si falla el PDF: se registra warning; la OT / cotización / entrega ya están confirmadas.

### Comprobante de recepción — asegurar (idempotente)

`POST .../comprobante-recepcion` **asegura** que exista el comprobante (no “crear siempre uno nuevo”).

| Situación | `status` | HTTP | Efecto |
|-----------|----------|------|--------|
| No existía | `GENERATED` | 201 | Crea PDF + metadatos |
| Ya existía | `EXISTING` | 200 | Devuelve el vigente; **no duplica** |

Respuesta (`AsegurarComprobanteRecepcionResponseDTO`):

```json
{ "status": "EXISTING", "ready": true, "documento": { /* DocumentoOrdenServicioResponseDTO */ } }
```

Anti-duplicado: búsqueda previa + re-chequeo tras crear. El frontend y afterCommit pueden llamar casi a la vez; la segunda llamada recibe `EXISTING`. Regenerar sigue siendo la única vía para una versión nueva explícita.

Combinación final: **afterCommit** + **POST asegurar** + **polling frontend** + **reintento manual**.

## Endpoints ADMIN

Base: `/api/v1/ordenes-servicio/{ordenId}/documentos` — `@PreAuthorize("hasRole('ADMIN')")`

| Método | Ruta | Acción |
|--------|------|--------|
| GET | `/` | Listar |
| GET | `/{docId}` | Metadatos |
| GET | `/{docId}/pdf` | PDF (`attachment`/`inline`) |
| POST | `/comprobante-recepcion` | **Asegurar** (idempotente; GENERATED/EXISTING) |
| POST | `/cotizaciones/{cotizacionId}` | Generar (no BORRADOR) |
| POST | `/acta-entrega` | Generar (requiere entrega+firma) |
| POST | `/{docId}/regenerar` | **Nueva versión**; conserva la anterior |

## Consulta pública

`GET /api/v1/consulta/**` — `permitAll`

| Ruta | Respuesta |
|------|-----------|
| `/ot/{token}` | Número, estado amigable, equipo (tipo/marca/modelo/referencia), fechas, mensaje. **Sin** cliente doc/tel/email, diagnóstico, costos, cotizaciones |
| `/documento/{tokenDocumento}` | Tipo, número OT, fecha, mensaje “Documento disponible en el taller”. **Sin PDF** |

## Reglas de negocio PDF

- Cotización: solo si estado ≠ `BORRADOR`; precios de **detalle congelado** (snapshot)
- Nunca mostrar `costoActual` / `costoHistorico` / margen
- Dinero: `$` + formato es-CO (miles `.`, decimales `,`, scale 2)
- Acta: exige entrega con firma
- Regenerar: incrementa `version`, no sobrescribe archivo anterior
- Hash SHA-256 de los bytes PDF

## Plantillas

`src/main/resources/templates/documentos/servicios/`

- `styles/documentos-servicios.css`
- `comprobante-recepcion.html`
- `cotizacion.html`
- `acta-entrega.html`

Logo opcional vía `solvix.empresa.logo-classpath`; si no existe, encabezado solo texto.

## Configuración

```properties
solvix.servicios.documentos-dir=uploads/servicios/documentos
solvix.frontend.base-url=http://localhost:4200
solvix.empresa.nombre=...
solvix.empresa.logo-classpath=static/branding/logo-empresa.png
# ... teléfono, whatsapp, correo, dirección, sitio-web, identificacion-fiscal, footer-texto
```

## Separación obligatoria

- No modifica reglas de cotización, inventario ni modelo de entrega
- Solo engancha llamadas de generación (hooks)
