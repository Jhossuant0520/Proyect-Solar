# SOLVIX — FASE 3.15.2 Auditoría de contratos Frontend (Servicios Técnicos)

**Tipo:** AUDITORÍA DE CONTRATOS (base de la implementación)  
**Fuente:** Backend FASE 3.15.1 (código real)  
**Estado:** Contratos auditados → frontend implementado en `FASE_3_15_2_SERVICIOS.md`  
**Restricción original:** Esta auditoría no modificó backend ni DTOs. La UI Angular se construyó después sobre estos contratos.

---

## Contratos Equipo

### Enum `TipoEquipo`

`COMPUTADOR` | `PORTATIL` | `IMPRESORA` | `MONITOR` | `SERVIDOR` | `CELULAR` | `OTRO`

### `EquipoRequestDTO` (body crear/actualizar)

| Campo | Tipo | Obligatorio | Longitud | Default |
|-------|------|-------------|----------|---------|
| `clienteId` | `Long` | **Sí** (`@NotNull`) | — | — |
| `tipoEquipo` | `TipoEquipo` | **Sí** (`@NotNull`) | — | — |
| `marca` | `String` | No | max 80 | null |
| `modelo` | `String` | No | max 80 | null |
| `numeroSerie` | `String` | No | max 100 | null |
| `nombre` | `String` | No | max 120 | null |
| `observaciones` | `String` | No | max 1000 | null |
| `activo` | `Boolean` | No | — | crear: `true` si null; actualizar: solo si se envía |

Vacíos se normalizan a `null` en servicio.

### `EquipoResponseDTO`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | `Long` | PK |
| `clienteId` | `Long` | Relación Cliente |
| `clienteNombre` | `String` | Denormalizado para UI |
| `tipoEquipo` | `TipoEquipo` | |
| `marca` | `String` | |
| `modelo` | `String` | |
| `numeroSerie` | `String` | |
| `nombre` | `String` | Alias interno |
| `observaciones` | `String` | |
| `activo` | `boolean` | |
| `fechaRegistro` | `LocalDateTime` | |

### Relación Cliente

```
Equipo → clienteId + clienteNombre (en response)
```

No anida el objeto Cliente completo. Angular usa `clienteId` para FKs y `clienteNombre` para listados.

---

## Endpoints Equipo

Base: `/api/v1/equipos`  
Permiso clase: **`@PreAuthorize("hasRole('ADMIN')")`**

| Método | Endpoint | Body | Query | Respuesta | Permiso | Propósito |
|--------|----------|------|-------|-----------|---------|-----------|
| POST | `/api/v1/equipos` | `EquipoRequestDTO` | — | `201` `EquipoResponseDTO` | ADMIN | Crear |
| GET | `/api/v1/equipos` | — | `clienteId?`, `soloActivos?` (default `false`) | `200` `EquipoResponseDTO[]` | ADMIN | Listar |
| GET | `/api/v1/equipos/{id}` | — | — | `200` `EquipoResponseDTO` | ADMIN | Detalle |
| PUT | `/api/v1/equipos/{id}` | `EquipoRequestDTO` | — | `200` `EquipoResponseDTO` | ADMIN | Actualizar |
| DELETE | `/api/v1/equipos/{id}` | — | — | `200` `EquipoResponseDTO` | ADMIN | Soft-delete (`activo=false`) |

### Filtros reales de listado

| Query | Existe | Comportamiento |
|-------|--------|----------------|
| `clienteId` | **Sí** | Filtra por cliente |
| `soloActivos` | **Sí** | `true` → solo `activo=true` |
| `tipoEquipo` | **No** | No hay filtro por tipo |

**Equipos por cliente:** usar  
`GET /api/v1/equipos?clienteId={id}&soloActivos=true`  
No existe `/api/v1/clientes/{id}/equipos`.

---

## Contratos OrdenServicio

### Nota de naming

El número documental es **`numero`**, no `numeroOrden`.

### `OrdenServicioRequestDTO` (crear y PUT)

| Campo | Tipo | Obligatorio | Longitud |
|-------|------|-------------|----------|
| `clienteId` | `Long` | **Sí** | — |
| `equipoId` | `Long` | **Sí** | — |
| `problemaReportado` | `String` | No | max 2000 |
| `diagnostico` | `String` | No | max 2000 |
| `trabajoRealizado` | `String` | No | max 2000 |
| `observaciones` | `String` | No | max 1000 |

En **PUT**: `clienteId` y `equipoId` deben ser **los mismos** de la orden; no se pueden cambiar. Solo se actualizan los textos.

### `OrdenServicioResponseDTO`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | `Long` | |
| `numero` | `String` | Formato `OS-{yyyy}-{000000}` |
| `clienteId` | `Long` | |
| `clienteNombre` | `String` | |
| `equipoId` | `Long` | |
| `equipoTipo` | `TipoEquipo` | |
| `equipoMarca` | `String` | |
| `equipoModelo` | `String` | |
| `equipoNombre` | `String` | |
| `estado` | `EstadoOrdenServicio` | |
| `problemaReportado` | `String` | |
| `diagnostico` | `String` | |
| `trabajoRealizado` | `String` | |
| `observaciones` | `String` | |
| `fechaRecepcion` | `LocalDateTime` | |
| `fechaActualizacion` | `LocalDateTime` | |
| `fechaCierre` | `LocalDateTime` | null hasta ENTREGADO/CERRADO/CANCELADO |
| `createdBy` | `String` | username ADMIN |

No hay costos, repuestos, técnico ni archivos en este contrato.

### `CambiarEstadoOrdenServicioRequestDTO`

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `estado` | `EstadoOrdenServicio` | **Sí** |

Solo eso. **No** envía diagnóstico, trabajo ni observaciones en el cambio de estado.

---

## Endpoints OrdenServicio

Base: `/api/v1/ordenes-servicio`  
Permiso: **ADMIN**

| Método | Endpoint | Body | Query | Respuesta | Propósito |
|--------|----------|------|-------|-----------|-----------|
| POST | `/api/v1/ordenes-servicio` | `OrdenServicioRequestDTO` | — | `201` response | Crear → estado `RECEPCIONADO` |
| GET | `/api/v1/ordenes-servicio` | — | `clienteId?`, `equipoId?`, `estado?` | `200` lista | Listar |
| GET | `/api/v1/ordenes-servicio/{id}` | — | — | `200` response | Detalle |
| PUT | `/api/v1/ordenes-servicio/{id}` | `OrdenServicioRequestDTO` | — | `200` response | Actualizar textos |
| POST | `/api/v1/ordenes-servicio/{id}/estado` | `{ "estado": "..." }` | — | `200` response | Transición de estado |

**Confirmado:** la ruta de estado es exactamente  
`POST /api/v1/ordenes-servicio/{id}/estado`.

No hay DELETE de orden. Cierre vía estados `CANCELADO` / `CERRADO`.

---

## Estados

Enum real `EstadoOrdenServicio`:

1. `RECEPCIONADO` ← **estado inicial** al crear  
2. `EN_DIAGNOSTICO`  
3. `COTIZADO`  
4. `APROBADO`  
5. `EN_REPARACION`  
6. `ESPERA_REPUESTO`  
7. `LISTO`  
8. `ENTREGADO`  
9. `CERRADO` (terminal)  
10. `CANCELADO` (terminal)

### Transiciones permitidas

| Estado actual | Siguientes permitidos |
|---------------|------------------------|
| RECEPCIONADO | EN_DIAGNOSTICO, CANCELADO |
| EN_DIAGNOSTICO | COTIZADO, CANCELADO |
| COTIZADO | APROBADO, CANCELADO |
| APROBADO | EN_REPARACION, CANCELADO |
| EN_REPARACION | ESPERA_REPUESTO, LISTO, CANCELADO |
| ESPERA_REPUESTO | EN_REPARACION, CANCELADO |
| LISTO | ENTREGADO, CANCELADO |
| ENTREGADO | CERRADO |
| CERRADO | — |
| CANCELADO | — |

Cualquier otro salto → `BusinessException` (“Transición no permitida…”).

Angular puede **mostrar** solo destinos válidos; la autoridad sigue siendo el backend.

---

## Validaciones (backend)

| Regla | Cuándo |
|-------|--------|
| Cliente obligatorio | Crear equipo / crear OT |
| Cliente existe | Idem |
| Cliente activo | Idem |
| Cliente ≠ `CONSUMIDOR_FINAL` | Idem |
| Equipo obligatorio | Crear OT |
| Equipo existe | Crear OT |
| Equipo activo | Crear OT |
| Equipo pertenece al cliente | Crear OT (**crítico**) |
| PUT OT: no cambiar cliente/equipo | Actualizar |
| PUT OT: no editar si CERRADO/CANCELADO | Actualizar |
| Cambio de estado solo si transición válida | POST estado |
| Equipo: no cambiar cliente si ya tiene OT | PUT equipo |

Errores de negocio típicos: HTTP **400** (`BusinessException`).  
No encontrado: **404**.  
Sin ADMIN: **403**.

---

## Seguridad

| Actor | Equipos / Órdenes |
|-------|-------------------|
| ADMIN | Permitido |
| USUARIO | Rechazado (403 `@PreAuthorize`) |
| Anónimo | Rechazado (JWT requerido) |

Frontend: rutas bajo `adminGuard`. No cambiar SecurityConfig.

---

## Clientes

Contrato existente a **reutilizar** (`ClienteService` Angular actual):

`GET /api/v1/clientes?soloActivos=true`

| Hecho | Detalle |
|-------|---------|
| Identificador | `id` |
| UI sugerida | `nombre` (+ documento si hay) |
| Flag | `consumidorFinal: boolean` |
| ¿Incluye consumidor final? | **Sí**, si está activo — el listado no lo excluye |

**Frontend debe filtrar** `consumidorFinal === true` al armar el select de taller (backend también rechaza, pero la UX debe ocultarlo).

No crear otro ClienteService.

---

## Flujo UX (propuesto, sin implementar)

```
Seleccionar cliente (soloActivos, sin consumidor final)
  → GET /equipos?clienteId=&soloActivos=true
  → Seleccionar equipo (o alta de equipo previa)
  → problemaReportado / observaciones
  → POST /ordenes-servicio
  → RECEPCIONADO
```

Detalle:

```
GET /ordenes-servicio/{id}
  → mostrar cliente, equipo, textos, estado, fechas
  → PUT textos (diagnóstico, trabajo…) si no terminal
  → POST /estado con solo { estado } (opciones = transiciones válidas)
```

---

## Rutas propuestas (sin implementar)

| Ruta | Uso |
|------|-----|
| `/servicios` | Lista de órdenes |
| `/servicios/nueva` | Alta |
| `/servicios/:id` | Detalle + edición de textos + cambio de estado |

**`/servicios/:id/editar`:** no hace falta si el detalle concentra PUT + POST estado (como patrón de detalle de venta/cliente).

Equipo puede gestionarse embebido (crear desde formulario de OT) o subruta futura `/servicios/equipos` — no requerido para MVP.

> **Implementado:** ver `docs/frontend/FASE_3_15_2_SERVICIOS.md`.


---

## Frontend actual

| Elemento | Estado |
|----------|--------|
| Ruta `/servicios` | **NO EXISTE** |
| Componentes / modelos / HTTP service | **NO EXISTE** |
| Menú AdminLayout | **NO EXISTE** |
| Coming-soon servicios | **NO EXISTE** |
| Stitch OT | **NO EXISTE** |

Homepage “Servicios” = marketing solar; no aplica.

---

## Componentes propuestos (solo nombres)

Reutilizar: `solvix-page-header`, `solvix-button`, `solvix-badge`, loading/error/empty, layout admin.

Nuevos (fase UI):

- `servicio-list` — tabla de OT (`numero`, cliente, equipo, estado, fechas)
- `servicio-form` — nueva OT (cliente → equipos → problema)
- `servicio-detail` — detalle + PUT textos + acciones de estado
- `equipo-selector` / mini-form alta equipo
- `estado-orden-badge` — badge por `EstadoOrdenServicio`

---

## Servicios Angular propuestos

| Servicio | API | Nota |
|----------|-----|------|
| `EquipoService` (nuevo) | `/api/v1/equipos` | |
| `OrdenServicioService` (nuevo) | `/api/v1/ordenes-servicio` | |
| `ClienteService` (existente) | `/api/v1/clientes` | Reutilizar |

Helpers UI: labels de estado, `transicionesDesde(estado)`, filtro sin consumidor final.

Mapper: DTO ↔ form (no inventar campos).

---

## Responsabilidades

| Frontend | Backend |
|----------|---------|
| Selects, formularios, nav | Persistencia |
| Validación básica (required, maxlength) | Cliente/equipo coherentes |
| Ocultar consumidor final | Rechazar consumidor final / inactivos |
| Mostrar solo estados siguientes | Aplicar máquina de estados |
| Mapper / UX writing | Permisos ADMIN |

---

## Limitaciones del contrato actual

- Sin repuestos, costos, cobro, técnico, fotos, garantía  
- Sin filtro `tipoEquipo` en listado de equipos  
- PUT de OT exige reenviar `clienteId` + `equipoId` sin cambiarlos  
- Cambio de estado **no** actualiza textos en el mismo request  
- Número es `numero`, no `numeroOrden`

---

## Dependencias

- Backend 3.15.1 desplegado + migración V6 aplicada  
- JWT ADMIN  
- Módulo Clientes existente  
- Tokens/UI SOLVIX admin (Tech-Minimal)

---

## Respuestas rápidas (checklist)

1. **Crear equipo:** `POST /api/v1/equipos` con `clienteId` + `tipoEquipo` (+ opcionales).  
2. **Obtener equipo:** `GET /api/v1/equipos/{id}` o listar con `clienteId`.  
3. **Relación cliente:** `clienteId` / `clienteNombre` en response.  
4. **Crear OT:** `POST /api/v1/ordenes-servicio`.  
5. **Campos request OT:** `clienteId`, `equipoId`, opcionales `problemaReportado`, `diagnostico`, `trabajoRealizado`, `observaciones`.  
6. **Estados:** los 10 del enum; inicial `RECEPCIONADO`.  
7. **Cambiar estado:** `POST .../{id}/estado` body `{ "estado": "EN_DIAGNOSTICO" }`.  
8. **Transiciones:** tabla de arriba.  
9. **ADMIN:** todo el módulo; USUARIO/anónimo no.  
10. **Angular envía:** IDs + textos; estado solo en endpoint de estado.  
11. **Componentes:** list / form / detail (+ selector equipo, badge estado).  
12. **Reutilizar:** `ClienteService` + `GET clientes?soloActivos=true` (filtrar consumidor final en UI).
