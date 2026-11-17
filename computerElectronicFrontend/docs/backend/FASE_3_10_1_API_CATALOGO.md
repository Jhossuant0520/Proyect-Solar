# SOLVIX — FASE 3.10.1
## API Pública del Catálogo

**Proyecto:** `projectSolvixBackend`  
**Estado:** implementada  
**Fecha:** 2026-09-16

---

## Objetivo

Separar el catálogo público del API administrativo de productos. El visitante solo ve datos comerciales y disponibilidad, nunca costo, stock numérico ni código de barras.

## Arquitectura

```text
Admin (JWT + ROLE_ADMIN)
↓
/api/v1/productos  (ProductoResponseDTO completo)
/api/v1/categorias-producto

Visitante (sin JWT)
↓
/api/v1/catalogo/**  (DTO público reducido)
```

## DTO público

`CatalogoProductoResponseDTO` — no reutiliza `ProductoResponseDTO`.

`CatalogoCategoriaResponseDTO` — id, codigo, nombre.

Enum `DisponibilidadCatalogo`: `DISPONIBLE` | `AGOTADO`.

## Campos expuestos

Producto:

- id, nombre, marca, descripcion
- precioVentaActual, imagenUrl
- categoriaId, categoriaNombre
- disponibilidad

Categoría:

- id, codigo, nombre

## Campos ocultos

- costoActual, costoConocido
- stockActual (número)
- codigoBarras
- fechaCreacion, fechaActualizacion
- activo
- categoriaCodigo (solo en admin)

## Endpoints

| Método | Ruta | Auth | Comportamiento |
| --- | --- | --- | --- |
| GET | `/api/v1/catalogo/productos` | público | Solo `activo=true`. Sin filtros de ocultos |
| GET | `/api/v1/catalogo/productos/{id}` | público | Activo → DTO; inactivo o inexistente → 404 |
| GET | `/api/v1/catalogo/categorias` | público | Solo activas, orden por nombre |

## Seguridad

`SecurityConfig` permite `GET /api/v1/catalogo/**` sin JWT.

Se retiró el `permitAll` de:

- `GET /api/v1/productos/**`
- `GET /api/v1/categorias-producto/**`

`ProductoController` y `CategoriaProductoController` quedan con `@PreAuthorize("hasRole('ADMIN')")` a nivel de clase.

Sin JWT, esos endpoints administrativos responden **403**. Con rol `USUARIO` también 403. Solo `ADMIN` lee el DTO completo.

Ventas, compras, inventario y productos admin siguen funcionando: el frontend admin ya envía JWT.

## Disponibilidad

```text
stockActual > 0  → DISPONIBLE
stockActual == 0 → AGOTADO
```

No se acepta `stockMin` ni ningún query que permita sondear existencias.

## Categorías

Salen de `categorias_producto` activas. No se usan COMPUTO / IMPRESION / SOLAR del mock del frontend.

## Regla de publicación

`activo = true` → aparece en catálogo.  
`activo = false` → no aparece; el detalle responde 404.

No se agregó `visibleCatalogo`.

## Imágenes

`imagenUrl` se reenvía tal cual. No hay upload ni almacenamiento propio. Un 403 del proveedor externo es del host de la imagen, no del catálogo.

## Tests

- `CatalogoServiceTest`: solo activos, DTO sin campos administrativos, disponibilidad, 404 inactivo/inexistente, categorías.
- `CatalogoControllerSecurityTest`: catálogo sin JWT, productos/categorías/admin protegidos, ADMIN sigue leyendo el DTO completo, USUARIO queda en 403.

## Compatibilidad con endpoints existentes

| Endpoint | Antes | Ahora |
| --- | --- | --- |
| GET `/api/v1/productos` | público (exponía costo/stock) | solo ADMIN |
| GET `/api/v1/productos/{id}` | público | solo ADMIN |
| GET `/api/v1/productos/codigo-barras/{codigo}` | público | solo ADMIN |
| GET `/api/v1/categorias-producto` | público | solo ADMIN |
| GET `/api/v1/catalogo/**` | no existía | público |

El contrato de `ProductoResponseDTO` no cambió para el panel.

## Limitaciones

- Sin paginación, búsqueda ni orden avanzado en el catálogo.
- Sin campo separado de “visible en catálogo”.
- La foto sigue siendo URL externa.
- El frontend `/Catalogo` aún usa datos hardcodeados; consumirá esta API en la siguiente fase.

## Estado de la fase

Backend listo. Angular todavía no consume `/api/v1/catalogo`.
