# SOLVIX Backend — FASE 3.15.9.1
## Motor de eventos de notificación

**Fecha:** 2026-10-01  
**Alcance:** dominio interno de notificaciones.  
**Fuera de alcance:** WhatsApp/Meta/Twilio, Email SMTP de envío, SMS, colas, Redis, UI admin, frontend.

---

### 1. Contexto

SOLVIX tiene workflow completo de OT, PDFs, token público y consulta `/consulta/ot/{token}`.  
No existía infraestructura de notificaciones (sin `ApplicationEvent` de negocio, sin tablas de mensajes).

### 2. Objetivo

Desacoplar **eventos de negocio** de canales futuros:

```text
EVENTO DE NEGOCIO
      ↓
NotificationEventBridge (publish Spring event)
      ↓  AFTER_COMMIT
OrdenServicioNotificacionListener
      ↓
NotificationService.publish
      ↓
NotificationTemplate + render
      ↓
Notificacion (PENDIENTE)
      ↓  (futuro)
Canal WHATSAPP / EMAIL
```

### 3. Arquitectura

| Pieza | Rol |
|-------|-----|
| `TipoEventoNotificacion` | Catálogo tipado de eventos |
| `CanalNotificacion` | WHATSAPP / EMAIL |
| `EstadoNotificacion` | PENDIENTE…CANCELADA (ciclo de la notificación, **no** de la OT) |
| `Notificacion` | Entidad persistente |
| `NotificationEvent` | Payload tipado sin datos sensibles |
| `NotificationTemplateCatalog` | Plantillas en código |
| `NotificationTemplateRenderer` | `{{variables}}` |
| `NotificationService` | `publish` / idempotencia / URL pública |
| `NotificationEventBridge` | Puente desde Servicios sin conocer el canal |
| `OrdenServicioNotificacionListener` | `@TransactionalEventListener(AFTER_COMMIT)` |

`OrdenServicioService` / `CotizacionServicioService` **no** llaman a WhatsApp.

### 4. Eventos

| Evento | Disparador |
|--------|------------|
| `ORDEN_RECIBIDA` | `OrdenServicioService.crear` |
| `DIAGNOSTICO_COMPLETADO` | `completarDiagnostico` |
| `COTIZACION_DISPONIBLE` | `presentar` cotización INICIAL |
| `COTIZACION_ADICIONAL_DISPONIBLE` | `presentar` cotización ADICIONAL |
| `EQUIPO_LISTO` | `completarReparacion` |
| `EQUIPO_ENTREGADO` | `registrarEntrega` (tras paso a ENTREGADO) |

No se notifican cambios menores ni cada transición de la matriz.

### 5–6. Notification / estados

Persistencia: tabla `notificaciones` (Flyway `V15__notificaciones.sql`).  
Estado inicial: **PENDIENTE**. Sin envío externo en esta fase.

### 7. Canales

Enum `WHATSAPP` | `EMAIL`.  
`canalesActivos()` hoy: solo **WHATSAPP** (materializa filas PENDIENTES). EMAIL listo para siguiente bloque.

### 8–9. Plantillas / variables

Códigos `*_WA_V1`. Variables públicas:

`clienteNombre`, `ordenNumero`, `equipo`, `estado`, `etapaPublica`, `urlConsulta`, `cotizacionNumero`, `fecha`

Bloqueadas si vienen en extras: `ordenId`, `costoInterno`, `stock`, `proveedor`, `jwt`, `password`, `firma`, …

### 10. Idempotencia

`idempotency_key` único:

```text
{EVENTO}:ot:{ordenId}:{CANAL}[:cot:{cotizacionId}]
```

Segundo `publish` no duplica; carrera → `DataIntegrityViolationException` absorbida.

### 11. Transacciones

1. Negocio publica `OrdenServicioNotificacionSolicitadaEvent` **dentro** de su `@Transactional`.  
2. Listener **AFTER_COMMIT** → `publishDesdeOrden` con `REQUIRES_NEW`.  
3. Rollback del negocio → **no** se crea notificación (probado).

Patrón alineado con PDF `afterCommit` existente.

### 12. Seguridad

No se persisten JWT, firmas binarias, costos ni stock.  
`error_resumen` preparado (máx. 500) para fases de envío; sin stack traces de negocio.

### 13. Persistencia

Ver migración V15: FK a `ordenes_servicio` y `clientes`, índices por orden/cliente/estado/evento, CHECK de enums.

### 14. Integración futura WhatsApp

Próximo bloque puede:

- leer `notificaciones` en `PENDIENTE`
- marcar `PROCESANDO` → `ENVIADA` / `FALLIDA`
- implementar `WhatsAppChannelAdapter` sin tocar el workflow

### 15. Tests

`NotificationServiceTest`: catálogo, renderer, publish PENDIENTE, idempotencia, disparo al crear OT / diagnóstico, rollback sin notificación.

### 16. Limitaciones

- Sin envío real  
- Sin UI  
- Sin EMAIL activo  
- Sin reintentos distribuidos / colas  

### 17. Próximo bloque

3.15.9.2 — adaptador de canal (WhatsApp sandbox / proveedor) + procesamiento de cola PENDIENTE.
