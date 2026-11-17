# SOLVIX Backend — FASE 3.15.9.2
## Adaptador y dispatcher de canales para notificaciones

**Fecha:** 2026-10-01  
**Alcance:** contrato de canal + dispatcher + claim atómico.  
**Fuera de alcance:** WhatsApp/Meta/Twilio reales, Email SMTP, colas, `@Scheduled`, UI, frontend.

---

### 1. Contexto

3.15.9.1 materializa `Notificacion` en estado `PENDIENTE` tras eventos AFTER_COMMIT.  
Esta fase procesa esas filas mediante un canal desacoplado, **sin** proveedores externos.

### 2. Arquitectura

```text
Notificacion (PENDIENTE)
        ↓
NotificationDispatcherService.dispatch(id)
        ↓ claim atómico
PENDIENTE → PROCESANDO
        ↓
NotificationChannelRegistry.resolve(canal)
        ↓
NotificationChannelAdapter.send(...)   ← fuera de TX BD
        ↓
NotificationSendResult
        ↓ TX corta
ENVIADA | FALLIDA
```

`NotificationService.publish` y el workflow de OT **no cambian**.

### 3. Dispatcher

`NotificationDispatcherService`

| Método | Rol |
|--------|-----|
| `dispatch(Long id)` | Reclama, resuelve adapter, envía, finaliza |

No crea notificaciones. No hay batch/scheduler.

### 4. Adapter contract

```java
interface NotificationChannelAdapter {
  String codigo();
  CanalNotificacion canal();
  boolean supports(CanalNotificacion canal);
  NotificationSendResult send(Notificacion n);
}
```

### 5. Registry / resolver

`NotificationChannelRegistry` inyecta `List<NotificationChannelAdapter>` y resuelve con `supports(...)`.

En producción (3.15.9.2): **lista vacía** → no hay adapter real.

### 6. Estados

| Transición | Condición |
|------------|-----------|
| PENDIENTE → PROCESANDO | Claim atómico exitoso |
| PROCESANDO → ENVIADA | `sendResult.success` |
| PROCESANDO → FALLIDA | fallo adapter / sin adapter / excepción |
| PENDIENTE → CANCELADA | (fuera de este bloque; se respeta) |

No se reprocesan: `ENVIADA`, `FALLIDA`, `CANCELADA`, ni `PROCESANDO` ajeno.

### 7. Concurrencia

`UPDATE ... SET estado=PROCESANDO WHERE id=? AND estado=PENDIENTE`  
Solo un hilo obtiene `rows=1`. El resto recibe skip (`YA_ENVIADA` / `EN_PROCESO` / etc.).

Sin locking distribuido.

### 8. Idempotencia

- Claim atómico evita doble envío.
- Segundo `dispatch` sobre `ENVIADA`/`FALLIDA` → `skipped` sin llamar al adapter.

### 9. Error handling

| Caso | Código | Estado |
|------|--------|--------|
| Canal sin adapter | `CANAL_SIN_ADAPTER` | FALLIDA (nunca ENVIADA) |
| Adapter falla controlado | código del adapter | FALLIDA |
| Excepción inesperada | `ADAPTER_EXCEPTION` | FALLIDA |

Mensaje sin adapter (ejemplo):

> No existe un adaptador configurado para el canal WHATSAPP.

Un fallo de notificación **no** altera `EstadoOrdenServicio`.

### 10. Fake adapter

`ControllableFakeWhatsAppAdapter` vive en **`src/test`**.  
Se registra solo vía `@TestConfiguration` del test del dispatcher.  
No es bean de producción → no marca `ENVIADA` en runtime real.

### 11. Transacciones

1. TX corta: claim  
2. **Sin TX**: `adapter.send` (lista para HTTP futuro)  
3. TX corta: persistir `ENVIADA`/`FALLIDA`

### 12. Seguridad

Logs: `notificacionId`, `ot`, `canal`, `adapter`, `estado`.  
Sin JWT, passwords ni cuerpo completo del mensaje.

### 13. Qué NO implementa

- Proveedores reales  
- `@Async` / colas / cron  
- Retry automático  
- UI / frontend  
- Cambios a OT, PDFs, QR, inventario  

### 14. Integración futura WhatsApp

Próximo bloque:

```text
WhatsAppNotificationAdapter implements NotificationChannelAdapter
```

Registrarlo como `@Component` basta para que el registry lo resuelva.  
Sin tocar `OrdenServicioService` ni `NotificationService.publish`.

### 15. Persistencia

`V16__notificaciones_dispatch.sql`:

- `adapter_codigo`
- `proveedor_mensaje_id`

V15 no se modifica.

### 16. Tests

`NotificationDispatcherServiceTest`: éxito, fallo, sin adapter, no reprocesar ENVIADA/FALLIDA/CANCELADA, concurrencia, excepción, OT intacta, provider id.

Regresión: `NotificationServiceTest`, `OrdenServicioServiceTest`, `CotizacionServicioServiceTest`.

### 17. Limitaciones / próximo bloque

Sin envío real ni worker.  
**3.15.9.3** — `WhatsAppNotificationAdapter` + credenciales/sandbox + (opcional) worker de pendientes.
