# SOLVIX — FASE 1: Gestión Comercial

Estado: **implementada y estable**, incluida la ampliación de devoluciones (sección 10). No se avanzó a FASE 2 (sin BI, analytics, reportes ni gráficos).

---

## 1. Resumen de arquitectura

El módulo pasa de un CRUD de productos a una base transaccional preparada para inteligencia de negocio. Tres ideas sostienen el diseño:

**El producto guarda el presente, las transacciones guardan el pasado.**
`Producto` solo contiene valores vigentes (`precioVentaActual`, `costoActual`, `stockActual`). Cada venta y cada compra congelan su propio contexto económico en el detalle. Ningún reporte necesita mirar el producto actual para reconstruir un hecho pasado.

**El inventario tiene un solo dueño.**
`InventarioService` es el único componente que escribe `Producto.stockActual`, y cada escritura genera una fila en `movimientos_inventario` con `stockAnterior` y `stockNuevo`. `ProductoService` rechaza explícitamente cualquier intento de mover stock desde el `PUT` de producto.

**El costo es una política, no un dato fijo.**
`PoliticaCosteoInventario` es una interfaz. Hoy hay una implementación (`UltimoCostoPolitica`). El historial de compras guarda cada `costoUnitario` aplicado y los movimientos de inventario guardan el costo de cada entrada, así que cambiar a promedio ponderado será añadir una implementación nueva y cambiar una propiedad: no requiere tocar ni reconstruir el historial.

### Capas

Se mantuvo el patrón existente: `Controller → DTO → Service → Repository → Entity`. La entidad nunca se expone; los filtros compuestos se resuelven con `Specifications`, igual que ya hacía `ProductoSpecifications`.

### Costo conocido vs. costo desconocido

`costoActual = NULL` significa **costo desconocido**, no costo cero. En las ventas, `DetalleVenta` guarda `costoUnitario` (nullable) y además un booleano explícito `costoConocido`, para que analytics pueda excluir esas líneas en lugar de calcular un margen falso del 100%. Los productos migrados quedan con costo desconocido hasta su primera compra completada.

### Consumidor final

Se identifica por `Cliente.tipoCliente = CONSUMIDOR_FINAL`, no por un id fijo. `ClienteService.obtenerOCrearConsumidorFinal()` lo resuelve por tipo y lo crea si no existe. El tipo está reservado: la API rechaza que un admin cree o edite clientes con ese tipo.

---

## 2. Entidades

### Creadas

| Entidad | Tabla | Propósito |
|---|---|---|
| `CategoriaProducto` | `categorias_producto` | Categoría administrable (antes enum) |
| `Cliente` | `clientes` | Cliente comercial, incluye Consumidor final |
| `Proveedor` | `proveedores` | Proveedor de compras |
| `Venta` | `ventas` | Cabecera de venta |
| `DetalleVenta` | `detalle_venta` | Línea de venta con contexto congelado |
| `Compra` | `compras` | Cabecera de compra |
| `DetalleCompra` | `detalle_compra` | Línea de compra con costo congelado |
| `MovimientoInventario` | `movimientos_inventario` | Libro mayor del stock |
| `SecuenciaDocumento` | `secuencias_documento` | Contador anual de numeración |

### Modificada

`Producto` (`productos`): reemplazo de variables económicas y FK a categoría.

### Enums nuevos

`TipoCliente`, `TipoDocumento`, `EstadoVenta`, `EstadoCompra`, `MetodoPago`, `TipoMovimientoInventario`, `DireccionMovimiento`, `ReferenciaMovimiento`, `TipoSecuencia`.

`CategoriaProducto` dejó de ser enum y pasó a ser entidad en el mismo paquete.

---

## 3. Variables de `Producto`

**Reemplazadas**

| Antes | Ahora | Nota |
|---|---|---|
| `precio` | `precioVentaActual` | Mismo valor migrado |
| `cantidadStock` | `stockActual` | Mismo valor migrado |
| `categoria` (enum) | `categoria` (`@ManyToOne` a `CategoriaProducto`) | FK `categoria_id` |

**Agregadas**

- `costoActual` (`BigDecimal`, nullable — NULL = costo desconocido)
- `tieneCostoConocido()` — método derivado para analytics
- En DTOs: `categoriaId`, `categoriaCodigo`, `categoriaNombre`, `costoConocido`, `stockInicial` (solo creación)

**Eliminadas del modelo Java** (las columnas siguen en MySQL hasta la etapa 9 del SQL)

- `precio`, `cantidadStock`, y el enum `CategoriaProducto`

---

## 4. Archivos

### Backend — creados (43)

**Modelo**
`ModulProductoModel/CategoriaProducto.java` (enum → entidad)
`ModulComercialModel/`: `Cliente`, `Proveedor`, `Venta`, `DetalleVenta`, `Compra`, `DetalleCompra`, `MovimientoInventario`, `SecuenciaDocumento`, `TipoCliente`, `TipoDocumento`, `EstadoVenta`, `EstadoCompra`, `MetodoPago`, `TipoMovimientoInventario`, `DireccionMovimiento`, `ReferenciaMovimiento`, `TipoSecuencia`

**Repositorios**
`ModulProductoRepo/CategoriaProductoRepository`
`ModulComercialRepo/`: `ClienteRepository`, `ProveedorRepository`, `VentaRepository`, `DetalleVentaRepository`, `CompraRepository`, `DetalleCompraRepository`, `MovimientoInventarioRepository`, `SecuenciaDocumentoRepository`, `VentaSpecifications`, `CompraSpecifications`, `MovimientoInventarioSpecifications`

**Servicios**
`ModulProductoService/CategoriaProductoService`
`ModulComercialService/`: `InventarioService`, `ClienteService`, `ProveedorService`, `VentaService`, `CompraService`, `SecuenciaDocumentoService`, `costeo/PoliticaCosteoInventario`, `costeo/UltimoCostoPolitica`

**DTOs**
`ModulProductoDtos/`: `CategoriaProductoRequestDTO`, `CategoriaProductoResponseDTO`
`ModulComercialDtos/`: `ClienteRequestDTO`, `ClienteResponseDTO`, `ProveedorRequestDTO`, `ProveedorResponseDTO`, `VentaRequestDTO`, `VentaResponseDTO`, `DetalleVentaRequestDTO`, `DetalleVentaResponseDTO`, `CompraRequestDTO`, `CompraResponseDTO`, `DetalleCompraRequestDTO`, `DetalleCompraResponseDTO`, `DevolucionRequestDTO`, `DevolucionLineaDTO`, `AjusteInventarioRequestDTO`, `MovimientoInventarioResponseDTO`, `StockProductoResponseDTO`

**Controllers**
`ModulProductoContro/CategoriaProductoController`
`ModulComercialContro/`: `ClienteController`, `ProveedorController`, `VentaController`, `CompraController`, `InventarioController`

**Otros**
`resources/db/migration/V1__fase1_gestion_comercial.sql`

**Tests**
`ComercialTestSupport`, `InventarioServiceTest`, `VentaServiceTest`, `CompraServiceTest`, `ProductoStockReglaTest`

### Backend — modificados

- `model/.../Producto.java` — nuevas variables y FK
- `dtos/.../ProductoRequestDTO.java`, `ProductoResponseDTO.java`
- `repository/.../ProductoRepository.java`, `ProductoSpecifications.java`
- `service/.../ProductoService.java` — stock delegado a inventario
- `controller/.../ProductoController.java` — filtro por `categoriaId`, `Principal`
- `security/SecurityConfig.java` — lectura pública de categorías
- `security/JwtUtil.java` — claim `rol`
- `controller/AccesController/controllerUsuarioLogin.java` — emite el claim
- `resources/application.properties` — `solvix.inventario.politica-costo`

### Frontend — creados

- `core/services/categoria-producto.service.ts`
- `core/guards/admin-guard.ts`

### Frontend — modificados

- `features/panelAdmin/producto/productoClase.ts` — modelo alineado
- `features/panelAdmin/producto/producto.ts` / `.html` / `.scss`
- `features/panelAdmin/producto/producto-list/producto-list.ts` / `.html` / `.scss`
- `core/services/producto.service.ts`
- `core/services/auth.service.ts` — `obtenerRol()`, `esAdmin()`
- `app.routes.ts` — `adminGuard` en las rutas de producto

---

## 5. Endpoints

### Modificados

| Método | Ruta | Cambio |
|---|---|---|
| GET | `/api/v1/productos` | `categoria` (enum) → `categoriaId` (Long) |
| POST | `/api/v1/productos` | Acepta `costoActual` y `stockInicial`; el stock inicial genera movimiento |
| PUT | `/api/v1/productos/{id}` | Rechaza cambios de stock |

### Creados

**Categorías** — lectura pública, escritura ADMIN
`GET /api/v1/categorias-producto` · `GET /{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` (desactiva)

**Clientes / Proveedores** — ADMIN
`GET|POST /api/v1/clientes` · `GET|PUT|DELETE /api/v1/clientes/{id}`
`GET|POST /api/v1/proveedores` · `GET|PUT|DELETE /api/v1/proveedores/{id}`

**Ventas** — ADMIN
`POST /api/v1/ventas` · `GET /api/v1/ventas` (filtros `clienteId`, `estado`, `desde`, `hasta`) · `GET /{id}`
`POST /{id}/completar` · `POST /{id}/cancelar` · `POST /{id}/devoluciones`

**Compras** — ADMIN
`POST /api/v1/compras` · `GET /api/v1/compras` (filtros `proveedorId`, `estado`, `desde`, `hasta`) · `GET /{id}`
`POST /{id}/completar` · `POST /{id}/cancelar` · `POST /{id}/devoluciones`

**Inventario** — ADMIN
`GET /api/v1/inventario/movimientos` (filtros `productoId`, `tipo`, `desde`, `hasta`)
`POST /api/v1/inventario/ajustes`
`GET /api/v1/inventario/productos/{id}/stock`

Seguridad: se mantiene JWT + `@PreAuthorize("hasRole('ADMIN')")`. Lo único público es la lectura del catálogo (productos y categorías).

---

## 6. Reglas de negocio

**Inventario**
1. Solo `InventarioService` modifica `stockActual`.
2. Toda variación genera un `MovimientoInventario` con `stockAnterior` y `stockNuevo`.
3. Una salida que dejaría el stock negativo se rechaza con el detalle de disponible vs. requerido.
4. La cantidad de un movimiento siempre es positiva; el signo lo aporta la dirección, definida de forma fija por el tipo.
5. Los ajustes manuales solo aceptan `AJUSTE_ENTRADA`, `AJUSTE_SALIDA` y `MERMA`.
6. El stock inicial de un producto nuevo entra como `CARGA_INICIAL`.

**Ventas**
7. Sin cliente explícito, la venta se asocia al Consumidor final.
8. El precio se congela al crear la línea; el costo, al completar la venta (momento en que se consume el inventario).
9. Solo se completa desde `PENDIENTE`; completar valida stock, registra movimientos, actualiza stock y cambia estado dentro de una sola transacción.
10. Solo se cancela desde `PENDIENTE`. Una venta completada se revierte con devolución.
11. Devolver más de lo pendiente se rechaza. Devolución parcial → `PARCIALMENTE_DEVUELTA`; total → `DEVUELTA`.
12. El descuento de cabecera no puede superar el subtotal, ni el de línea su valor bruto.

**Compras**
13. Completar ingresa stock y actualiza `costoActual` según la política activa.
14. La devolución a proveedor retira stock con `DEVOLUCION_COMPRA`.
15. El `costoUnitario` histórico de cada línea nunca se recalcula.

**Numeración**
16. `V-{yyyy}-{seq}` y `C-{yyyy}-{seq}` con contador anual y bloqueo pesimista sobre la secuencia.

---

## 7. Pruebas

Ejecutadas con `mvn test` (H2 en memoria, perfil `test`). Las pruebas del módulo comercial **no** usan `@Transactional`, para que el commit y el rollback reales de los servicios queden verificados.

**Resultado: 35 pruebas, 0 fallos, 0 errores.**

| Clase | Pruebas | Cubre |
|---|---|---|
| `InventarioServiceTest` | 5 | Entrada con `stockAnterior`/`stockNuevo`, stock insuficiente sin efectos, merma, tipos de ajuste inválidos, cantidad no positiva |
| `VentaServiceTest` | 11 | Totales y numeración, Consumidor final automático, completar con descuento de stock y costo congelado, precio histórico inmutable ante cambios de precio, stock insuficiente con reversión completa, costo desconocido, cancelación, devolución parcial y total, exceso de devolución, descuento inválido |
| `CompraServiceTest` | 6 | Creación sin mover inventario, completar con ingreso y último costo, reemplazo del costo vigente sin alterar el histórico, cancelación no permitida tras completar, devolución a proveedor, descuento inválido |
| `ProductoStockReglaTest` | 5 | `CARGA_INICIAL` al crear, prohibición de modificar stock por `PUT`, edición de datos maestros sin tocar stock, costo desconocido, conservación de precio y stock migrados |
| `SmokeTest` | 1 | Arranque del contexto |

Verificación adicional: `mvn compile` sin errores y `ng build` del frontend sin errores.

---

## 8. Migración MySQL

El script completo está en `src/main/resources/db/migration/V1__fase1_gestion_comercial.sql`, organizado en las etapas pedidas: categorías, producto, clientes, proveedores, numeración, compras, ventas, movimientos de inventario, y una etapa 9 comentada para el retiro posterior de lo antiguo.

No hace `DROP` de `productos` ni de ninguna otra tabla con datos. Las columnas antiguas (`precio`, `cantidad_stock`, `categoria`) se conservan y solo se vuelven `NULL`-ables.

### Instrucciones exactas

**Importante: ejecuta el SQL ANTES de arrancar la aplicación.** Con `ddl-auto=update`, si Spring arranca primero intentará crear las columnas nuevas como `NOT NULL` sobre una tabla con filas y fallará.

```bash
# 1. Respaldo (obligatorio, no opcional)
mysqldump -u root -p solarfishdb > backup_pre_fase1.sql

# 2. Foto de control del estado actual
mysql -u root -p solarfishdb -e "SELECT COUNT(*) AS productos, SUM(cantidad_stock) AS stock_total FROM productos;"

# 3. Ejecutar la migración
mysql -u root -p solarfishdb < src/main/resources/db/migration/V1__fase1_gestion_comercial.sql
```

```sql
-- 4. Verificar que no se perdió nada (las tres consultas deben cuadrar)

-- 4.a No debe devolver ninguna fila: todos los valores se trasladaron bien
SELECT id, precio, precio_venta_actual, cantidad_stock, stock_actual
FROM productos
WHERE (precio IS NOT NULL AND precio <> precio_venta_actual)
   OR (cantidad_stock IS NOT NULL AND cantidad_stock <> stock_actual);

-- 4.b Todos los productos deben tener categoría
SELECT COUNT(*) AS sin_categoria FROM productos WHERE categoria_id IS NULL;   -- esperado: 0

-- 4.c El Consumidor final debe existir exactamente una vez
SELECT COUNT(*) AS consumidor_final FROM clientes WHERE tipo_cliente = 'CONSUMIDOR_FINAL';  -- esperado: 1
```

```bash
# 5. Arrancar el backend
mvn spring-boot:run

# 6. Arrancar el frontend
cd ../projectSolvixFrontend && npm start
```

**Rollback:** `mysql -u root -p solarfishdb < backup_pre_fase1.sql`.

**Etapa 9 (retiro de columnas antiguas):** ejecutar solo después de un ciclo estable, con la verificación 4.a en cero y respaldo nuevo. Las sentencias están comentadas al final del script.

---

## 9. Decisiones pendientes

1. **Categorías de la semilla.** El script siembra siete categorías genéricas y además rescata cualquier código histórico que aparezca en `productos`. Si prefieres otro conjunto, conviene ajustarlo antes de que se registren ventas, porque `categoriaCodigo` se copia como snapshot en cada detalle.

2. **Registro del costo inicial de los productos migrados.** Hoy quedan como costo desconocido, que es lo correcto. La opción es esperar a la primera compra de cada producto o cargar los costos con un `UPDATE` puntual si ya los tienes en otro lado. No hace falta decidirlo ahora.

3. **Unicidad del Consumidor final.** MySQL no permite un índice único parcial, así que la garantía de "uno solo" vive en el servicio, no en el esquema. Si más adelante quieres blindarlo a nivel de base de datos, se puede añadir una columna generada con índice único.

4. **Momento del snapshot de costo en la venta.** Se eligió el momento de completar, porque es cuando el inventario se consume. Si prefieres que sea el momento de crear la venta, es un cambio de una línea en `VentaService`.

5. ~~**Devoluciones y valores monetarios.**~~ Resuelto en la sección 10: las devoluciones ahora son un documento económico propio.

6. **Secreto JWT en código.** `JwtUtil` sigue con la clave embebida heredada. No entraba en el alcance de FASE 1, pero conviene moverla a una variable de entorno antes de cualquier despliegue real.

---

## 10. Ampliación: devoluciones como documento económico

### 10.1 Por qué

La venta original **nunca** se recalcula. Una venta de $300.000 con una devolución posterior de $100.000 sigue valiendo $300.000 en su registro histórico. La devolución vive aparte con su propio importe, y analytics obtiene la venta neta restando:

```
ventas netas = ventas brutas - devoluciones
```

Esto permite distinguir las seis métricas pedidas sin ambigüedad: ventas brutas, devoluciones, ventas netas, costo de ventas, ganancia bruta y margen bruto.

### 10.2 Entidades creadas

| Entidad | Tabla | Contenido |
|---|---|---|
| `DevolucionVenta` | `devoluciones_venta` | `numero` (D-{yyyy}-{seq}), venta, fecha, motivo, estado, método y fecha de reembolso, `montoTotalDevuelto`, `costoTotalDevuelto`, `costoCompletoConocido`, observaciones, auditoría |
| `DetalleDevolucionVenta` | `detalle_devolucion_venta` | devolución, `detalleVenta`, producto, cantidad, `montoDevuelto`, `costoUnitario`, `costoConocido` |

**Enums nuevos:** `MotivoDevolucion` (6 causas, enum y no texto libre para poder agrupar en BI), `EstadoDevolucionVenta` (`REGISTRADA`, `REEMBOLSADA`), `MetodoReembolso` (5 formas).

**Sin duplicación:** el detalle de devolución no repite nombre ni categoría del producto porque apunta directamente a `DetalleVenta`, donde ya viven congelados. Solo guarda lo que la línea de venta no puede responder: cuánto se devolvió y qué costo se revierte.

### 10.3 Cálculo del monto devuelto

El importe se calcula sobre lo que el cliente realmente pagó: se toma el subtotal de la línea (ya neto de su descuento), se prorratea por la cantidad devuelta y se le aplica la proporción del descuento de cabecera, con un único redondeo al final.

```
montoDevuelto = detalle.subtotal × cantidadDevuelta × venta.total
                ────────────────────────────────────────────────
                       detalle.cantidad × venta.subtotal
```

Cuando la venta queda totalmente devuelta, la suma de todas sus devoluciones debe coincidir exactamente con el total de la venta. Como el prorrateo puede dejar diferencias de centavos, el residuo se imputa a la última línea de la devolución que cierra el ciclo. Hay una prueba específica para esto (venta de $290 devuelta en dos partes de 1 y 2 unidades, que suman $290 exactos).

### 10.4 Costo de ventas revertido

Cada línea devuelta copia el `costoUnitario` congelado en la venta original, nunca `Producto.costoActual`. El encabezado acumula `costoTotalDevuelto` sumando solo las líneas con costo conocido, y marca `costoCompletoConocido = false` si alguna línea venía de un producto migrado sin costo. Así analytics sabe cuándo la reversión del costo de ventas está incompleta en lugar de asumir cero.

### 10.5 Cambios sobre el modelo existente

- `VentaService.devolver(...)` **se eliminó**; la lógica vive ahora en `DevolucionVentaService`. `VentaService` quedó enfocado en el ciclo de vida de la venta.
- `ReferenciaMovimiento` suma `DEVOLUCION_VENTA`: los movimientos de inventario de una devolución ahora referencian el documento de devolución, no la venta, lo que da trazabilidad exacta.
- `TipoSecuencia` suma `DEVOLUCION_VENTA` con prefijo `D`.
- `EstadoVenta.esVentaRealizada()`: nuevo método que devuelve `true` para `COMPLETADA`, `PARCIALMENTE_DEVUELTA` y `DEVUELTA`. Es el criterio de venta bruta para FASE 2 — una venta devuelta sigue siendo una venta.
- `DetalleVenta.cantidadDevuelta` se conserva sin cambios: es el control de cuánto queda por devolver.
- **Sin cambios** en `Venta` (`subtotal`, `descuento`, `total` intactos), `Producto`, `Compra`, `Cliente`, `Proveedor` ni `MovimientoInventario`.

Las devoluciones de **compra** quedaron fuera del alcance de esta ampliación y se resolvieron después, en la sección 11.

### 10.6 Endpoints

| Método | Ruta | Nota |
|---|---|---|
| POST | `/api/v1/ventas/{id}/devoluciones` | **Cambió**: ahora recibe motivo y método de reembolso opcional, y devuelve `DevolucionVentaResponseDTO` con `201` en lugar del DTO de venta |
| GET | `/api/v1/ventas/{id}/devoluciones` | Nuevo: devoluciones de una venta |
| GET | `/api/v1/devoluciones-venta` | Nuevo: filtros `ventaId`, `clienteId`, `estado`, `motivo`, `desde`, `hasta` |
| GET | `/api/v1/devoluciones-venta/{id}` | Nuevo |
| POST | `/api/v1/devoluciones-venta/{id}/reembolsar` | Nuevo: registra el reembolso posterior |

Todos requieren rol ADMIN. El frontend todavía no consume estos endpoints, así que el cambio de contrato no rompe nada en uso.

### 10.7 Transaccionalidad

`DevolucionVentaService.registrar` es `@Transactional`. Dentro de una sola transacción: valida el estado de la venta, valida cada cantidad contra lo pendiente, persiste la cabecera, registra los movimientos de inventario, actualiza el stock, incrementa `cantidadDevuelta`, calcula los importes y actualiza el estado de la venta. Si cualquier paso falla no queda rastro de ninguno; hay una prueba que lo verifica comprobando que tras un rechazo no existe devolución, ni movimiento, ni cambio de stock, ni cambio de estado.

### 10.8 Migración

`src/main/resources/db/migration/V2__devoluciones_venta.sql`. Requiere V1 aplicado. No toca ninguna fila de `ventas`.

Etapas: ampliación de los `CHECK` de `secuencias_documento` y `movimientos_inventario`, creación de `devoluciones_venta`, creación de `detalle_devolucion_venta`, e índices. Al final incluye, comentadas, dos consultas de verificación de integridad y la consulta base de ventas netas por período para FASE 2.

```bash
mysqldump -u root -p solarfishdb > backup_pre_devoluciones.sql
mysql -u root -p solarfishdb < src/main/resources/db/migration/V2__devoluciones_venta.sql
```

### 10.9 Pruebas

**Resultado: 46 pruebas, 0 fallos, 0 errores** (antes 35; 14 nuevas en `DevolucionVentaServiceTest`, y las 3 de devolución que vivían en `VentaServiceTest` se trasladaron).

`DevolucionVentaServiceTest` cubre: devolución total, devolución parcial, devolución superior a lo vendido rechazada sin efectos, venta original intacta con el cálculo de venta neta, una devolución no aparece como venta nueva, movimiento `DEVOLUCION_VENTA` con stock anterior y nuevo correctos y referencia al documento, monto devuelto respetando descuentos de línea y cabecera, varias devoluciones parciales que suman exactamente el total, costo devuelto registrado, costo desconocido propagado como incompleto, numeración `D-{yyyy}-{seq}`, reembolso inmediato, reembolso posterior una sola vez, y rechazo de devolución sobre venta pendiente.

---

## 11. Ampliación: devoluciones de compra como documento económico

Misma filosofía que la sección 10, aplicada al proveedor. La compra completada conserva intacto su valor histórico y la devolución vive aparte:

```
compras netas = compras brutas - devoluciones de compra
```

Una compra de $1.000.000 con una devolución de $200.000 sigue registrada en $1.000.000; la compra neta de $800.000 se calcula, no se almacena.

### 11.1 Entidades creadas

| Entidad | Tabla | Contenido |
|---|---|---|
| `DevolucionCompra` | `devoluciones_compra` | `numero` (DC-{yyyy}-{seq}), compra, fecha, motivo, estado, método y fecha de reembolso, `montoTotalDevuelto`, `costoTotalDevuelto`, `costoCompletoConocido`, observaciones, auditoría y timestamps |
| `DetalleDevolucionCompra` | `detalle_devolucion_compra` | devolución, `detalleCompra`, producto, cantidad, `montoDevuelto`, `costoUnitario`, `costoConocido` |

**Sin duplicación:** el detalle no repite nombre ni categoría del producto; apunta a `DetalleCompra`, donde ya están congelados. Solo guarda cantidad devuelta, costo revertido, importe devuelto y auditoría.

### 11.2 Enums

| Enum | Estado | Decisión |
|---|---|---|
| `MotivoDevolucionCompra` | Nuevo | No se reutilizó `MotivoDevolucion`: devolver a un proveedor no tiene "insatisfacción del cliente", y sí tiene exceso de pedido y producto vencido. Siete causas: defectuoso, incorrecto, exceso de pedido, vencido, error en compra, garantía, otro |
| `EstadoDevolucionCompra` | Nuevo | Mismos dos valores que el de venta (`REGISTRADA`, `REEMBOLSADA`), pero separado para no acoplar los ciclos de venta y compra, que pueden divergir |
| `MetodoReembolso` | Reutilizado | Es un catálogo neutro de formas de compensación, sin semántica de venta. Clonarlo no aportaba nada |
| `ReferenciaMovimiento` | Modificado | Suma `DEVOLUCION_COMPRA` |
| `TipoSecuencia` | Modificado | Suma `DEVOLUCION_COMPRA` con prefijo `DC` (el prefijo `D` ya estaba tomado por la devolución de venta) |
| `EstadoCompra` | Modificado | Nuevo método `esCompraRealizada()`: `true` para `COMPLETADA`, `PARCIALMENTE_DEVUELTA` y `DEVUELTA`. Es el criterio de compra bruta para FASE 2 — una compra devuelta sigue siendo una compra; una `CANCELADA` nunca ocurrió y no genera devolución económica |

### 11.3 Cálculo del monto devuelto

```
montoDevuelto = detalle.subtotal × cantidadDevuelta × compra.total
                ─────────────────────────────────────────────────
                      detalle.cantidad × compra.subtotal
```

Se toma el subtotal de la línea de compra, se prorratea por la cantidad devuelta y se le aplica la proporción del descuento de cabecera, con un único redondeo al final. Hoy `DetalleCompra` no tiene descuento de línea; la fórmula parte del subtotal de la línea, así que si más adelante se añade, el cálculo sigue siendo correcto sin tocarlo.

Cuando la devolución cierra la compra por completo, el acumulado debe coincidir exactamente con el total de la compra. El residuo de redondeo se imputa a la última línea de la devolución que cierra el ciclo, la misma estrategia de la sección 10. La prueba de redondeo usa una compra de $299,99 devuelta en tres partes de una unidad, que suman $299,99 exactos.

**Importe recuperado ≠ costo revertido.** `montoTotalDevuelto` es el dinero que vuelve (con descuento prorrateado) y `costoTotalDevuelto` es el costo de inventario que sale (costo histórico × unidades). Con descuento de cabecera difieren, y esa diferencia es información real: una compra de 10 unidades a $500 con $500 de descuento devuelve $1.800 por 4 unidades, pero revierte $2.000 de costo.

### 11.4 Regla histórica del costo

Cada línea copia el `costoUnitario` congelado en `DetalleCompra`. `Producto.costoActual` no se consulta en ningún punto del flujo. La prueba correspondiente compra a $400, compra después a $700 (que pasa a ser el costo vigente) y verifica que la devolución de la primera compra revierte a $400.

### 11.5 Inventario

La devolución al proveedor es una **salida**. `DevolucionCompraService` llama a `InventarioService.registrarMovimiento` con tipo `DEVOLUCION_COMPRA`, referencia `DEVOLUCION_COMPRA` y `referenciaId` = id de la devolución. `CompraService` no toca stock en ningún caso.

Antes de FASE 1.2 el movimiento apuntaba a la compra (`ReferenciaMovimiento.COMPRA`), lo que impedía distinguir el ingreso de la devolución en el libro de inventario. Ahora apunta al documento de devolución.

### 11.6 Cambios sobre el modelo existente

- `CompraService.devolver(...)` **se eliminó**; la lógica vive en `DevolucionCompraService`. `CompraService` quedó enfocado en el ciclo de vida de la compra.
- `DevolucionRequestDTO` (genérico, sin motivo) **se eliminó**: era el último consumidor y quedó reemplazado por `DevolucionCompraRequestDTO`.
- `DetalleCompra.cantidadDevuelta` se conserva sin cambios: es el control de cuánto queda por devolver.
- **Sin cambios** en `Compra` (`subtotal`, `descuento`, `total` intactos), `DetalleCompra` (`costoUnitario`, `subtotal` intactos), `Producto`, `Venta`, `DevolucionVenta`, `MovimientoInventario` ni la política de costeo.
- **Sin cambios en Angular.** El frontend no consumía el endpoint de devolución de compra, así que el cambio de contrato no rompe nada.

### 11.7 Archivos

**Creados (10):** `MotivoDevolucionCompra`, `EstadoDevolucionCompra`, `DevolucionCompra`, `DetalleDevolucionCompra`, `DevolucionCompraRepository`, `DevolucionCompraSpecifications`, `DevolucionCompraRequestDTO`, `DevolucionCompraResponseDTO`, `DetalleDevolucionCompraResponseDTO`, `DevolucionCompraService`, `DevolucionCompraController`, `V3__devoluciones_compra.sql`, `DevolucionCompraServiceTest`.

**Modificados:** `ReferenciaMovimiento`, `TipoSecuencia`, `EstadoCompra`, `CompraService`, `CompraController`, `ComercialTestSupport`, `CompraServiceTest`.

**Eliminado:** `DevolucionRequestDTO`.

### 11.8 Endpoints

| Método | Ruta | Nota |
|---|---|---|
| POST | `/api/v1/compras/{id}/devoluciones` | **Cambió**: recibe motivo y método de reembolso opcional, y devuelve `DevolucionCompraResponseDTO` con `201` en lugar del DTO de compra |
| GET | `/api/v1/compras/{id}/devoluciones` | Nuevo: devoluciones de una compra |
| GET | `/api/v1/devoluciones-compra` | Nuevo: filtros `compraId`, `proveedorId`, `estado`, `motivo`, `desde`, `hasta` |
| GET | `/api/v1/devoluciones-compra/{id}` | Nuevo |
| POST | `/api/v1/devoluciones-compra/{id}/reembolsar` | Nuevo: registra la compensación posterior del proveedor |

Todos con `@PreAuthorize("hasRole('ADMIN')")` a nivel de controlador y JWT, igual que el resto del módulo comercial.

### 11.9 Transaccionalidad

`DevolucionCompraService.registrar` es `@Transactional`. En una sola transacción: valida la compra, valida el estado, valida cada cantidad contra lo pendiente, persiste la cabecera (necesaria antes de los movimientos para que estos puedan referenciarla), registra los movimientos de inventario, actualiza el stock, incrementa `cantidadDevuelta`, calcula los importes y actualiza el estado de la compra.

La prueba de rollback vacía el almacén con un ajuste manual y luego intenta la devolución: falla por stock insuficiente y verifica que no queda devolución, ni movimiento, ni cambio de stock, ni `cantidadDevuelta`, ni cambio de estado.

### 11.10 Migración

`src/main/resources/db/migration/V3__devoluciones_compra.sql`. Requiere V1 y V2 aplicados. No elimina datos ni toca ninguna fila de `compras` o `detalle_compra`.

Etapas: ampliación de los `CHECK` de `secuencias_documento` y `movimientos_inventario`, creación de `devoluciones_compra`, creación de `detalle_devolucion_compra`, e índices. Al final incluye, comentadas, tres consultas de verificación de integridad y la consulta base de compras netas por período para FASE 2.

```bash
mysqldump -u root -p solarfishdb > backup_pre_devoluciones_compra.sql
mysql -u root -p solarfishdb < src/main/resources/db/migration/V3__devoluciones_compra.sql
```

### 11.11 Pruebas

**`mvn compile`: BUILD SUCCESS. `mvn test`: 61 pruebas, 0 fallos, 0 errores** (antes 46; 16 nuevas en `DevolucionCompraServiceTest`, y la prueba de devolución que vivía en `CompraServiceTest` se trasladó).

Los 18 escenarios pedidos quedan cubiertos así:

| # | Escenario | Prueba |
|---|---|---|
| 1 | Devolución total | `devolucionTotal` |
| 2 | Devolución parcial | `devolucionParcial` |
| 3 | Segunda devolución parcial | `segundaDevolucionParcial` |
| 4 | Exceso de devolución | `excesoDeDevolucionSeRechaza` |
| 5 | Compra PENDIENTE | `compraPendienteNoSeDevuelve` |
| 6 | Compra CANCELADA | `compraCanceladaNoSeDevuelve` |
| 7 | Compra COMPLETADA | `devolucionTotal`, `devolucionParcial` |
| 8 | Stock disminuye | `devolucionParcial`, `movimientoDeInventarioTrazable` |
| 9 | MovimientoInventario correcto | `movimientoDeInventarioTrazable` |
| 10 | Referencia al documento | `movimientoDeInventarioTrazable` |
| 11 | Costo histórico correcto | `costoHistoricoNoSeReinterpreta` |
| 12 | Compra original intacta | `compraOriginalIntacta` |
| 13 | Compra neta correcta | `compraNetaSeCalculaAparte` |
| 14 | Rollback completo | `rollbackCompletoAnteError` |
| 15 | Numeración | `numeracionConsecutiva` |
| 16 | Descuentos | `descuentoDeCabeceraSeProrratea` |
| 17 | Redondeos | `redondeoSinDiferenciaAcumulada` |
| 18 | Múltiples devoluciones sin diferencia | `redondeoSinDiferenciaAcumulada`, `devolucionTotalMultilinea` |

Se suma `reembolsoPosterior`, que verifica el cambio a `REEMBOLSADA` y que no se pueda reembolsar dos veces.

### 11.12 Decisión técnica pendiente

**`Producto.costoActual` no se recalcula al devolver.** Con la política de último costo vigente, si devuelves al proveedor la compra que fijó el costo actual, el producto conserva ese costo aunque esas unidades ya no estén. No se tocó a propósito: recalcularlo exigiría reconstruir el costo desde el historial de compras, que es exactamente lo que hará la política de costo promedio ponderado cuando se active. Mientras tanto el historial queda completo para hacerlo, y ninguna cifra histórica depende de `costoActual`. Si prefieres que el último costo retroceda a la compra anterior al devolver, es un cambio acotado a `PoliticaCosteoInventario`.
