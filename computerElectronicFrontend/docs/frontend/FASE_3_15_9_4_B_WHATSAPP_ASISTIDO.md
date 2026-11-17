# SOLVIX Frontend — FASE 3.15.9.4-B
## Implementación — WhatsApp asistido (Click-to-Chat)

**Fecha:** 2026-10-02  
**Base:** `FASE_3_15_9_4_A_AUDITORIA_WHATSAPP_ASISTIDO.md`

---

## 1. Arquitectura

Flujo:

```
ADMIN → detalle OT → menú WhatsApp → plantilla contextual
  → util (teléfono + mensaje + URL)
  → wa.me?text=…
  → WhatsApp Web/App → revisión humana → Enviar
```

- **Manual / asistido** — no usa `NotificationDispatcher` ni crea `Notificacion`.
- Una sola superficie: botón **WhatsApp** en cabecera de `ServicioDetailComponent`.

---

## 2. DTO (ADMIN)

`OrdenServicioResponseDTO` (API autenticada `@PreAuthorize ADMIN`) ahora incluye:

| Campo | Uso |
|-------|-----|
| `tokenConsulta` | Mismo token del QR / portal |
| `clienteTelefono` | Teléfono crudo del cliente |

**No** se añadieron a DTOs públicos de consulta.

---

## 3. Environment

`publicWebBaseUrl` en:

- `environment.ts` → `https://test.computerelectroniccentersas.com`
- `environment.development.ts` → mismo dominio TEST (evita localhost en mensajes)
- `environment.test.ts` → mismo

Alineado con `solvix.frontend.base-url`.  
URL cliente: `{publicWebBaseUrl}/consulta/ot/{tokenConsulta}`.

---

## 4. Normalización

`normalizarTelefonoWa` (util FE):

- solo dígitos
- `3XXXXXXXXX` (10) → `57…`
- `57…` (12) se conserva
- no persiste ni muta `Cliente.telefono`

---

## 5. Click-to-Chat

`enlaceClickToChat(telefono, mensaje)` →  
`https://wa.me/{digits}?text={encodeURIComponent(mensaje)}`  
Apertura: `window.open(..., '_blank', 'noopener,noreferrer')`.

---

## 6. Plantillas

Util: `mensajeRecepcion` / `mensajeCotizacion` / `mensajeEquipoListo`  
Contenido según fase A (nombre, OT, cotización si aplica, URL). Sin PDF, precios ni documento.

Cotización: `CotizacionServicioService.listar` → última `PENDIENTE_APROBACION`.

---

## 7. UI

- Botón **WhatsApp** + `mat-menu` (mismo patrón que “Más acciones”)
- Ayuda: “Elige el mensaje… Se abrirá WhatsApp para que lo revises y envíes.”
- Opciones según estado:
  - Recepción: no `CANCELADO`
  - Cotización: `PENDIENTE_APROBACION`
  - Equipo listo: `LISTO`
- Sin teléfono/token válidos: no abre wa.me; feedback `Registra un teléfono válido…`

---

## 8. Roles

Solo **ADMIN** (ruta + API). No se inventó rol TÉCNICO.

---

## 9. Seguridad

- Teléfono/token solo en API ADMIN
- Portal público sin cambios de PII
- Token no mostrado como texto suelto en UI
- Nada de secretos / URLs wa.me en BD

---

## 10. Tests

- `whatsapp-asistido.util.spec.ts` — teléfono, URL, encode, plantillas, estados
- `servicio-detail.spec.ts` — botón, teléfono inválido, recepción/cotización/listo

---

## 11. Limitaciones

- Rate/Delivery de WhatsApp: fuera de alcance
- `publicWebBaseUrl` en local apunta a TEST (intencional)
- Reenvío de recepción en estados posteriores permitido; cotización solo con pendiente

---

## 12. Relación con NotificationDispatcher

**Ninguna.** Abrir WhatsApp no publica eventos ni marca ENVIADA. El motor 3.15.9.1/2 permanece para automatización futura.
