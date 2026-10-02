# SOLVIX Backend — FASE 3.15.9.3-B
## Contrato + backend para acciones públicas de cotización

**Fecha:** 2026-10-01  
**Precondición:** 3.15.9.3-A (auditoría)

| Etiqueta | Uso |
|----------|-----|
| **HECHO** | Ya existía en el repo |
| **DECISION** | Cerrada en esta fase |
| **IMPLEMENTADO** | Entregado aquí |
| **NO IMPLEMENTADO** | Fuera de alcance |

---

### 1. Contrato

**DECISION:** acciones públicas mutativas bajo el mismo prefijo de consulta, alineadas al GET singular `/cotizacion` (sin exponer `cotizacionId` en URL → reduce IDOR).

### 2. Endpoints finales

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/v1/consulta/ot/{token}/cotizacion/aprobar` | pública + identidad |
| POST | `/api/v1/consulta/ot/{token}/cotizacion/rechazar` | pública + identidad |

**NO abiertos:**  
`/api/v1/ordenes-servicio/{ordenId}/cotizaciones/{id}/aprobar|rechazar` (siguen ADMIN).

GET existentes sin cambio.

### 3. Request / response

**Request** `AccionPublicaCotizacionRequestDTO`:

```json
{
  "numeroDocumento": "1.098.765.432",
  "telefono": "+57 300 123 4567",
  "observacion": "opcional al rechazar"
}
```

**Response** `AccionPublicaCotizacionResponseDTO`:

- `ordenNumero`, `ordenEstado`
- `cotizacionNumero`, `cotizacionTipo`, `cotizacionEstado`
- `mensaje`

Sin PII del cliente, sin IDs internos.

### 4. Normalización — IMPLEMENTADO

`ClienteIdentidadNormalizer`

| Campo | Regla |
|-------|-------|
| Documento CC/NIT/NINGUNO | Solo dígitos |
| CE / PASAPORTE | Alfanumérico mayúsculas |
| Teléfono | Dígitos; `3XXXXXXXXX` ↔ `57` + 10 dígitos |

Comparación **en memoria**; no reescribe filas históricas.

### 5. Validación de identidad — IMPLEMENTADO

```text
token → OrdenServicio → Cliente
comparar documento+teléfono normalizados (ambos)
```

No busca Cliente global por documento.  
Fuente: `Cliente.numeroDocumento` / `Cliente.telefono` (no recepción).

### 6. Rate limiting — IMPLEMENTADO

`PublicActionRateLimiter` en memoria:

- Clave: `cot-accion:{token}|{IP}`
- Default prod: 8 intentos / 300 s (`solvix.consulta.rate-limit.*`)
- Tests: 5 / 60 s
- Exceso → HTTP **429**

**Limitación:** no compartido entre instancias JVM; se reinicia al redeploy.

### 7. Actor público — DECISION / IMPLEMENTADO

Constante: `CLIENTE_PUBLICO`  
Se pasa a `CotizacionServicioService.aprobar|rechazar` como `usuario`.  
Queda en `usuarioAprobacion` / `usuarioRechazo` e historial de OT.

### 8. Errores

| Caso | HTTP | Mensaje |
|------|------|---------|
| Identidad inválida / incompleta | 403 | `No pudimos validar la información ingresada.` |
| Token / sin cotización pendiente | 404 | genérico (misma familia que GET) |
| Rate limit | 429 | Demasiados intentos… |
| Workflow (estado inválido, etc.) | 400 | `BusinessException` existente |

No se revela qué campo falló.

### 9. Seguridad

Cadena: token → OT → cotización publicable de esa OT → Cliente OT → identidad → dominio.  
SecurityConfig: `POST /api/v1/consulta/**` permitAll (solo existen estos POST).

### 10–11. Flujos

Reutilizan `CotizacionServicioService`:

- Aprobar INICIAL → OT `APROBADO`
- Rechazar INICIAL → OT `COTIZADO`
- Aprobar ADICIONAL → OT `EN_REPARACION`
- Rechazar ADICIONAL → OT `REQUIERE_APROBACION_ADICIONAL`

### 12. Obligatoriedad documento/teléfono — IMPLEMENTADO

En `OrdenServicioService.resolverClienteActivoParaTaller`:  
cliente de taller debe tener `numeroDocumento` y `telefono`.  
`CONSUMIDOR_FINAL` sigue prohibido en OT.  
**No** se forzó NOT NULL global en tabla `clientes` (ventas/otros escenarios intactos).

### 13. Pruebas

- `ClienteIdentidadNormalizerTest`
- `ConsultaPublicaCotizacionAccionServiceTest` (identidad, formatos, rate limit, workflow INICIAL/ADICIONAL, regresión ADMIN/GET)

### 14. Decisiones arquitectónicas

1. URL singular `/cotizacion` sin id (coherente con GET).
2. Actor `CLIENTE_PUBLICO`.
3. Rate limit in-memory mínimo.
4. Gate de doc/tel en asociación OT, no migración destructiva.

### 15. Limitaciones / NO IMPLEMENTADO

- UI portal (FE)
- Rate limit distribuido
- Rotación/expiración de token
- WhatsApp/SMS/OTP/PIN
- Obligar documento/teléfono en alta comercial global vía DB

---

### Archivos clave

| Nuevo | Rol |
|-------|-----|
| `ClienteIdentidadNormalizer` | Normalización |
| `PublicActionRateLimiter` | Anti-abuso |
| `ConsultaPublicaCotizacionAccionService` | Fachada pública |
| `AccionPublicaCotizacionRequestDTO` / `ResponseDTO` | Contrato |
