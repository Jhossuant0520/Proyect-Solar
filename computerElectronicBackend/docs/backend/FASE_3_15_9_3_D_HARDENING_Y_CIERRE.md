# SOLVIX Backend — FASE 3.15.9.3-D
## Hardening, E2E, seguridad y cierre del portal público de cotizaciones

**Fecha:** 2026-10-01  
**Tipo:** verificación, endurecimiento mínimo y cierre.  
**No-goals respetados:** sin WhatsApp/SMS/OTP/PIN, sin Redis, sin nueva máquina de estados, sin cambios de QR/PDF, sin nuevos canales de notificación.

Convención:

| Etiqueta | Significado |
|----------|-------------|
| **HECHO** | Implementado / presente en código |
| **PRUEBADO** | Cubierto por test o verificación explícita |
| **CORREGIDO** | Hallazgo real corregido en esta fase |
| **RIESGO** | Limitación conocida o pendiente fuera de alcance |
| **LIMITACION** | Restricción de diseño/infra aceptada |
| **NO IMPLEMENTADO** | Fuera de alcance de D |

---

## 1. Objetivo

Verificar y cerrar el flujo completo:

QR / URL pública → consulta OT → consulta cotización → aprobar/rechazar →
validación documento + teléfono → dominio → historial → consulta actualizada

Sin agregar funcionalidades nuevas.

---

## 2. Baseline (estado real post 3.15.9.3-C)

### HECHO — Backend (3.15.9.3-B)

| Pieza | Ubicación |
|-------|-----------|
| POST público aprobar/rechazar | `ConsultaPublicaController` → `/api/v1/consulta/ot/{token}/cotizacion/aprobar\|rechazar` |
| Servicio | `ConsultaPublicaCotizacionAccionService` |
| Identidad | `ClienteIdentidadNormalizer` + mensaje genérico 403 |
| Rate limit | `PublicActionRateLimiter` — prod `8/300s` por `token\|IP` |
| Actor | `CLIENTE_PUBLICO` |
| Seguridad | `SecurityConfig`: GET+POST `/api/v1/consulta/**` `permitAll`; resto JWT |
| ADMIN | `CotizacionServicioController` bajo `/ordenes-servicio/...` autenticado |

### HECHO — Frontend (3.15.9.3-C)

| Pieza | Ubicación |
|-------|-----------|
| Portal | `ConsultaOtPublicaComponent` |
| Panel identidad | documento + teléfono, loading, anti doble submit |
| Errores | `mensajeErrorAccionPublicaCotizacion` |

### HECHO — Diseño anti cotización cruzada

La API pública **no recibe `cotizacionId`**. Resuelve la cotización `PENDIENTE_APROBACION` de la OT del token. No es posible operar OT-B con token de OT-A vía path de cotización.

### HECHO — Notificaciones

`notificationEventBridge` se dispara en **presentar**, no en aprobar/rechazar. 3.15.9.3 no añade canales.

---

## 3. Pruebas realizadas

### PRUEBADO — Suite existente B

`ConsultaPublicaCotizacionAccionServiceTest`

- Aprobar/rechazar INICIAL y ADICIONAL
- Identidad incorrecta (doc / tel) → 403 genérico
- Formatos equivalentes
- Token inexistente → 404
- Rate limit → 429 (perfil test `5/60s`)
- Regresión ADMIN aprobar
- Regresión GET consulta

### PRUEBADO — Suite hardening D

`ConsultaPublicaCotizacionHardeningTest`

- E2E aprobación + historial `CLIENTE_PUBLICO` + GET sin acciones
- E2E rechazo + consulta actualizada
- Ambos datos incorrectos sin enumeración
- Token truncado / alterado / con espacios
- Token de otra OT + identidad cruzada
- GET sin PII de cliente
- ADMIN gana sobre cliente stale
- Doble aprobación secuencial (segunda falla, 1 historial)
- Aprobar luego rechazar (segunda falla)
- Regresión ADMIN presentar/aprobar/rechazar con actor administrativo

### PRUEBADO — Frontend

- Specs `consulta-ot-publica.spec.ts` (panel, 403/429, éxito)
- Mapeo **409** añadido en util de errores

### Nota de rendimiento de tests

**LIMITACION:** cada `crear OT` / `presentar` genera PDF real (`openhtmltopdf`, ~15–80 s). Suites grandes tardan decenas de minutos en esta máquina. No se deshabilitó PDF en esta fase (fuera de alcance / riesgo de ocultar regresiones de documento).

---

## 4. Resultados (seguridad)

| Caso | Resultado |
|------|-----------|
| Doc OK + tel malo | **PRUEBADO** 403 genérico |
| Doc malo + tel OK | **PRUEBADO** 403 genérico |
| Ambos malos | **PRUEBADO** mismo mensaje |
| Formatos equivalentes | **PRUEBADO** aceptados |
| Enumeración por mensaje | **PRUEBADO** no filtra campo |
| Token inválido/truncado/alterado | **PRUEBADO** 404 |
| Token con espacios | **PRUEBADO** trim OK |
| Cotización cruzada por ID | **HECHO** mitigado por diseño (sin `cotizacionId` en URL) |
| Identidad cruzada token OT-B | **PRUEBADO** 403; OT-A intacta |

---

## 5. Rate limiting

| Ítem | Estado |
|------|--------|
| Prod `8` intentos / `300` s | **HECHO** `application.properties` |
| Clave `cot-accion:token\|IP` | **HECHO** |
| Fallidos consumen cupo | **HECHO** (consume antes de identidad) |
| Respuesta 429 | **HECHO** / **PRUEBADO** (test usa 5/60) |
| Mensaje FE genérico | **PRUEBADO** |
| Memoria JVM | **LIMITACION** no compartido entre instancias; se reinicia al reiniciar app |
| Redis | **NO IMPLEMENTADO** (explícito) |

---

## 6. Concurrencia

### CORREGIDO — bloqueo pesimista

`CotizacionServicioRepository.findByIdAndOrdenServicioIdForUpdate` + uso en `aprobar`/`rechazar` del dominio.

### CORREGIDO — conflicto público → 409

`ConsultaPublicaCotizacionAccionService` traduce `BusinessException` de estado a `409` con mensaje genérico no técnico.

### PRUEBADO

- Segunda aprobación / rechazo tras éxito → 404 o 409; estado coherente; un solo historial público.
- ADMIN aprueba primero → cliente no duplica transición; actor ADMIN preservado.

### RIESGO

Prueba multi-hilo verdadera no se dejó en CI (coste + riesgo de deadlock H2 prolongado). La protección en runtime es el lock pesimista; la suite valida el camino de estado obsoleto de forma secuencial.

---

## 7. Regresión ADMIN

| Chequeo | Estado |
|---------|--------|
| Presentar / aprobar / rechazar ADMIN | **PRUEBADO** |
| Actor ≠ `CLIENTE_PUBLICO` | **PRUEBADO** |
| Endpoints ADMIN no públicos | **HECHO** (`anyRequest().authenticated()`) |
| Separación ADMIN vs público | **HECHO** |

---

## 8. Frontend / responsive / a11y

| Área | Estado |
|------|--------|
| Botones solo con cotización accionable | **HECHO** / **PRUEBADO** |
| Loading + disable + anti doble submit | **HECHO** / **PRUEBADO** |
| Refresh post éxito | **HECHO** / **PRUEBADO** |
| Errores 403/429/409 | **HECHO** / **PRUEBADO** |
| Labels + `role="alert"` + reduced motion | **HECHO** (código C) |
| Responsive 320–desktop | **HECHO** breakpoints existentes; sin rediseño en D (sin hallazgo visual bloqueante) |

---

## 9. HTTP observados (portal)

| Código | Uso |
|--------|-----|
| 400 | Validación Bean Validation / `BusinessException` ADMIN |
| 403 | Identidad inválida (público) |
| 404 | Token / sin cotización pendiente |
| 409 | Estado obsoleto tras carrera / segunda acción |
| 429 | Rate limit |
| 401 | ADMIN sin JWT (no portal) |

No se exponen stack traces al portal.

---

## 10. Seguridad de datos (PII)

### PRUEBADO

DTO públicos sin `Cliente.numeroDocumento`, `telefono` del cliente, `email`, IDs internos de producto/costos admin.

Contacto del **taller** permanece (diseñado).

---

## 11. Notificaciones

### HECHO / PRUEBADO por inspección

Aprobar/rechazar no llaman `notificationEventBridge`. No se añadieron canales. Infra 3.15.9.1 / 3.15.9.2 intacta.

---

## 12. Hallazgos y correcciones

| # | Hallazgo | Acción |
|---|----------|--------|
| 1 | Sin `@Version` / lock en aprobar-rechazar → carrera teórica de doble transición | **CORREGIDO** lock pesimista |
| 2 | Segunda acción concurrente podía filtrar `BusinessException` 400 técnico | **CORREGIDO** → 409 genérico + FE |
| 3 | Tests concurrentes multi-hilo demasiado costosos/frágiles con PDF+H2 | Sustituidos por secuenciales; lock queda en runtime |

---

## 13. Riesgos pendientes

| Riesgo | Nota |
|--------|------|
| Rate limit in-memory multi-instancia | Documentado; Redis fuera de alcance |
| PDF síncrono en tests/al presentar | Embotella CI local; no tocado en D |
| Concurrencia extrema bajo carga | Mitigada con lock; carga real no instrumentada aquí |

---

## 14. Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| Flujo aprobación inicial E2E | **PRUEBADO** |
| Flujo rechazo inicial E2E | **PRUEBADO** |
| Aprobación/rechazo adicional | **PRUEBADO** (suite B) |
| Identidad incorrecta bloqueada | **PRUEBADO** |
| Sin enumeración | **PRUEBADO** |
| Cotización cruzada bloqueada | **HECHO** por diseño + **PRUEBADO** identidad cruzada |
| Token inválido | **PRUEBADO** |
| Rate limit | **PRUEBADO** |
| ADMIN OK / protegido | **PRUEBADO** / **HECHO** |
| Sin doble transición | **CORREGIDO** + **PRUEBADO** |
| Backend prevalece sobre FE | **PRUEBADO** |
| Sin PII extra | **PRUEBADO** |
| Notificaciones no rotas | **HECHO** inspección |
| Docs | **HECHO** este archivo |

*(Evidencia de build/tests finales: completar en sección 15 al cerrar la corrida.)*

---

## 15. Evidencia final de ejecución

| Suite | Resultado |
|-------|-----------|
| `ConsultaPublicaCotizacionHardeningTest` | **PASS** — Tests run: 10, Failures: 0, Errors: 0 (~934 s; cuello de botella PDF) |
| `ConsultaPublicaCotizacionAccionServiceTest` | **PASS** — Tests run: 13, Failures: 0, Errors: 0 (~140 s) |
| FE specs `consulta-ot-publica` | **PASS** — TOTAL: 15 SUCCESS |
| Build backend `mvn -DskipTests package` | **PASS** — BUILD SUCCESS |
| Build frontend `ng build --configuration=production` | **PASS** — Application bundle generation complete (~26 s) |

---

## 16. Estado de fase

**PASS WITH RISKS**

Riesgos documentados y aceptados:

1. Rate limit in-memory: no compartido entre instancias; se reinicia con la JVM.
2. Generación PDF síncrona embotella tests E2E locales (no tocada en D).
3. Concurrencia validada en CI de forma secuencial; protección runtime = lock pesimista + 409.
