# SOLVIX Backend — BLOQUE D.2
## Firma digital del cliente en la recepción del equipo

**Fecha:** 2026-09-29  
**Alcance:** recepción firmada al crear la OT + comprobante PDF con firma.  
**Sin cambios** a matriz de workflow, QR, motor PDF, listado Servicios ni firma de entrega (salvo reutilización de almacenamiento).

---

### 1. Modelo de dominio

Dos eventos independientes:

| Evento | Quién | Entidad | Prefijo firma |
|---|---|---|---|
| **Recepción** | Cliente → taller | `RecepcionOrdenServicio` | `/api/v1/ordenes-servicio/recepciones/firmas/` |
| **Entrega** | Taller → cliente | `EntregaOrdenServicio` (sin cambios) | `/api/v1/ordenes-servicio/entregas/firmas/` |

`RecepcionOrdenServicio` (1:1 con OT):

- `ordenServicio` (UNIQUE)
- `fechaRecepcion`
- `usuarioResponsable` (JWT)
- `clienteConfirmo`
- `nombreCliente` / `documentoCliente`
- `firmaUrl`
- `observaciones` (reserva)
- `createdAt`

---

### 2. Persistencia

Tabla `recepciones_orden_servicio` (V14).  
No altera `entregas_orden_servicio` ni columnas de `ordenes_servicio`.

---

### 3. Migración

`src/main/resources/db/migration/V14__recepcion_orden_servicio.sql`

- PK `id`
- FK `orden_servicio_id` → `ordenes_servicio(id)`
- UNIQUE `uk_recepciones_ot_orden`
- Índice `idx_recepciones_ot_orden`

---

### 4. API

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/v1/ordenes-servicio` | Crear OT **con** firma de recepción (campos D.2 en body) |
| `GET` | `/{id}/recepcion` | Consultar constancia de recepción |
| `GET` | `/recepciones/firmas/{archivo}` | Servir PNG (ADMIN) |
| `GET` | `/entregas/firmas/{archivo}` | Sin cambio funcional |

Campos nuevos en `OrdenServicioRequestDTO` (solo validados en `crear`; ignorados en `actualizar`):

- `clienteConfirmoRecepcion` (debe ser `true`)
- `nombreFirmanteRecepcion` (obligatorio)
- `documentoFirmanteRecepcion` (opcional)
- `firmaBase64Recepcion` (PNG Base64 / data URL)

No se creó un endpoint POST `/recepcion` separado: la recepción firmada **es** la creación atómica de la OT en `RECEPCIONADO`.

---

### 5. Transacción

En `OrdenServicioService.crear`:

1. Validar usuario + firma + confirmación + nombre  
2. Guardar PNG (`EntregaFirmaService.guardarFirmaRecepcion`)  
3. Persistir OT (`RECEPCIONADO`)  
4. Persistir `RecepcionOrdenServicio`  
5. Tras commit → generar comprobante (best-effort, igual que antes)

Si falla validación o persistencia, no queda OT “recepcionada” sin registro de firma.  
Orphan PNG posible si falla DB tras write a disco (mismo patrón que entrega).

---

### 6. Almacenamiento de firma

Reutiliza `EntregaFirmaService`:

- Mismo directorio `solvix.servicios.firmas-dir`
- Mismos límites (PNG, ≤ 500 KB, UUID)
- Prefijos públicos distintos → trazabilidad recepción vs entrega
- No sobrescribe archivos previos

---

### 7. Documento

`comprobante-recepcion.html`:

- `${FIRMA_HTML}` en el bloque del cliente
- Textos: «Firma del cliente» / conformidad de recepción
- Sin tocar identidad corporativa, footer, QR, moneda ni autoría

Si no hay recepción (OT legacy): placeholder.  
Acta de entrega sigue usando solo `EntregaOrdenServicio.firmaUrl`.

---

### 8. Seguridad

- Endpoints ADMIN (`@PreAuthorize`)
- Usuario desde JWT
- Firmas no en URLs públicas de consulta
- Consulta pública OT/documento: sin rutas físicas, IDs internos ni costos

---

### 9. Tests

Cubiertos en `OrdenServicioServiceTest` / `DocumentoOrdenServicioServiceTest`:

- A recepción con firma válida  
- B sin firma / sin confirmación → rechazo  
- C–F almacenamiento, asociación OT, fecha, usuario  
- G comprobante generado / regenerado  
- H independencia vs firma entrega  
- K regresión entrega  
- PDF no corrupto + plantillas con vars nuevas  

Helper: `FirmaRecepcionTestSupport`.

---

### 10. Regresión

Workflow `RECEPCIONADO → EN_DIAGNOSTICO → …` intacto.  
Entrega digital, cotizaciones, repuestos y QR sin cambios de contrato.

---

### Archivos clave

- `V14__recepcion_orden_servicio.sql`
- `RecepcionOrdenServicio` + repository + DTO
- `OrdenServicioService.crear` / `obtenerRecepcion`
- `EntregaFirmaService` (prefijo recepción)
- `DocumentoOrdenServicioService.crearComprobanteRecepcionNuevo`
- `comprobante-recepcion.html`
- `OrdenServicioController`
