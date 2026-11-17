# SOLVIX Frontend — FASE 3.15.9.4-A
## Auditoría — WhatsApp asistido mediante Click-to-Chat

**Fecha:** 2026-10-02  
**Tipo:** auditoría y diseño únicamente.  
**NO implementado en esta fase:** botones, endpoints, migraciones, API WhatsApp, webhooks, PDFs, cambios de QR/token.

Convención de lectura:

| Etiqueta | Significado |
|----------|-------------|
| **HECHO** | Evidencia directa del repositorio |
| **INFERENCIA** | Conclusión derivada del código |
| **PROPUESTA** | Diseño sugerido para 3.15.9.4-B |
| **DECISIÓN** | Acuerdo funcional cerrado en el enunciado / audit |
| **INCERTIDUMBRE** | No determinable solo con el código |

---

## 1. Flujo actual

### DECISIÓN — modelo funcional cerrado

SOLVIX **no** usa WhatsApp Business API en esta línea de trabajo.

Flujo objetivo:

```
ADMIN
  → SOLVIX (prepara número + mensaje + URL pública)
  → botón WhatsApp
  → Click-to-Chat (wa.me)
  → WhatsApp Web / app
  → trabajador revisa
  → trabajador pulsa Enviar
  → cliente
```

SOLVIX **no** envía. WhatsApp es el canal de envío real.

### HECHO — consulta pública OT (destino único)

| Pieza | Ubicación |
|-------|-----------|
| Ruta FE | `/consulta/ot/:token` → `ConsultaOtPublicaComponent` (sin auth) |
| API lectura | `GET /api/v1/consulta/ot/{token}` |
| API cotización | `GET /api/v1/consulta/ot/{token}/cotizacion` |
| Acciones públicas | POST aprobar/rechazar (identidad + rate limit) — fase 3.15.9.3 |
| Token | `OrdenServicio.tokenConsulta` (UUID hex 32, `@PrePersist`, UNIQUE) |

### HECHO — QR y documentos

`DocumentoOrdenServicioService` construye la URL del QR con:

`solvix.frontend.base-url` + `/consulta/ot/` + `tokenConsulta`

**DECISIÓN:** WhatsApp asistido debe apuntar al **mismo** recurso. Sin token secundario, sin URL secundaria, sin QR adicional.

### HECHO — casos de uso en el dominio OT

| Caso de comunicación | Momento de dominio real | Estado / evento relacionado |
|----------------------|-------------------------|-----------------------------|
| **A. RECEPCIÓN** | Creación OT / comprobante recepción | `RECEPCIONADO`; notificación `ORDEN_RECIBIDA` (motor 3.15.9.1, sin envío real al cliente vía Click-to-Chat) |
| **B. COTIZACIÓN** | Presentar cotización | OT → `PENDIENTE_APROBACION`; evento `COTIZACION_DISPONIBLE` / `COTIZACION_ADICIONAL_DISPONIBLE` |
| **C. EQUIPO LISTO** | Transición a listo | `EN_REPARACION` → `LISTO`; evento `EQUIPO_LISTO` |

### HECHO — pantallas operativas actuales

| Pantalla | Ruta | Rol FE |
|----------|------|--------|
| Listado OT | `/servicios` | `adminGuard` |
| Alta recepción | `/servicios/nueva` | `adminGuard` |
| **Detalle OT** | `/servicios/:id` | `adminGuard` — hub principal de workflow, cotizaciones, documentos, entrega |
| Detalle cliente | `/clientes/:id` | `adminGuard` — muestra teléfono |
| Portal público | `/consulta/ot/:token` | público |

### HECHO — no existe botón WhatsApp hacia el cliente en panel OT

El único `wa.me` del producto hacia un número fijo de la empresa está en **catálogo público** (`catalogo-ui.ts` → `enlaceWhatsAppProducto`).  
En `consulta-ot-publica` hay `waHref` hacia el **WhatsApp del taller** (contacto empresa), no hacia el cliente.

---

## 2. Ubicación del teléfono

### HECHO — modelo

`Cliente.telefono`:

- Columna `telefono` VARCHAR(40)
- **Nullable** en JPA
- Sin formato canónico persistido (se guarda lo que ingresa el usuario)

### HECHO — obligatoriedad en OT

Al crear OT, `OrdenServicioService` exige documento y teléfono del cliente asociado (validación de negocio).  
Una OT usable para portal/acciones públicas **debería** tener teléfono; clientes legacy incompletos pueden existir fuera de ese flujo.

### HECHO — DTOs

| DTO | ¿Incluye teléfono? |
|-----|-------------------|
| `ClienteRequestDTO` / `ClienteResponseDTO` | **Sí** |
| `OrdenServicioResponseDTO` | **No** (solo `clienteId`, `clienteNombre`) |
| DTOs consulta pública OT/cotización | **No** (correcto: sin PII del cliente) |

### HECHO — pantallas que ya muestran teléfono

- `cliente-detail` — ficha
- `cliente-buscador` — búsqueda
- `cliente-form` / `servicio-form` (alta inline) — captura
- Contacto taller en portal público (no es `Cliente.telefono`)

### HECHO — detalle OT **no** carga el teléfono hoy

`ServicioDetailComponent` consume `OrdenServicioResponseDTO` y enlaza al cliente por `clienteId`, pero **no** invoca `ClienteService` para obtener `telefono`.

### HECHO — normalización existente (backend)

`ClienteIdentidadNormalizer.normalizarTelefono`:

- Solo dígitos
- 10 dígitos empezando en `3` → prefijo `57` (celular CO)
- 12 dígitos con `57` → se conserva
- No persiste; solo comparación / identidad pública

### PROPUESTA — capa Click-to-Chat

La conversión a número `wa.me` debe vivir en **util FE reutilizable** (espejo de la lógica CO), sin mutar el valor almacenado.  
Opcionalmente, en 3.15.9.4-B, enriquecer el DTO de OT con `clienteTelefono` (solo ADMIN autenticado) para evitar un round-trip extra.

---

## 3. Pantallas candidatas

### PROPUESTA — prioridad UX (una sola superficie principal)

| Prioridad | Pantalla | Por qué |
|-----------|----------|---------|
| **P1** | `servicio-detail` (`/servicios/:id`) | El trabajador ya está en el contexto de la OT (recepción, cotización, listo, documentos) |
| P2 | Menú contextual / acciones por estado dentro del mismo detalle | Evita botones genéricos siempre visibles |
| P3 | Post-alta recepción (dialog/toast de éxito en flujo nueva OT) | Útil justo después de crear, si el detalle no es inmediato |
| Evitar | Duplicar en listado + detalle + cliente + cotización comercial | Ruido UX |

### PROPUESTA — visibilidad por contexto (sin implementar)

| Contexto | Cuándo mostrar acción | Plantilla |
|----------|----------------------|-----------|
| Tras recepción / estado `RECEPCIONADO` (y posteriores) | “WhatsApp — recepción” o acción genérica “Avisar por WhatsApp” con plantilla según estado | RECEPCIÓN |
| Cotización presentada / `PENDIENTE_APROBACION` | “WhatsApp — cotización” | COTIZACIÓN |
| Estado `LISTO` | “WhatsApp — equipo listo” | EQUIPO LISTO |

**INFERENCIA:** Un único control “WhatsApp” en cabecera de OT que elija plantilla según `orden.estado` (y cotización pendiente si aplica) reduce duplicación. Alternativa: tres acciones explícitas en el menú “Más acciones”.

### DECISIÓN — documentos

No adjuntar PDF. El mensaje solo lleva URL al portal. El cliente consulta estado/cotización/documentos permitidos allí.

---

## 4. Roles

### HECHO

| Capa | Realidad |
|------|----------|
| Backend OT / Cliente / Cotización servicio / Documentos | `@PreAuthorize("hasRole('ADMIN')")` |
| Frontend rutas panel | `adminGuard` → `AuthService.esAdmin()` (`rol === 'ADMIN'`) |
| Rol **TÉCNICO** | **No aparece** en guards, nav ni controllers de servicio técnico |

### INFERENCIA

Hoy solo **ADMIN** puede ver OT, cliente y teléfono en panel.  
El botón WhatsApp asistido **no** abre un canal nuevo de datos: solo usa lo que ADMIN ya puede ver.

### PROPUESTA

En 3.15.9.4-B: habilitar solo para usuarios que ya pasan `adminGuard` / JWT ADMIN.  
Si en el futuro existe TÉCNICO con acceso a OT+teléfono, reutilizar la misma regla de “solo si ya puede ver el teléfono”.

### INCERTIDUMBRE

Si el negocio espera TÉCNICO operativo ya, **no está modelado** en este repositorio; no inventar el rol en B sin fase de roles.

---

## 5. URL pública

### HECHO — fuente de verdad actual (backend)

Propiedad:

```properties
solvix.frontend.base-url=https://test.computerelectroniccentersas.com
```

Usada por:

- QR / documentos (`DocumentoOrdenServicioService.urlConsultaOt`)
- Notificaciones (`NotificationService.urlConsultaOt`)

Formato:

```
{solvix.frontend.base-url}/consulta/ot/{tokenConsulta}
```

### HECHO — frontend environment

`environment.ts` / `environment.development.ts` solo exponen:

- `apiOrigin`
- `apiBaseUrl`

**No** existe `publicWebBaseUrl` / equivalente.

### RIESGO / PROPUESTA

Si el botón se construye en FE con `window.location.origin` en desarrollo local → el mensaje llevaría `http://localhost:4200/...` (incorrecto para el cliente).

**PROPUESTA 3.15.9.4-B:**

1. Añadir `publicWebBaseUrl` a `environment*.ts` (prod/test = dominio público del FE; local = mismo dominio público de test **o** localhost solo para demos internas).
2. **No** usar `apiBaseUrl` / `apiOrigin` para el enlace del cliente.
3. Alinear el valor con `solvix.frontend.base-url` del backend (misma URL que el QR).

### HECHO — token

Reutilizar `tokenConsulta` existente. No regenerar. No crear token WhatsApp.

### GAP — token no expuesto al panel ADMIN hoy

`OrdenServicioResponseDTO` **no** incluye `tokenConsulta`.  
El ADMIN puede regenerar/ver el QR vía documentos (PDF con QR embebido), pero el FE **no** tiene hoy un campo listo para armar la URL sin enriquecer DTO o endpoint.

**PROPUESTA B (mínima):** agregar `tokenConsulta` (y opcionalmente `clienteTelefono`) a `OrdenServicioResponseDTO` — solo en API autenticada ADMIN. No es endpoint público nuevo de consulta; es enriquecer respuesta ya protegida.

---

## 6. Formato Click-to-Chat

### HECHO — precedente en el repo

```ts
// catalogo-ui.ts
`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
```

```ts
// consulta-ot-publica.ts — solo dígitos, sin text=
`https://wa.me/${digits}`
```

### PROPUESTA — especificación

| Regla | Detalle |
|-------|---------|
| Base | `https://wa.me/<E164_digits>?text=<encodeURIComponent(mensaje)>` |
| Número | Solo dígitos; CO celular 10 dígitos `3XXXXXXXXX` → `57` + dígitos |
| Texto | `encodeURIComponent` (espacios, tildes, saltos `\n`, emojis si se usan) |
| Longitud | Mantener mensajes cortos (< ~1000 chars prácticos); tres plantillas caben holgadas |
| Apertura | `window.open(url, '_blank', 'noopener,noreferrer')` o `<a target="_blank" rel="noopener">` |
| Sin npm | No hace falta librería |

### PROPUESTA — UX si no hay teléfono / número inválido

- Deshabilitar botón + hint: “Registra un teléfono válido en la ficha del cliente”
- No abrir `wa.me` vacío

### Experiencia desktop / móvil

| Entorno | Comportamiento típico |
|---------|----------------------|
| Móvil con app | Abre WhatsApp con chat + texto |
| Desktop con WhatsApp Desktop / Web | Abre app o WhatsApp Web |
| Sin WhatsApp | El navegador muestra página de Meta / error de usuario; SOLVIX no puede “enviar” |

No mostrar spinner “Enviando…”. No marcar notificación `ENVIADA`.

---

## 7. Propuesta de mensajes (plantillas)

Alineadas al enunciado y coherentes con `NotificationTemplateCatalog` (textos del motor, **sin** forzar el dispatcher).

### RECEPCIÓN

```
Hola {nombre} 👋

Recibimos tu equipo en Computer & Electronic Center.

Orden de servicio: {ordenNumero}

Puedes consultar el estado de tu equipo aquí:
{urlConsulta}
```

### COTIZACIÓN

```
Hola {nombre} 👋

Tu cotización ya está disponible.

Cotización: {cotizacionNumero}
Orden de servicio: {ordenNumero}

Puedes revisarla y aprobarla o rechazarla desde este enlace:
{urlConsulta}
```

### EQUIPO LISTO

```
Hola {nombre} 👋

Tu equipo ya está listo para entrega.

Orden de servicio: {ordenNumero}

Consulta los detalles aquí:
{urlConsulta}
```

### Seguridad del contenido

| Incluir | No incluir |
|---------|------------|
| Nombre cliente | Documento / email |
| Número OT / cotización | Costos internos, IDs internos |
| URL pública | JWT, credenciales |
| | Afirmaciones de “recoger hoy” si no hay dato |

**DECISIÓN:** No PDF, no adjuntos, no URLs de PDF públicas nuevas.

**INCERTIDUMBRE menor:** uso de emoji 👋 — el catálogo de notificaciones actual no lo usa; B debe unificar estilo (con o sin emoji) en un solo sitio.

---

## 8. Estrategia de reutilización de textos

### HECHO — textos ya existen en backend (motor)

`NotificationTemplateCatalog` tiene cuerpos WA para `ORDEN_RECIBIDA`, `COTIZACION_DISPONIBLE`, `EQUIPO_LISTO`, etc., con variables `{{clienteNombre}}`, `{{urlConsulta}}`, …

### DECISIÓN arquitectónica (asistido ≠ automático)

WhatsApp **asistido** **no** debe pasar por:

- `NotificationDispatcherService`
- claim `PENDIENTE` → `PROCESANDO`
- `NotificationChannelAdapter`
- estados `ENVIADA` / retries

Es una acción UI manual.

### PROPUESTA — dónde construir mensajes en B

| Opción | Veredicto |
|--------|-----------|
| A. Texto hardcodeado en 3 componentes | **Rechazar** — duplicación |
| B. Servicio Angular + util `buildWhatsAppLink` | **Preferida** |
| C. Solo utilidades puras (sin DI) | Aceptable si no hay estado |
| D. Backend endpoint “dame el wa.me” | Opcional; añade round-trip; útil si se quiere una sola fuente con plantillas Java |
| E. Config DB plantillas | **Fuera de alcance** |

**PROPUESTA concreta B:**

1. Util FE: `whatsapp-asistido.util.ts`  
   - `normalizarTelefonoWa(co)`  
   - `urlConsultaOtPublica(base, token)`  
   - `mensajeRecepcion|Cotizacion|Listo(...)`  
   - `enlaceClickToChat(telefono, mensaje)`
2. Textos **centralizados** en ese util (o constants).
3. Opcional posterior: alinear redacción con `NotificationTemplateCatalog` para no divergir; **sin** invocar el dispatcher.

---

## 9. Relación con 3.15.9.1 / 3.15.9.2

| Pieza | Relación |
|-------|----------|
| `NotificationService` / Event / Templates | Sigue existiendo para automatización futura |
| `NotificationDispatcher` + adapters | **No** usado por Click-to-Chat asistido |
| `Notificacion` persistida | **No** crear fila “ENVIADA” al abrir wa.me |
| Asistido | Acción humana; sin delivery status |

---

## 10. Impact Surface (previsto para B)

| Área | Impacto |
|------|---------|
| FE `servicio-detail` (+ quizá menú acciones) | UI botón / menú |
| FE util WhatsApp + environment `publicWebBaseUrl` | Nuevo |
| BE `OrdenServicioResponseDTO` (+ mapper) | Campos `tokenConsulta`, opcional `clienteTelefono` |
| Tests FE util + detalle | Nuevos |
| Notification* | **Ninguno** (no tocar) |
| QR / PDF / token generation | **Ninguno** |
| Migraciones | **Ninguna** |

---

## 11. Seguridad

### HECHO / PROPUESTA

- Teléfono y token solo vía API ADMIN ya autorizada.
- Mensaje sin PII sensible innecesaria.
- Portal público sigue sin exponer teléfono/documento del cliente.
- No exponer `tokenConsulta` en endpoints `permitAll` nuevos (solo enriquecer DTO ADMIN).

---

## 12. Decisiones pendientes (para cerrar en B o con producto)

1. **`publicWebBaseUrl` en FE:** valor exacto por environment (prod vs local).
2. **Exponer `tokenConsulta` en DTO OT** vs endpoint dedicado mínimo.
3. **¿Incluir `clienteTelefono` en DTO OT** o `GET /clientes/{id}` desde el detalle?
4. **Un botón inteligente vs tres acciones** en el menú.
5. **Emoji** en plantillas: sí/no (unificar con catálogo motor).
6. **Cotización adicional:** ¿misma plantilla COTIZACIÓN o texto “adicional”?
7. **Rol TÉCNICO:** no existe hoy; ¿solo ADMIN en B?

---

## 13. Propuesta de fase 3.15.9.4-B

### Alcance sugerido

1. Environment `publicWebBaseUrl`.
2. Enriquecer `OrdenServicioResponseDTO` con `tokenConsulta` (+ `clienteTelefono` recomendado).
3. Util FE Click-to-Chat + 3 plantillas.
4. Botón(es) en `servicio-detail` según estado / menú.
5. Disabled + mensaje si falta teléfono o token.
6. Tests unitarios del util y smoke del detalle.
7. Docs de implementación.
8. **No** API Meta, **no** dispatcher, **no** PDF, **no** regenerar token.

### Criterios de aceptación B (borrador)

- [ ] Desde OT, ADMIN abre wa.me con número CO correcto
- [ ] Mensaje incluye URL `{publicWebBaseUrl}/consulta/ot/{token}` = misma que QR
- [ ] Plantillas recepción / cotización / listo
- [ ] Sin marcar notificación ENVIADA
- [ ] Sin adjuntos
- [ ] Builds y tests verdes

---

## 14. Criterios de aceptación 3.15.9.4-A

| Criterio | Estado |
|----------|--------|
| Teléfono real del Cliente localizado | **HECHO** |
| Puntos correctos para el botón | **PROPUESTA** (P1 detalle OT) |
| Roles autorizados | **HECHO** (solo ADMIN hoy) |
| Fuente URL pública | **HECHO** backend; **GAP** FE environment |
| tokenConsulta existente | **HECHO**; **GAP** no en DTO panel |
| Ausencia de necesidad de PDF | **DECISIÓN** |
| Estrategia Click-to-Chat | **PROPUESTA** |
| Tres plantillas | **PROPUESTA** |
| Sin duplicación innecesaria | **PROPUESTA** util central |
| Separado de NotificationDispatcher | **DECISIÓN** |
| Sin modificar funcionalidad | **HECHO** (solo docs) |
| Documentación creada | **HECHO** (este archivo) |

---

## 15. Estado de auditoría

**READY** para 3.15.9.4-B, con gaps menores de diseño ya listados (exposición DTO + `publicWebBaseUrl`).
