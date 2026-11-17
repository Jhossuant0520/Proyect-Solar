# SOLVIX — FASE 3.10.2 Catálogo Angular (API pública)

## Objetivo

Reemplazar el catálogo estático de `/Catalogo` por una vitrina alimentada exclusivamente por la API pública:

- `GET /api/v1/catalogo/productos`
- `GET /api/v1/catalogo/productos/{id}`
- `GET /api/v1/catalogo/categorias`

Sin modificar backend. Sin reutilizar `ProductoService` ni `/api/v1/productos`.

## Arquitectura

```
ADMIN (JWT)
ProductoService → /api/v1/productos → BD

PÚBLICO (sin JWT obligatorio)
CatalogoService → /api/v1/catalogo/* → productos activos publicados
                ↓
           /Catalogo (listado)
           /Catalogo/:id (ficha)
```

Flujo de compra futuro previsto:

```
Card → Detalle público → Acción de compra/contacto
```

WhatsApp queda como contacto opcional en la ficha, no como identidad del producto.

## CatalogoService

Archivo: `src/app/core/services/catalogo.service.ts`

Métodos:

| Método | Endpoint |
|--------|----------|
| `listarProductos()` | `GET /api/v1/catalogo/productos` |
| `obtenerProducto(id)` | `GET /api/v1/catalogo/productos/{id}` |
| `listarCategorias()` | `GET /api/v1/catalogo/categorias` |

No llama a `/api/v1/productos`.

## Modelos

Archivo: `src/app/core/models/catalogo.models.ts`

### CatalogoProducto

- `id`
- `nombre`
- `marca`
- `descripcion`
- `precioVentaActual`
- `imagenUrl`
- `categoriaId`
- `categoriaNombre`
- `disponibilidad` (`DISPONIBLE` | `AGOTADO`)

### CatalogoCategoria

- `id`
- `codigo`
- `nombre`

Sin `costoActual`, `stockActual`, `codigoBarras`, fechas ni `activo`.

## Mapper

Archivo: `src/app/core/mappers/catalogo-mapper.ts`

Normaliza DTO → UI:

- precio numérico (incluye string JSON)
- `imagenUrl` vacía → `null`
- disponibilidad desconocida → `DISPONIBLE` solo si no es `AGOTADO`

No calcula stock, costo, ganancia ni margen.

## Endpoints

Base: `http://localhost:8080/api/v1/catalogo`

Publicados solo productos `activo = true` (regla backend). Desactivar un producto lo saca del catálogo.

## Categorías

Se cargan desde BD vía `listarCategorias()`.

Filtro visual de chips conserva el patrón del catálogo anterior, pero los nombres salen de la API.

Filtro de categoría: local sobre el arreglo ya cargado (sin request por chip).

## Disponibilidad

UI consume exactamente:

- `DISPONIBLE` → badge success (“Disponible”)
- `AGOTADO` → badge warning (“Agotado”)

No se recalcula con `stockActual > 0` en Angular.

## Imágenes

- Se usa `imagenUrl` tal cual.
- Si falta o falla la carga (`error` del `<img>`), se muestra “Sin imagen”.
- Sin proxy, sin URL inventada, sin storage local.

## Filtros

- Categoría: local por `categoriaId`
- Búsqueda: local por nombre, marca y descripción (sin debounce de red; sin endpoint nuevo)

## Estados visuales

| Estado | UI |
|--------|----|
| LOADING | skeleton de cards |
| SUCCESS | grid de productos |
| EMPTY | “No hay productos disponibles en este momento.” |
| ERROR | “No pudimos cargar el catálogo.” + Reintentar |

Filtro sin resultados: “No hay productos con ese filtro.”

## Responsive

- Desktop: toolbar horizontal, grid `auto-fill`
- Tablet/móvil: 2 columnas
- Móvil estrecho: 1 columna
- Un solo scroll vertical principal

## Seguridad

- Catálogo público no exige JWT.
- Si el usuario está logueado, el interceptor puede enviar Bearer; el backend público lo tolera.
- Admin sigue protegido en `/api/v1/productos`.

## Diferencia Admin vs Público

| | Admin | Público |
|--|-------|---------|
| Servicio | `ProductoService` | `CatalogoService` |
| API | `/api/v1/productos` | `/api/v1/catalogo/*` |
| Auth | JWT + ADMIN | público |
| Datos | costo, stock, barcode, activo | vitrina comercial |

## Stitch / diseño

Identidad SOLVIX (bg `#020617`, surface `#0f172a`, primary `#4fd1ff`).

Experiencia de tienda pública (Cyber-Glow en CTAs), no panel admin Tech-Minimal.

Cards: imagen, nombre, marca, descripción, precio (`formatMoney` es-CO), categoría, disponibilidad, “Ver detalles”.

## Tests

- `catalogo-mapper.spec.ts` — mapeo DTO → UI
- `catalogo.service.spec.ts` — carga productos/categorías/detalle; no usa `/productos`
- `catalogo-ui.spec.ts` — filtros, búsqueda, disponibilidad
- `catalog.spec.ts` — LOADING / SUCCESS / EMPTY / ERROR / filtro / imagen rota
- `catalog-detail.spec.ts` — ficha y error

## Build

```bash
npm run build
npx ng test --watch=false --browsers=ChromeHeadless --include=**/catalog*.spec.ts --include=**/catalogo*.spec.ts
```

`npm run build` OK.

Suite completa del proyecto: fallos previos ajenos a catálogo (login/register/homepage/providers). Los specs de esta fase pasan.
## Limitaciones

- Sin carrito, checkout, login cliente, pagos, IVA, descuentos.
- WhatsApp es contacto temporal en la ficha, no fuente de catálogo.
- Precio = `precioVentaActual` sin descuentos inventados.

## Próximos pasos

1. Acción de compra real o lead formal en ficha.
2. Preview homepage alimentada por API (opcional).
3. SEO / meta por producto.
4. Paginación si el catálogo crece.
