# SOLVIX Backend — BLOQUE C.2
## Contrato honesto de Presentar + documento

**Fecha:** 2026-09-28  
**Alcance:** Cotización comercial. Sin @Async, sin colas, sin estados de documento en BD.

---

### Separación negocio / documento

| Resultado | Significado |
|---|---|
| HTTP 200 Presentar | La cotización quedó en `PENDIENTE_APROBACION` |
| `documentoGenerado=true` | El PDF de **esa** operación se generó |
| `documentoGenerado=false` | Negocio OK; PDF falló; `documentoVigente=null` en la respuesta |

Fallo PDF **no** revierte el estado ni limpia `fechaPresentacion`.

---

### Orquestación

1. `TransactionTemplate` — validar + persistir PENDIENTE + **commit**.  
2. `REQUIRES_NEW` — `documentoService.generar` (captura error → `false`).  
3. Lectura — armar `CotizacionComercialResponseDTO` con flags honestos.

Se eliminó el `afterCommit` registrado **dentro** del mismo `@Transactional` de Presentar, porque impedía conocer el resultado del PDF al construir la respuesta.

---

### Recuperación

`POST /{id}/documentos` (≠ BORRADOR) → genera v1 o N+1. Errores sí llegan al cliente.

### Versiones

Sin cambios: v1 al presentar; editar → BORRADOR conserva docs; re-presentar → v2.

### Futuro async

El flag `documentoGenerado` / `documentoVigente` ya permite al FE ramificar “PDF listo / pendiente”. Un job asíncrono podría devolver `false` + poll; **no** está implementado aquí.
