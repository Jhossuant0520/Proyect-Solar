# SOLVIX Backend — FASE 3.15.9.3-A
## Auditoría de validación de cliente en portal público

**Fecha:** 2026-10-01  
**Tipo:** auditoría y diseño únicamente.  
**NO implementado en esta fase:** código, migraciones, UI, endpoints nuevos.

Convención de lectura:

| Etiqueta | Significado |
|----------|-------------|
| **HECHO** | Evidencia directa del repositorio |
| **INFERENCIA** | Conclusión derivada del código |
| **PROPUESTA** | Diseño sugerido para la subfase siguiente |
| **INCERTIDUMBRE** | No determinable solo con el código |

---

## 1. Estado actual encontrado

### HECHO — consulta pública OT

| Capa | Ubicación |
|------|-----------|
| Ruta FE | `consulta/ot/:token` → `ConsultaOtPublicaComponent` (sin `authGuard`) |
| API | `GET /api/v1/consulta/ot/{token}` |
| API cotización | `GET /api/v1/consulta/ot/{token}/cotizacion` |
| Controller | `ConsultaPublicaController` |
| Service | `DocumentoOrdenServicioService.consultaOtPublica` / `consultaCotizacionOtPublica` |
| Lookup | `OrdenServicioRepository.findByTokenConsulta` |
| Seguridad | `SecurityConfig`: solo `HttpMethod.GET` sobre `/api/v1/consulta/**` → `permitAll()` |

### HECHO — aprobación / rechazo de cotización de OT

| Acción | Endpoint | Auth |
|--------|----------|------|
| Aprobar | `POST /api/v1/ordenes-servicio/{ordenId}/cotizaciones/{cotizacionId}/aprobar` | JWT + `@PreAuthorize("hasRole('ADMIN')")` |
| Rechazar | `POST .../rechazar` | Idem |
| Presentar | `POST .../presentar` | Idem |
| Anular | **No existe** para `CotizacionServicio` (sí existe en cotización comercial) |

Comentario explícito en backend (`DocumentoOrdenServicioService`):

> “Solo lectura: aprobar o rechazar sigue siendo presencial o por el taller.”

UI pública (`consulta-ot-publica.html`):

> “Esta consulta solo te permite ver la cotización. Para aprobar o rechazar, contacta al taller.”

### HECHO — no hay endpoints públicos mutativos de cotización OT

No existe `POST /api/v1/consulta/ot/{token}/...` para aprobar/rechazar.

---

## 2. Entidades involucradas

### HECHO — `Cliente` (`clientes`)

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | BIGINT | NO | PK |
| `tipoCliente` | enum | NO | PERSONA / EMPRESA / CONSUMIDOR_FINAL |
| `tipoDocumento` | enum | SÍ | CC, NIT, CE, PASAPORTE, NINGUNO |
| `numeroDocumento` | VARCHAR(40) | SÍ | Unique compuesto con `tipo_documento` |
| `nombre` | VARCHAR(150) | NO | Obligatorio |
| `email` | VARCHAR(150) | SÍ | |
| `telefono` | VARCHAR(40) | SÍ | **No se llama `celular`** |
| `notas` | VARCHAR(500) | SÍ | |
| `activo` | boolean | NO | |

Índices/constraints (V1): `uk_clientes_documento (tipo_documento, numero_documento)`, `idx_clientes_activo`, `idx_clientes_tipo`.

### HECHO — `OrdenServicio`

- `cliente` → `@ManyToOne(optional = false)` (FK NOT NULL)
- `equipo` → `@ManyToOne(optional = false)`
- `tokenConsulta` → VARCHAR(64), NOT NULL, UNIQUE
- Generación en `@PrePersist`: `UUID.randomUUID().toString().replace("-", "")` (32 hex)

### HECHO — `RecepcionOrdenServicio`

- `documentoCliente` VARCHAR(50): documento del **firmante de recepción**, no necesariamente el `Cliente.numeroDocumento`
- No guarda teléfono

### HECHO — `CotizacionServicio`

- Pertenece a una `OrdenServicio`
- Estados relevantes: `BORRADOR`, `PENDIENTE_APROBACION`, `APROBADA`, `RECHAZADA`
- Auditoría interna: `usuarioAprobacion` / `usuarioRechazo` + fechas (string del principal JWT admin)

### HECHO — `Equipo`

- Pertenece a un `Cliente`; la OT exige que equipo y cliente coincidan al crear

---

## 3. Flujo actual de consulta pública

```text
QR / URL /consulta/ot/{token}
        ↓
ConsultaOtPublicaComponent
        ↓ GET /api/v1/consulta/ot/{token}
DocumentoOrdenServicioService.consultaOtPublica
        ↓ findByTokenConsulta(trim)
ConsultaOtPublicaDTO (sin PII de cliente)
        ↓ (opcional) GET .../cotizacion
ConsultaCotizacionOtPublicaDTO (solo si OT=PENDIENTE_APROBACION
                                y cotización PENDIENTE_APROBACION)
```

### HECHO — datos expuestos en `ConsultaOtPublicaDTO`

- Número OT, estado/etapa públicos, equipo (tipo/marca/modelo/referenciaInterna)
- Fechas recepción/actualización
- Flag `cotizacionDisponible`
- `contacto` del **taller** (`ContactoTallerPublicoDTO`), no del cliente
- Mensaje genérico

**No se expone:** nombre del cliente, documento, teléfono, email, IDs internos, costos, inventario, diagnóstico técnico completo, JWT, firma.

### HECHO — datos de cotización pública

Número, fecha, líneas (descripción/cantidad/precio/subtotal), subtotal, total, observaciones.  
Sin IDs de cotización/producto, sin costos internos.

---

## 4. Flujo actual de aprobación / rechazo

```text
Admin autenticado (JWT ROLE_ADMIN)
        ↓
CotizacionServicioController.aprobar|rechazar
        ↓
CotizacionServicioService.aprobar|rechazar
        ↓ validaciones de estado de cotización
        ↓ transicionarPorDominio (workflow OT)
        ↓ historial de estados de OT
```

### HECHO — reglas de negocio (no deben duplicarse)

**Aprobar** (`PENDIENTE_APROBACION` → `APROBADA`):

- Cotización INICIAL → OT → `APROBADO`
- Cotización ADICIONAL → OT → `EN_REPARACION`

**Rechazar**:

- Cotización → `RECHAZADA`
- Si OT está en `PENDIENTE_APROBACION`:
  - INICIAL → OT `COTIZADO`
  - ADICIONAL → OT `REQUIERE_APROBACION_ADICIONAL`

`validarUsuario` exige usuario no vacío (hoy: principal JWT).

---

## 5. Campos reales encontrados (respuestas a la auditoría)

| # | Pregunta | Respuesta (HECHO) |
|---|----------|-------------------|
| 1 | Entidad Cliente | `Cliente` comercial (`ModulComercialModel.Cliente`) |
| 2 | Campo documento | `numeroDocumento` (+ `tipoDocumento`) |
| 3 | Campo celular | **`telefono`** (no existe campo `celular`) |
| 4 | Celular normalizado | Solo `trim`; sin E.164 ni strip de signos |
| 5 | Documento normalizado | Solo `trim`; no elimina puntos/guiones/espacios internos |
| 6 | Relaciones | OT → Cliente (obligatorio); OT → Equipo; Equipo → Cliente; Recepción 1:1 OT; Cotización N:1 OT; `tokenConsulta` en OT |
| 7 | Obtención Cliente desde OT | `orden.getCliente()` / creación vía `resolverClienteActivoParaTaller` |
| 8 | Validación token | `findByTokenConsulta`; 404 genérico si no existe |
| 9 | DTO público | `ConsultaOtPublicaDTO`, `ConsultaCotizacionOtPublicaDTO`, `ConsultaDocumentoPublicoDTO` |
| 10 | Endpoints públicos aprobar/rechazar | **No existen** |
| 11 | Transiciones cotización | `CotizacionServicioService` + `OrdenServicioService.transicionarPorDominio` |
| 12 | Autorización aprobar/rechazar/anular | Admin JWT; anular solo comercial |
| 13 | Normalización reutilizable | `ClienteService.normalizar` privado = trim; FE `telHref`/`waHref` solo para links |
| 14 | Cliente en portal | **No** se expone PII del cliente |
| 15 | Riesgo over-disclosure consulta | Bajo en DTO actual; cotización sí revela precios |
| 16 | Rate limiting | **No** encontrado |
| 17 | Auditoría acción pública | N/A (no hay acciones públicas mutativas) |
| 18 | Distinción consulta vs acción sensible | Solo léxica/documental; no hay capa de “acción sensible” |
| 19 | Dominio vs portal | Dominio = `CotizacionServicioService` + workflow; portal = lectura en `DocumentoOrdenServicioService` + FE consulta |

---

## 6. Normalización actual

### HECHO

```java
// ClienteService
private String normalizar(String valor) {
    if (valor == null) return null;
    String limpio = valor.trim();
    return limpio.isEmpty() ? null : limpio;
}
```

Alta/edición de cliente: `numeroDocumento` y `telefono` **opcionales** (FE: sin `Validators.required`; BE: `@Size` sin `@NotBlank`).

### INFERENCIA

Pueden coexistir formatos distintos para el mismo número (`3001234567` vs `+57 300 123 4567`) si el operador los captura distinto.  
La unicidad de documento es `(tipoDocumento, numeroDocumento)` **literal tras trim**, no canónica.

---

## 7. Relaciones relevantes

```text
Cliente (1) ──< OrdenServicio >── (1) Equipo ──> Cliente
                    │
                    ├── tokenConsulta (público)
                    ├── RecepcionOrdenServicio (documento firmante)
                    └── CotizacionServicio*
```

### HECHO — cliente de taller

`resolverClienteActivoParaTaller` exige:

- cliente existente
- `activo = true`
- **no** `CONSUMIDOR_FINAL`

### INCERTIDUMBRE

Calidad/completitud histórica de `numeroDocumento` y `telefono` en datos reales de producción/test (requiere muestreo DB, no solo código).

---

## 8. Riesgos encontrados

| Riesgo | Nivel | Base |
|--------|-------|------|
| Documento/teléfono ausentes en Cliente | **Alto** para la hipótesis | Campos nullable; form no los exige |
| Falsos negativos por formato | Medio–Alto | Solo trim |
| Confundir `Recepcion.documentoCliente` con `Cliente.numeroDocumento` | Medio | Son campos distintos |
| Token en URL/QR/PDF/logs compartibles | Medio (aceptado) | Diseño actual del QR |
| Brute force sobre futura acción sensible | Alto si se abre POST sin rate limit | No hay throttling hoy |
| Enumeración por mensajes de error detallados | Alto si se implementa mal | — |
| Cotización pública revela montos a quien tiene el token | Bajo–Medio (diseño actual) | Lectura ya permitida |
| Admin aprueba “como cliente” sin prueba de identidad del titular | Actual | Flujo presencial/taller |

---

## 9. Protecciones existentes

### HECHO

- Token opaco UUID (no secuencial)
- Lookup exacto; 404 genérico
- Consulta pública **solo GET**
- Mutaciones de cotización OT detrás de JWT ADMIN
- DTO público sin PII del cliente
- Consumidor final bloqueado como cliente de OT

### HECHO — ausente

- Rate limiting / captcha / lockout
- Expiración / revocación / rotación de `tokenConsulta`
- Verificación de identidad del titular en portal
- Auditoría específica de intentos públicos fallidos

---

## 10. Evaluación de `tokenConsulta`

| Aspecto | HECHO |
|---------|-------|
| Longitud | 32 hex (UUID sin guiones), columna 64 |
| Generación | `UUID.randomUUID()` en `@PrePersist` / backfill V12 |
| Aleatoriedad | UUID v4 (suficiente opacidad para URL) |
| Unicidad | UNIQUE DB |
| Persistencia | Columna `ordenes_servicio.token_consulta` |
| Regeneración | No hay API de rotación |
| Expiración | No |
| Revocación | No |
| Exposición | URL pública, QR PDF, notificaciones (`/consulta/ot/{token}`) |

### INFERENCIA

Debe **mantenerse** como identificador público de la OT. No es autenticación del cliente; es localizador de recurso.

### PROPUESTA

No cambiar generación ni contrato del token en la siguiente subfase.  
Rotación/expiración: fuera de alcance salvo decisión explícita posterior.

---

## 11. Evaluación de documento + celular (`telefono`)

### Documento

| Criterio | Evaluación |
|----------|------------|
| Estabilidad | Buena **si está capturado**; el modelo lo permite vacío |
| Almacenamiento | String libre ≤40 + `tipoDocumento` |
| Formato | Sin sanitización de `.` `-` espacios internos |
| Comparación futura | **Debe** normalizarse (p. ej. solo alfanuméricos) en ambos lados |

### Teléfono (`telefono`)

| Criterio | Evaluación |
|----------|------------|
| Nombre real | `telefono`, no `celular` |
| Formatos posibles | Cualquier string ≤40 tras trim |
| Utilidad reutilizable | No existe normalizador E.164 de dominio |
| Comparación | Preferible dígitos canónicos (y política clara de código país) |

### Combinación `token + documento + telefono`

**Ventajas (INFERENCIA):**

- Usa datos que el cliente suele conocer
- No introduce PIN/OTP/cuentas
- Token acota el espacio al Cliente de **esa** OT (no búsqueda global por documento)

**Limitaciones:**

- Campos opcionales hoy → muchos clientes pueden no validar
- No es autenticación fuerte
- Enlace compartido + datos personales filtrados = riesgo residual
- `tipoDocumento` no está en la hipótesis; puede haber ambigüedad menor (mismo número con tipos distintos es raro por UK)

**Riesgos:**

- Fuerza bruta si hay POST público sin límite
- Enumeración si errores distinguen “doc OK / tel mal”
- Falsos negativos por formato
- UX: pedir dos datos; fallos opacos

### Clasificación de seguridad (INFERENCIA)

**Verificación de correspondencia de identidad de baja fricción**, adecuada como gate adicional al token para acciones sensibles del portal.  
**No** sustituye MFA ni prueba de posesión del teléfono.

---

## 12. Datos faltantes / gaps

| Gap | Impacto |
|-----|---------|
| `%` clientes OT con `numeroDocumento` y `telefono` no nulos | Decide viabilidad operativa |
| Política de captura obligatoria en alta de cliente de taller | Puede requerir cambio de regla de negocio (otra fase) |
| Normalizador canónico compartido | Necesario antes de comparar |
| Rate limit infraestructura | No existe; hay que diseñar o aceptar riesgo temporal |
| Semántica “quién aprobó” si el actor es el cliente público | Hoy `usuarioAprobacion` = admin JWT |

---

## 13. Propuesta de arquitectura (siguiente subfase — NO implementada)

### PROPUESTA — separación de responsabilidades

```text
Portal público (FE)
  → POST acción sensible + (documento, telefono) + token
       ↓
Capa pública (controller consulta / facade)
  → rate limit + mensajes genéricos
  → ValidacionIdentidadClientePublico (nuevo, dominio transversal)
       compara normalizado(documento, telefono)
       contra orden.cliente de tokenConsulta
       ↓ OK
CotizacionServicioService.aprobar|rechazar  (REUTILIZAR)
       ↓
transicionarPorDominio (sin cambiar matriz)
```

### PROPUESTA — principios

1. **No** duplicar transiciones: invocar el servicio de dominio existente.
2. Actor auditado: p. ej. prefijo estable `CLIENTE_PUBLICO` o `PUBLICO:{tokenShort}` — **decisión pendiente**.
3. Endpoints públicos mutativos **nuevos** bajo `/api/v1/consulta/...`, no abrir el controller ADMIN.
4. Security: `POST` específicos `permitAll` **solo** tras validación de identidad + (idealmente) rate limit.
5. Errores genéricos: *“No pudimos validar la información ingresada.”* (sin filtrar qué campo falló).
6. Si faltan documento/teléfono en el Cliente de la OT → rechazar con mensaje genérico o mensaje de “contacta al taller” (sin filtrar cuál falta al atacante).
7. Normalización: utilidad de dominio nueva (reutilizable), no lógica en el FE.
8. Distinguir claramente:
   - **consulta** (GET actual, sin cambio obligatorio)
   - **acción sensible** (POST nuevo con verificación)

### PROPUESTA — qué NO hacer

- PIN / OTP / SMS / WhatsApp / cuentas de cliente / JWT de cliente
- Segunda máquina de estados
- Usar `Recepcion.documentoCliente` como fuente de verdad del titular (salvo decisión explícita)
- Marcar ENVIADA notificaciones o mezclar con 3.15.9.x canales

---

## 14. Impact Surface (futuro)

### Backend (potencial)

- Nuevo DTO request de verificación / acción pública
- Nuevo método(s) en facade pública + posiblemente `ClienteIdentidadSupport` (normalizar/comparar)
- `SecurityConfig` (permitir POST acotados)
- Posible tabla/registro de intentos (solo si se decide auditar/rate-limit persistente)
- Tests de seguridad y de no-regresión de cotización admin
- Migración **solo si** se exige NOT NULL documento/teléfono o tabla de intentos

### Frontend (potencial)

- Portal `consulta-ot-publica`: UI de captura documento+teléfono
- Botones aprobar/rechazar + estados de error genéricos
- Sin tocar panel admin Servicios salvo reutilizar componentes visuales genéricos

### Documentación

- API pública, flujo funcional, amenazas y mensajes de error

---

## 15. Cambios necesarios (para una futura 3.15.9.3-B)

1. Definir contrato de acción pública (aprobar/rechazar) con verificación.
2. Normalización canónica documento/teléfono en backend.
3. Gate de identidad contra `orden.cliente`.
4. Reutilizar `CotizacionServicioService`.
5. Mensajes genéricos + (recomendado) rate limiting.
6. Política de auditoría del actor público.
7. UI portal + tests.

---

## 16. Cambios que NO son necesarios

- Cambiar generación de `tokenConsulta`
- Cambiar DTOs de consulta GET actuales (salvo flags UX menores)
- Alterar matriz de workflow OT
- Duplicar lógica de `aprobar`/`rechazar`
- Integrar WhatsApp/SMS/OTP
- Login de clientes
- Modificar PDFs/QR por esta validación (el token ya está)

---

## 17. Recomendación técnica (basada en evidencia)

1. **Mantener** `tokenConsulta` como localizador público.
2. **Adoptar** verificación `documento + telefono` del `Cliente` de la OT como gate de acciones sensibles, con normalización fuerte.
3. **Tratar** el mecanismo como verificación de correspondencia, no auth fuerte.
4. **Reutilizar** `CotizacionServicioService` para el efecto de negocio.
5. **No abrir** los endpoints ADMIN actuales al público.
6. **Antes de implementar**, decidir (ver §18) la obligatoriedad de documento/teléfono en clientes de taller; sin eso la feature tendrá alta tasa de falso negativo operativo.
7. **Complementar** con rate limiting y errores genéricos desde el día 1 de la implementación.

---

## 18. Preguntas / decisiones pendientes

1. ¿Se hará **obligatorio** `numeroDocumento` + `telefono` al crear/editar clientes usados en OT?
2. ¿La comparación de documento ignora `tipoDocumento` o lo exige también en el formulario público?
3. ¿Política de teléfono: solo dígitos nacionales (10) vs E.164 con `57`?
4. ¿Qué valor persistir en `usuarioAprobacion` / historial cuando actúa el portal?
5. ¿Rate limit en memoria (monolito) vs tabla de intentos?
6. ¿Alcance inicial solo aprobar/rechazar cotización, u otras acciones sensibles después?
7. ¿Muestreo de datos reales: % de OT cuya Cliente tiene ambos campos poblados?

---

## Apéndice — archivos inspeccionados

**Backend**

- `ConsultaPublicaController.java`
- `DocumentoOrdenServicioService.java` (consulta pública)
- `SecurityConfig.java`
- `Cliente.java`, `ClienteService.java`, `ClienteRequestDTO.java`, `ClienteResponseDTO.java`, `ClienteRepository.java`
- `TipoDocumento.java`
- `OrdenServicio.java`, `OrdenServicioService.java` (resolver cliente)
- `RecepcionOrdenServicio.java`
- `CotizacionServicio.java`, `CotizacionServicioService.java`, `CotizacionServicioController.java`
- `ConsultaOtPublicaDTO.java` (+ DTO cotización pública)
- Migraciones `V1` (clientes), `V12` (token_consulta)

**Frontend**

- `app.routes.ts` / `app.routes.public.spec.ts`
- `consulta-ot-publica.ts` / `.html`
- `documento-orden-servicio.service.ts` / `.models.ts`
- `cliente-form.ts`

---

## Cierre 3.15.9.3-A

Esta fase **no modifica** comportamiento.  
Siguiente bloque candidato: **3.15.9.3-B — diseño contractual + implementación** tras resolver las decisiones de §18.
