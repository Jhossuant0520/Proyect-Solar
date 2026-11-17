# SOLVIX — Código de barras
## Identificación de productos

**Proyecto:** backend + frontend  
**Fecha:** 2026-09-11  
**Alcance documentado:** identificador opcional en Producto + entrada manual/HID + integración en Ventas/Compras

---

## Objetivo

Permitir registrar, editar, consultar y buscar productos mediante un **código de barras opcional**, tratado como identificador STRING. La entrada puede venir de teclado o de cualquier lector que actúe como teclado HID. En Ventas y Compras, ese identificador se reutiliza para agregar líneas al flujo existente.

---

## Alcance

**Incluido**

- Campo `codigoBarras` / `codigo_barras` en Producto
- Unicidad cuando el valor existe (múltiples NULL permitidos)
- Crear / editar / quitar código (vacío → null)
- Detalle y lista con búsqueda local por código
- Endpoint de búsqueda exacta por código
- Infraestructura reutilizable (`ProductoService.obtenerPorCodigoBarras`, `producto-ui`, `producto-barcode-lookup`)
- Integración en `/ventas/nueva` y `/compras/nueva`

**Fuera de alcance**

- Cámara / webcam / BarcodeDetector / ZXing
- WebUSB / Web Bluetooth
- App Android propia
- Generación o impresión de etiquetas
- QR
- SKU
- Fiscalidad / IVA
- Nuevos endpoints o servicios de código de barras

---

## Arquitectura

```
Lector HID / teclado / Android HID
        ↓ (texto)
Input Angular (producto / venta / compra)
        ↓ STRING
ProductoService.obtenerPorCodigoBarras
        ↓
GET /api/v1/productos/codigo-barras/{codigo}
        ↓
Producto
   ┌────┴────┐
VENTA      COMPRA
carrito    detalle
```

SOLVIX **no** se integra con el hardware del lector. El sistema operativo expone el dispositivo como teclado; el navegador recibe caracteres en el input enfocado.

---

## Modelo de datos

| Capa | Nombre | Tipo |
|------|--------|------|
| SQL | `productos.codigo_barras` | `VARCHAR(50) NULL` + `UNIQUE` |
| JPA | `Producto.codigoBarras` | `String` nullable, unique |
| DTO request/response | `codigoBarras` | `String` opcional |

No reemplaza `id`, nombre, marca ni un futuro SKU.

---

## Campo `codigoBarras`

- Opcional
- Se trata como **string** (conserva ceros iniciales; no es número)
- Trim en backend; vacío → `null`
- Unicidad validada en servicio + índice único en BD
- Mensaje de negocio: `Ya existe un producto con este código de barras.`

---

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/api/v1/productos` | Crear (acepta `codigoBarras`) |
| `PUT` | `/api/v1/productos/{id}` | Actualizar / limpiar código |
| `GET` | `/api/v1/productos` | Lista (incluye `codigoBarras` en respuesta) |
| `GET` | `/api/v1/productos/{id}` | Detalle |
| `GET` | `/api/v1/productos/codigo-barras/{codigoBarras}` | Lookup exacto (reutilizado por Ventas/Compras) |

Seguridad: GET públicos bajo `/api/v1/productos/**` (igual que get-by-id). Escritura ADMIN.

Migración: `V5__producto_codigo_barras.sql` (aplicación manual, igual que V1–V4).

---

## Validaciones

**Backend (autoridad)**

- `@Size(max = 50)`
- Unicidad excluyendo el propio id en update
- No reglas EAN/UPC de longitud fija
- Stock / totales / precios al completar venta o compra

**Frontend (UX)**

- Opcional, `maxLength(50)`, trim
- Muestra el mensaje de negocio del API en snackbar
- 404 de lookup → “No encontramos un producto con ese código de barras.”

---

## Flujo de búsqueda

**Lista de productos:** búsqueda **local** sobre el catálogo cargado: nombre, marca, ID, código (`productoCoincideBusqueda`).

**Lookup exacto:** `resolverProductoPorCodigoBarras` → catálogo local exacto, si no `ProductoService.obtenerPorCodigoBarras`.

```
código ingresado (string)
  → match exacto en catálogo local
  → si no, GET /api/v1/productos/codigo-barras/{codigo}
  → producto
  → agregarProducto() del formulario (mismo flujo de clic)
```

---

## Funcionamiento con teclado/HID

1. El usuario enfoca el buscador de producto (Ventas/Compras) o el campo de código (Producto).
2. Escribe o dispara el lector.
3. Angular recibe el texto como string.
4. Si el lector envía Enter, se evita el submit del formulario y se resuelve el código.
5. El producto encontrado se agrega con el mecanismo existente de línea.

No hay botón “Escanear” ni APIs de hardware.

---

## Compatibilidad

Esta fase **no depende** de:

- `getUserMedia` / cámara
- `BarcodeDetector`
- WebUSB / Web Bluetooth
- apps nativas

Cualquier dispositivo que escriba como teclado es compatible.

---

## Limitaciones actuales

- Sin cámara
- Sin generación / impresión de códigos
- Sin SKU
- Sin paginación server-side de productos (la búsqueda local cubre el catálogo cargado)
- Si el producto ya está en la venta/compra, no se duplica la línea (misma regla del selector actual)

---

## Integración con Ventas y Compras

### Cómo se reutiliza `ProductoService`

- **Única** fuente HTTP de lookup: `ProductoService.obtenerPorCodigoBarras(codigo)`
- Helper compartido: `resolverProductoPorCodigoBarras(...)` en `producto-barcode-lookup.ts`
- Ventas y Compras **no** tienen su propio servicio de código de barras

### Endpoint utilizado

`GET /api/v1/productos/codigo-barras/{codigoBarras}`

Sin endpoints nuevos en esta extensión.

### Flujo de búsqueda en formularios

1. Placeholder: “Nombre, ID o código de barras”
2. Filtro local en vivo (`productoCoincideBusqueda`) — muestra nombre, precio/costo, stock y código
3. **Enter** (HID o teclado):
   - si hay exactamente 1 resultado filtrado → `agregarProducto`
   - si no → lookup exacto (local + API)
4. Producto encontrado → `agregarProducto` (mismo FormArray / mismas reglas)
5. Producto no encontrado (404) → snackbar humano
6. Producto ya en líneas → snackbar “Este producto ya está en la venta/compra.” (no se inventa incremento de cantidad)

### Comportamiento HID

- El input acepta texto continuo del lector
- `keydown.enter` hace `preventDefault` para no disparar `ngSubmit`
- No se asume que todos los lectores envían Enter: el usuario también puede hacer clic en el resultado filtrado

### Integración al carrito / detalle

- **Venta:** reutiliza `VentaFormComponent.agregarProducto` (cantidad 1, precio de catálogo, stock informativo)
- **Compra:** reutiliza `CompraFormComponent.agregarProducto` (cantidad 1, costo de catálogo si existe)
- No hay segunda lógica de carrito

### Responsabilidad del backend

- Existencia del código
- Unicidad del código en catálogo
- Al registrar/completar: stock, totales, costeo, permisos

Angular solo **identifica** el producto y arma la solicitud con las mismas reglas previas.

---

## Archivos relevantes

```
Backend
  db/migration/V5__producto_codigo_barras.sql
  model/.../Producto.java
  dtos/.../ProductoRequestDTO.java | ProductoResponseDTO.java
  repository/.../ProductoRepository.java
  service/.../ProductoService.java
  controller/.../ProductoController.java
  test/.../ProductoCodigoBarrasTest.java

Frontend
  productoClase.ts
  producto.service.ts (+ spec)
  producto-ui.ts (+ spec)
  producto-barcode-lookup.ts (+ spec)
  producto.html / producto.ts
  producto-list / producto-detail
  venta-form / compra-form
  docs/frontend/FASE_CODIGO_BARRAS.md
```
