# SOLVIX — FASE 3.15.8 Documentos de servicio (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Backend:** API `/api/v1/ordenes-servicio/{ordenId}/documentos` y consulta pública `/api/v1/consulta/**`

---

## Objetivo

Mostrar, ver, descargar y regenerar PDFs de orden de servicio desde `/servicios/:id`, y hacer que el **comprobante de recepción aparezca automáticamente** tras crear una OT.

Principio: **SOLVIX no simplifica la ingeniería. SOLVIX simplifica la forma de entenderla.**

---

## Contratos ADMIN

Base: `${environment.apiBaseUrl}/v1/ordenes-servicio/{ordenId}/documentos`

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/` | Listar documentos |
| GET | `/{docId}` | Metadatos |
| GET | `/{docId}/pdf?disposition=inline\|attachment` | PDF (blob) |
| POST | `/comprobante-recepcion` | **Asegurar** comprobante (idempotente) |
| POST | `/cotizaciones/{cotizacionId}` | Generar PDF cotización |
| POST | `/acta-entrega` | Generar acta |
| POST | `/{docId}/regenerar` | Nueva versión (conserva la anterior) |

Respuesta asegurar:

```ts
{ status: 'GENERATED' | 'EXISTING'; ready: boolean; documento: DocumentoOrdenServicioResponseDTO }
```

Modelos: `core/models/documento-orden-servicio.models.ts`  
Servicio: `core/services/documento-orden-servicio.service.ts` → `asegurarComprobanteRecepcion()`

---

## Flujo tras presentar cotización

1. `POST .../cotizaciones/{id}/presentar` (backend genera PDF en afterCommit).
2. Panel cotizaciones emite `documentoEsperado`.
3. Panel documentos: `esperarDocumento({ tipo: 'COTIZACION', cotizacionId })` + polling.
4. Acciones: Ver / Descargar / Regenerar. WhatsApp = próximamente (deshabilitado).
5. Si el PDF no aparece: CTA **Generar documento** → `POST .../documentos/cotizaciones/{id}`.

## Flujo tras registrar entrega

1. `POST .../entrega` (backend genera acta en afterCommit).
2. Detalle llama `esperarDocumento({ tipo: 'ACTA_ENTREGA' })`.
3. Misma UX de espera / Generar → `POST .../documentos/acta-entrega`.

---

## Flujo tras crear OT

1. `/servicios/nueva` crea la OT → snack de éxito.
2. Navega a `/servicios/{id}?esperarComprobante=1`.
3. Detalle limpia el query param y pasa `[esperarComprobante]="true"` al panel.
4. Panel:
   - Estado **Generando comprobante de recepción...**
   - **Una** llamada `POST .../comprobante-recepcion` (asegurar).
   - Si `ready` → muestra documento + Ver / Descargar.
   - Si falla o aún no → polling RxJS (`timer` cada 800 ms, máx. 10 ticks).
   - Timeout → **Reintentar generación** (mismo POST).
5. **No** se muestra “Generar” como CTA del flujo normal.

## OT antigua sin comprobante

Si el usuario abre una OT `RECEPCIONADO` **sin** `esperarComprobante`:

- Estado: **Comprobante de recepción pendiente**
- CTA: **Generar comprobante**
- **Sin** polling automático

## Estados del panel

| Estado | UI |
|--------|-----|
| `loading` | Cargando documentos... |
| `esperando_comprobante` | Generando comprobante de recepción... |
| `ready` | Lista + (opcional) banner “generado” |
| `comprobante_timeout` | Falló auto → Reintentar generación |
| `comprobante_pendiente` | OT antigua → Generar comprobante |
| `empty` | No hay documentos adicionales... |
| `error` | Error de carga (mensaje amigable) |

Acciones: **Ver** / **Descargar** / **Regenerar** (admin, separado) / WhatsApp (próximamente).

---

## Consulta pública (sin auth)

| Ruta frontend | API |
|---------------|-----|
| `/consulta/ot/:token` | `GET /v1/consulta/ot/{token}` |
| `/consulta/documento/:token` | `GET /v1/consulta/documento/{token}` |

---

## Entornos

Desarrollo: `apiBaseUrl = http://localhost:8080/api`.  
QR: `frontend.base-url` en backend. Ver `CONFIGURACION_ENTORNOS_API.md`.
