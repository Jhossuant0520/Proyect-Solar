# SOLVIX — FASE 3.15.2.1 Gestión de Equipos (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Backend:** contratos Equipo ya existentes (sin cambios)

---

## Objetivo

Permitir que ADMIN registre, edite y desactive equipos desde la ficha del cliente, para que estén disponibles al crear una Orden de Servicio.

```
Cliente → Equipo → Orden de Servicio
```

---

## Ubicación

No hay ítem de sidebar “Equipos”.

Gestión principal en:

`/clientes/:id` → sección **Equipos del cliente**

---

## Rutas

| Ruta | Cambio |
|------|--------|
| `/clientes/:id` | Panel de equipos embebido |
| `/servicios/nueva` | Ya cargaba equipos; hint con enlace a ficha del cliente si no hay equipos |

Sin rutas nuevas `/equipos`.

---

## Componentes

| Pieza | Rol |
|-------|-----|
| `ClienteEquiposPanelComponent` | Listado + formulario expandible crear/editar + desactivar/activar |
| `ClienteDetailComponent` | Integra el panel tras “Información del cliente” |

---

## Servicio

Reutiliza `EquipoService` (sin duplicar):

- `listar({ clienteId, soloActivos })`
- `crear` / `actualizar` / `desactivar`

---

## Endpoints

| Método | Endpoint |
|--------|----------|
| GET | `/api/v1/equipos?clienteId=&soloActivos=` |
| POST | `/api/v1/equipos` |
| PUT | `/api/v1/equipos/{id}` |
| DELETE | `/api/v1/equipos/{id}` (soft-delete) |

---

## Cliente → Equipo

- `clienteId` fijado por la ficha actual.
- No se elige otro cliente en el formulario.
- Campos reales: tipoEquipo, marca, modelo, numeroSerie, nombre, observaciones.
- Consumidor final: sección bloqueada (backend tampoco permite equipos de taller).

---

## Integración con Servicios

`/servicios/nueva`:

1. Cliente (sin consumidor final)
2. GET equipos activos del cliente
3. Selección de equipo
4. POST orden

Si no hay equipos: enlace a `/clientes/:id` para registrarlos.

---

## Seguridad

Rutas admin existentes (`authGuard` + `adminGuard`). Sin rol TÉCNICO.

---

## UX/UI

- Cards por equipo: título, tipo, serial, badge Activo/Inactivo.
- Acciones: Editar / Desactivar equipo (o Activar).
- Formulario expandible (crear/editar) Tech-Minimal.
- Toggle “Ver equipos inactivos”.
- Estados loading / empty / error / ready.

---

## Tests

`cliente-equipos-panel.spec.ts`: listar, empty, error, crear, editar, desactivar.  
Specs existentes de `servicio-form` cubren carga/cambio de cliente.

---

## Build

```bash
npm run build
npx ng test --watch=false --browsers=ChromeHeadless
```

- `npm run build`: OK  
- Specs de fase (`cliente-equipos-panel`, `servicio-form`, `equipo.service`): 17/17 OK  
- Suite global: fallos previos ajenos a esta fase (login, homepage, módulos solares, etc.)

---

## Pendientes

- Módulo sidebar global de equipos (no requerido).
- Alta rápida de equipo embebida en `/servicios/nueva`.
- Rol TÉCNICO.
