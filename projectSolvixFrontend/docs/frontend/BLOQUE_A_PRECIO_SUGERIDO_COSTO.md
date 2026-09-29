# SOLVIX — BLOQUE A
## Precio sugerido (recargo sobre costo) y costo fuera del listado

**Alcance:** módulo Productos (frontend + DTO de listado backend)  
**Fecha:** 2026-09-27  
**No incluye:** Cotizaciones comerciales, cambios de política de costeo, columna `porcentajeRecargo`.

---

### 1. Objetivo

1. Calcular un **precio sugerido** con recargo sobre costo:  
   `precioSugerido = costo × (1 + porcentaje / 100)`  
   (no es margen sobre ventas).
2. Mantener **control total** del usuario sobre `precioVentaActual`.
3. Dejar de exponer / editar **costo** en la tabla general de productos.
4. Conservar costo en detalle, creación y ajuste de costo.

---

### 2. UX

**Crear / editar producto** y **diálogo rápido**:

- Costo actual (editable solo al crear; en edición vía “Ajustar costo”)
- Recargo sobre costo (%) — solo UI, no se persiste
- Precio sugerido (calculado)
- Precio de venta (obligatorio, control del usuario)
- Botón **Usar precio sugerido** → copia el sugerido al precio de venta

Cambiar costo o % **recalcula el sugerido** y **no** modifica el precio de venta hasta pulsar el botón.

**Detalle:** muestra precio de venta, costo y calculadora local de recargo/sugerido (referencia).

**Listado:** columnas operativas (producto, marca, categoría, precio venta, stock, estado, acciones). Sin costo ni edición de costo.

---

### 3. Persistencia

Se siguen persistiendo únicamente:

- `costoActual` (create / ajuste)
- `precioVentaActual`

El porcentaje de recargo **no** se guarda en BD.

---

### 4. Backend

| Endpoint | DTO | Costo |
|----------|-----|-------|
| `GET /api/v1/productos` (listado/búsqueda) | `ProductoListadoResponseDTO` | **No** incluye `costoActual` / `costoConocido` |
| `GET /api/v1/productos/{id}` | `ProductoResponseDTO` | Sí |
| `POST` / `PUT` / código de barras | `ProductoResponseDTO` | Sí |

Archivos:

- `ProductoListadoResponseDTO.java`
- `ProductoService.listar(...)` → listado
- `ProductoController.listar`

---

### 5. Frontend

| Archivo | Cambio |
|---------|--------|
| `producto-ui.ts` | `calcularPrecioSugerido`, `esPorcentajeRecargoValido` |
| `producto.html` / `producto.ts` | Calculadora + botón usar sugerido |
| `producto-rapido-dialog` | Misma calculadora en alta rápida |
| `producto-detail` | Costo + calculadora referencia |
| `producto-list` | Sin columna/acción de costo |

---

### 6. Tests

- FE: `producto-ui.spec.ts` (fórmula, 0%, inválidos, no mutación de precio venta)
- BE: `ProductoBusquedaServiceTest.listadoSinCostoDetalleConCosto`

---

### 7. Fuera de alcance de este bloque

- Cotizaciones comerciales
- Cambiar redondeo global de moneda
- Nueva columna de porcentaje en BD
- Rediseño visual del módulo
