# SOLVIX — FASE 3.9
## Módulo de Clientes

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** CRUD administrativo sobre contratos existentes  
**Fecha de documentación:** 2026-09-12

---

## Objetivo

Reemplazar las vistas coming-soon de Clientes por un módulo para listar, buscar, crear, consultar, editar, activar y desactivar, y ver las ventas y devoluciones ya asociadas.

No es un CRM. No calcula totales, ticket, recurrencia ni retención.

## Alcance

**Incluido**

- Lista, alta, detalle y edición
- Búsqueda y filtros sobre los datos ya cargados
- Activar y desactivar con `PUT` y `activo`
- Historial de ventas y devoluciones por `clienteId`
- Una sola opción de consumidor final en el formulario de venta

**Fuera de alcance**

- Backend, endpoints nuevos y métricas de cliente
- Dirección, apellidos, representante, correo único
- Paginación o búsqueda HTTP
- Nueva venta desde query param
- IVA o fiscalidad
- Borrado físico

## Rutas

| Ruta | Guards | Pantalla |
| --- | --- | --- |
| `/clientes` | `authGuard` + `adminGuard` | Lista |
| `/clientes/nuevo` | mismos | Alta |
| `/clientes/:id` | mismos | Detalle e historial |
| `/clientes/:id/editar` | mismos | Edición |

El menú ya apuntaba a `/clientes`.

## Componentes

- `cliente-list`
- `cliente-form` — alta y edición
- `cliente-detail`
- `cliente-ui` — etiquetas, búsqueda, consumidor final, mensajes
- `cliente-mapper` — formulario a request y rutas de historial

Familia Tech-Minimal. Un primario por pantalla: Nuevo cliente, Crear/Guardar, o Editar.

## Servicios

Se amplió `ClienteService`. No se creó otro.

- `listar(soloActivos)`
- `obtenerPorId`
- `crear`
- `actualizar`
- `desactivar` — `PUT` con `activo: false`

`VentaService.listar({ clienteId })` y `listarDevolucionesPorCliente` consumen filtros que el backend ya acepta.

## Modelos

- `ClienteResponseDTO` — respuesta real
- `ClienteRequestDTO` — body de POST/PUT

El mapper no infiere consumidor final por id y no calcula KPIs.

## Endpoints

| Método | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/v1/clientes?soloActivos` | Lista. La pantalla pide todos (`soloActivos=false`) para filtrar localmente |
| POST | `/api/v1/clientes` | Alta |
| GET | `/api/v1/clientes/{id}` | Detalle y edición |
| PUT | `/api/v1/clientes/{id}` | Editar, activar y desactivar |
| GET | `/api/v1/ventas?clienteId` | Historial de ventas |
| GET | `/api/v1/devoluciones-venta?clienteId` | Historial de devoluciones |

`DELETE /api/v1/clientes/{id}` existe y también desactiva. Esta UI no lo llama, para no presentarlo como eliminación.

## Búsqueda

El endpoint no tiene query de texto. La lista busca en lo ya cargado por nombre, número de documento, correo y teléfono. No llama al backend por tecla.

## Filtros

Locales: tipo (`PERSONA`, `EMPRESA`, `CONSUMIDOR_FINAL`) y estado activo/inactivo.

Si se muestran todos, la lista se ordena por nombre en pantalla porque ese GET no garantiza orden.

## Consumidor final

Se reconoce por `tipoCliente === CONSUMIDOR_FINAL` o `consumidorFinal === true`. Nunca por id.

No se puede crear, editar ni desactivar desde la UI. El alta solo ofrece Persona y Empresa. El mensaje es: "El consumidor final es un registro reservado del sistema."

El backend sigue siendo la autoridad.

## Reglas de negocio respetadas

- Documento opcional. `NINGUNO` o sin tipo no exige número y se envía `numeroDocumento: null`.
- Unicidad de documento: se muestra el error del backend como "Ya existe un cliente con esos datos de documento." No se muestra SQL.
- Desactivar no borra. El cliente inactivo sigue en el detalle y en las ventas.
- Reactivar es `PUT` con `activo: true` y el resto de campos actuales.

## Historial de ventas

`GET /api/v1/ventas?clienteId=`. Se muestra número, fecha, método de pago, total y estado, tal como vienen. El enlace usa `/ventas/:id`.

## Historial de devoluciones

`GET /api/v1/devoluciones-venta?clienteId=`. Se muestra número, fecha, venta, motivo, monto y estado. El enlace usa `/ventas/:ventaId/devoluciones/:id` cuando ambos ids existen.

Texto fijo: "No son KPIs calculados. Son las operaciones relacionadas con este cliente."

La fecha se ordena en pantalla porque esos listados no garantizan orden.

## Seguridad

Las cuatro rutas usan `authGuard` y `adminGuard`. El backend exige JWT y `ROLE_ADMIN`. No se tocó `SecurityConfig`.

## Integración con Ventas

Solo cambió el select de nueva venta. Sigue la opción "Consumidor final" con `clienteId = null`. Se excluye de esa lista el registro cuyo tipo es `CONSUMIDOR_FINAL`, para no mostrarlo dos veces. El backend sigue asignando el registro con `obtenerOCrearConsumidorFinal()`.

El filtro de la lista de ventas no se tocó: ahí no había una opción manual duplicada.

## Stitch

Referencia visual: `REFERENCE_code/SecionCliente.cursorrules` y `DetalleCliente.cursorrules`. No se copió HTML.

No se implementó lo que el Stitch muestra y el backend no entrega: clientes nuevos del mes, recurrentes, retención, mayorista, dirección, representante, mayor valor comprado ni pedido desde la ficha.

## UX/UI

Tokens existentes, oscuro, glow moderado, glass controlado. Sin tarjetas de KPI inventadas.

## Estados visuales

Carga, vacío, error y datos en lista, detalle e historiales.

- "No hay clientes registrados."
- "No encontramos clientes que coincidan con tu búsqueda."
- "Este cliente no tiene ventas registradas."
- "Este cliente no tiene devoluciones registradas."

## Limitaciones reales

- No hay métricas oficiales por cliente.
- No hay búsqueda ni paginación en el endpoint.
- El correo no es único.
- No hay dirección ni apellido.
- Desactivar no avisa si hay ventas; el historial permanece.
- Unicidad de un solo consumidor final no está en un índice de base de datos.

## Pendientes

- Analytics de clientes (total, ticket, última compra, recurrencia, retención).
- Búsqueda HTTP y paginación.
- Dirección, apellidos, representante.
- Abrir una venta nueva con el cliente ya elegido.
- Correo único, si el negocio lo pide.

## Tests

- `cliente-ui.spec.ts`: 11 casos. Pasaron.
- `cliente.service.spec.ts`: 4 casos. Pasaron.
- `npx ng test --watch=false --browsers=ChromeHeadless`: 80 ejecutados, 65 correctos, 15 fallos previos (Login, Home, Register, HSP, Demanda Recibo y diálogos). Ningún fallo nuevo de clientes. No se editaron esos tests.

## Build

`npm run build`: correcto. Aviso de presupuesto del bundle inicial (1,55 MB; el límite es 1,50 MB).
