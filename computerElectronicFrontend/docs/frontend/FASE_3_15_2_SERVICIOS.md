# SOLVIX — FASE 3.15.2 Frontend Servicios Técnicos

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Fuente de contratos:** `docs/frontend/FASE_3_15_2_AUDITORIA_FRONTEND_SERVICIOS.md`  
**Restricción:** No se modificó backend, DTOs, entidades, endpoints ni SecurityConfig.

---

## Objetivo

Primer frontend operativo del núcleo de Servicios Técnicos:

```
Cliente → Equipo → Orden de servicio → Estado
```

El backend es la autoridad para relaciones, permisos, estados y transiciones.

---

## Rutas

| Ruta | Pantalla | Guards |
|------|----------|--------|
| `/servicios` | Listado | `authGuard` + `adminGuard` |
| `/servicios/nueva` | Alta de orden | `authGuard` + `adminGuard` |
| `/servicios/:id` | Detalle + edición textos + cambio de estado | `authGuard` + `adminGuard` |

**No existe** `/servicios/:id/editar`: el detalle concentra PUT de textos y POST de estado.

Nav admin: ítem **Servicios** (`build`).

---

## Componentes

| Pieza | Rol |
|-------|-----|
| `servicio-list` | Lista con estados LOADING / EMPTY / ERROR / SUCCESS |
| `servicio-form` | Alta: cliente → equipos → textos → POST |
| `servicio-detail` | Detalle, edición de textos, cambio de estado |
| `servicio-ui.ts` | Labels, badges, transiciones UI, errores humanos |
| `servicio-mapper.ts` | Form ↔ `OrdenServicioRequestDTO` (sin lógica de negocio) |

Ubicación: `features/panelAdmin/servicios/`.

---

## Servicios

| Servicio | Uso |
|----------|-----|
| `ClienteService` (existente) | `GET /api/v1/clientes?soloActivos=true` |
| `EquipoService` (nuevo) | listar, listarPorCliente, obtenerPorId, crear, actualizar, desactivar |
| `OrdenServicioService` (nuevo) | listar, obtenerPorId, crear, actualizar, cambiarEstado |

No se duplicó ClienteService.

---

## Endpoints

| Método | Endpoint | Uso UI |
|--------|----------|--------|
| GET | `/api/v1/clientes?soloActivos=true` | Select de cliente (form / filtros) |
| GET | `/api/v1/equipos?clienteId=&soloActivos=true` | Equipos del cliente |
| GET | `/api/v1/ordenes-servicio` | Listado (`clienteId?`, `estado?`) |
| POST | `/api/v1/ordenes-servicio` | Crear orden |
| GET | `/api/v1/ordenes-servicio/{id}` | Detalle |
| PUT | `/api/v1/ordenes-servicio/{id}` | Editar textos |
| POST | `/api/v1/ordenes-servicio/{id}/estado` | Cambiar estado `{ "estado": "..." }` |

---

## Flujo Cliente → Equipo → OT

1. Cargar clientes activos.
2. Ocultar `CONSUMIDOR_FINAL` / `consumidorFinal === true` (nunca por ID).
3. Seleccionar cliente.
4. Cargar `GET /equipos?clienteId={id}&soloActivos=true`.
5. Seleccionar equipo (bloqueado sin cliente).
6. Al cambiar cliente: limpiar equipo y recargar equipos.
7. Completar textos opcionales del request.
8. `POST /ordenes-servicio` → navegar a `/servicios/{id}`.

El frontend **no** genera `numero`. El backend emite `OS-yyyy-######`.

---

## Estados

Los 10 valores del enum se muestran con nombre humano y se envían sin renombrar:

| Enum | UI |
|------|-----|
| RECEPCIONADO | Recepcionado |
| EN_DIAGNOSTICO | En diagnóstico |
| COTIZADO | Cotizado |
| APROBADO | Aprobado |
| EN_REPARACION | En reparación |
| ESPERA_REPUESTO | Espera repuesto |
| LISTO | Listo |
| ENTREGADO | Entregado |
| CERRADO | Cerrado |
| CANCELADO | Cancelado |

Badges: `solvix-badge` con tonos success / warning / error / neutral.

---

## Edición

PUT solo actualiza textos. El request reenvía el mismo `clienteId` y `equipoId` de la orden.

UI:

- No permite cambiar cliente ni equipo.
- No permite editar si estado es `CERRADO` o `CANCELADO`.
- Tras guardar: refresca detalle y snack de confirmación.

---

## Cambio de estado

`POST .../{id}/estado` con body `{ estado }`.

La UI ofrece solo destinos de la tabla de transiciones del backend (espejo en `servicio-ui.ts`). El backend sigue siendo la autoridad final.

---

## Seguridad

Rutas bajo layout autenticado + `adminGuard`.  
Backend: `@PreAuthorize("hasRole('ADMIN')")`.  
No se tocó SecurityConfig.

---

## UX/UI

- Jerarquía de detalle: número + badge → cliente → equipo → textos → fechas → acciones.
- Tech-Minimal / tokens SOLVIX.
- Responsive: tabla en desktop, cards en mobile; formularios apilados.
- Un solo scroll vertical.
- Fuera de esta fase: repuestos, inventario, costos, cobro, técnico, garantía.

Filtros de listado:

- Query reales: `clienteId`, `estado`.
- Búsqueda local por número / cliente / equipo (sin inventar HTTP de search).

---

## Validaciones

Frontend (básicas):

- Cliente y equipo requeridos.
- Max lengths del DTO (2000 / 2000 / 2000 / 1000).
- No guardar mientras cargan equipos.

Backend sigue validando pertenencia equipo↔cliente, activos, consumidor final y transiciones.

---

## Tests

| Spec | Cobertura |
|------|-----------|
| `equipo.service.spec.ts` | GET/POST/PUT/DELETE + listarPorCliente |
| `orden-servicio.service.spec.ts` | listar/crear/actualizar/estado |
| `servicio-ui.spec.ts` | labels, transiciones, filtro local, errores |
| `servicio-list.spec.ts` | loading/empty/error/navegación |
| `servicio-form.spec.ts` | filtro CF, equipos por cliente, limpiar equipo, crear |
| `servicio-detail.spec.ts` | detalle, PUT textos, POST estado |

---

## Build

Ejecutado en esta fase:

```bash
npm run build
npx ng test --watch=false --browsers=ChromeHeadless
```

- `npm run build`: OK  
- Specs del módulo Servicios: **35/35 OK**  
- Suite completa: fallos previos ajenos a Servicios (Register, ModulHsp, etc.); no se modificaron tests antiguos.

---

## Limitaciones

- Sin alta de equipo embebida en el formulario de OT.
- Sin repuestos, inventario, cobro, Venta, técnico, garantía, fotos, firma.
- Sin lista de transiciones expuesta por API (se usa el mapa conocido del backend).

---

## Pendientes

- CRUD visual de equipos (si se necesita fuera del flujo OT).
- Repuestos / inventario / cobro (fases posteriores).
- Asignación de técnico y roles no-ADMIN.
- Adjuntos / firma / notificaciones.
