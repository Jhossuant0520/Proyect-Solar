# SOLVIX — FASE 3.8
## Módulo de Inventario

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** pantalla operativa `/inventario` sobre contratos ya existentes  
**Fecha de documentación:** 2026-09-12

---

## Objetivo

Que el administrador abra Inventario y responda, con datos reales:

- cuánto stock hay ahora
- cuánto dinero está invertido, según el costo actual que valora el backend
- qué productos están en el umbral de stock crítico
- qué movimientos ocurrieron, de dónde salieron y cómo cambió el stock
- qué costo histórico tiene cada movimiento, sin rellenar vacíos con el costo de hoy
- qué ajustes de costo existen

No es un segundo Dashboard. No se muestran rotación, sell-through ni velocidad de venta.

## Alcance

**Incluido**

- KPIs de `GET /api/v1/analytics/inventario` que responden al estado actual o a entradas del período
- Listado de productos con stock, costo actual, valor de línea según costo actual y estado visual
- Productos en el umbral `umbralStockCritico`
- Movimientos y ajustes de costo reales
- Ajuste de unidades solo por `POST /api/v1/inventario/ajustes`
- Ajuste de costo reutilizando el diálogo ya existente
- Búsqueda local y código de barras HID/texto vía `ProductoService.obtenerPorCodigoBarras`

**Fuera de alcance**

- Cambios de backend
- Editar stock a mano
- Conteo oficial de productos agotados
- KPI de salidas del período
- Paginación de movimientos (el endpoint no la ofrece)
- Políticas de costeo (no hay endpoint)
- Exportación, turnover, velocidad y KPI “sin stock” del Stitch
- Cámara, WebUSB o Bluetooth

## Rutas

| Ruta | Guards | Pantalla |
| --- | --- | --- |
| `/inventario` | `authGuard` (layout) + `adminGuard` | Centro operativo |
| `/inventario?productoId=` | mismos | Misma pantalla, movimientos y ajustes de ese producto |
| `/productos/:id` | mismos | Ficha ya existente; enlace a inventario |

La ruta `/inventario` ya existía como “próximamente”. Se reemplazó. No se duplicó en el menú: `admin-nav` ya apunta a `/inventario`.

## Componentes

- `features/panelAdmin/inventario/inventario` — pantalla principal
- `features/panelAdmin/inventario/inventario-ui` — etiquetas y presentación (sin reglas nuevas de costeo)
- `ajuste-unidades-dialog` — tipos `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `MERMA`
- Reutilizado: `ajuste-costo-dialog`, `solvix-metric-card`, `solvix-page-header`, `solvix-section-header`, `solvix-badge`, estados loading/empty/error
- Familia de botones: Tech-Minimal. No hay un primario de página. El primario vive en el diálogo de ajuste.

## Servicios

No se creó otro servicio de inventario.

- `InventarioService` se amplió: listar movimientos con filtros opcionales del endpoint, listar ajustes de costo con o sin `productoId`, `registrarAjuste`
- `AnalyticsService.inventario` se reutiliza. No se envía `umbralStockCritico`; el backend usa 5
- `ProductoService.listar` y `obtenerPorCodigoBarras`
- `CategoriaProductoService.listar`

## Endpoints

| Método | Endpoint | Propósito | Quién lo consume |
| --- | --- | --- | --- |
| GET | `/api/v1/analytics/inventario?desde&hasta` | Valor actual, stock total, stock crítico, umbral, unidades ingresadas, estado de costo | `InventarioComponent` vía `AnalyticsService` |
| GET | `/api/v1/productos` | Catálogo con stock y costo actual | `InventarioComponent` vía `ProductoService` |
| GET | `/api/v1/productos/codigo-barras/{codigo}` | Localizar por lector HID o texto | `resolverProductoPorCodigoBarras` |
| GET | `/api/v1/categorias-producto` | Filtro visual de categoría | `InventarioComponent` |
| GET | `/api/v1/inventario/movimientos?productoId&tipo&desde&hasta` | Movimientos reales | `InventarioService.listarMovimientos` |
| POST | `/api/v1/inventario/ajustes` | Ajuste de unidades (no cambia el costo) | `AjusteUnidadesDialog` |
| POST | `/api/v1/inventario/ajustes/costo` | Ajuste de costo (no mueve stock) | Diálogo ya existente |
| GET | `/api/v1/inventario/ajustes/costo?productoId` | Historial de ajustes de costo | `InventarioService.listarAjustesCosto` |

No se usa `GET /api/v1/inventario/productos/{id}/stock`: el producto ya trae `stockActual`.

## Flujo de inventario

La pantalla pregunta “¿cómo está mi inventario ahora?”.

1. KPIs del analytics de inventario.
2. Productos activos cuyo `stockActual` es menor o igual a `umbralStockCritico`.
3. Movimientos recientes, con trazabilidad de stock.
4. Consulta por producto, tipo, nombre, ID, código, marca o categoría.
5. Ajustes de costo aparte de los movimientos de unidades.

Compra, venta y devolución no se repiten aquí. Esas operaciones ya mueven inventario en el backend. Esta pantalla solo muestra el movimiento resultante.

## Movimientos

Cada fila usa `MovimientoInventarioResponseDTO`.

Se muestran, porque el DTO los trae: fecha, producto, tipo, cantidad, dirección, stock anterior, stock nuevo, `costoProductoResultante`, `referenciaTipo`, `referenciaId`, usuario y observaciones.

No hay campo `motivo` en el movimiento. El origen estructurado es `referenciaTipo`, no el texto de observaciones.

Tipos reales: `COMPRA`, `VENTA`, `DEVOLUCION_VENTA`, `DEVOLUCION_COMPRA`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `MERMA`, `CARGA_INICIAL`.

El endpoint no ordena ni pagina. La UI ordena por fecha descendente para presentar y, sin filtro, muestra 10. Con `productoId` o `tipo` muestra lo que devolvió esa consulta.

## Trazabilidad

Cada movimiento se lee así:

producto → tipo y origen → stock anterior → cantidad con el signo de `direccion` → stock nuevo.

El signo sale de `ENTRADA` / `SALIDA`. No se infiere del texto libre.

Enlaces de documento:

- `COMPRA` + `referenciaId` → `/compras/:id`
- `VENTA` + `referenciaId` → `/ventas/:id`
- devoluciones, ajuste manual y carga inicial no se enlazan: el id de devolución no es el id de la ruta de detalle

## Valoración actual

El número oficial es `InventarioKpiDTO.valorInventario`.

Texto visible: **Dinero invertido en inventario**.  
Descripción: “Valor de los productos que tienes en stock según su costo actual.”  
Tooltip: “Representa cuánto te ha costado el inventario que tienes actualmente. No corresponde al valor total de venta.”

Formato compacto colombiano (`$1,26 M` cuando aplica).

Si `estadoValorInventario` es `COSTO_INCOMPLETO`, se respeta ese estado y la nota existente. No se inventa un estimado. El backend puede entregar un valor parcial y el estado incompleto a la vez: se muestran ambos.

La columna **Valor según costo actual** es la presentación de `stockActual × costoActual` solo cuando `costoConocido` es verdadero. No sustituye a `valorInventario`. Si el costo no se conoce, la celda dice “Costo desconocido”, nunca $0.

## Costos históricos

En un movimiento o ajuste se usa `costoProductoResultante`.

Si es `null` (incluye datos anteriores a V4), el texto es **Costo histórico no disponible**. No se usa `Producto.costoActual` para rellenarlo. No se trata como cero.

Si `estadoTurnover` es `COSTO_INCOMPLETO` o `productosSinValuacionHistorica` es mayor que cero, se muestra: “No hay información histórica suficiente para valorar este período.” No se calcula rotación en esta pantalla.

## Ajustes de costo

Consulta de fecha, producto, costo anterior, costo nuevo, costo resultante, stock al ajustar, motivo, observaciones y usuario.

El diálogo existente registra `POST /ajustes/costo`. Un ajuste de costo no mueve unidades.

El ajuste de unidades es otro flujo: `POST /ajustes`. El backend guarda `costoUnitario` nulo y referencia `AJUSTE_MANUAL`. No hay botón “Editar stock”.

## Estados

| Situación | Qué se muestra | Fuente |
| --- | --- | --- |
| Stock 0 | Agotado | `stockActual` del producto |
| Stock > 0 y ≤ umbral | Stock crítico | `umbralStockCritico` del KPI |
| Stock > umbral | Normal | mismo umbral |
| Sin KPI | Sin clasificar | no se inventa umbral |
| `costoConocido !== true` | Costo desconocido | bandera del producto |

La lista de atención usa el mismo predicado que el conteo oficial: producto activo y `stockActual <= umbral`. Ese conteo incluye ceros. Por eso un agotado también aparece en “stock crítico”. No hay otro cálculo.

No hay KPI de productos agotados. El backend no entrega ese conteo.

Cada bloque maneja carga, vacío, error y datos. Mensajes: “No hay movimientos registrados para este criterio.”, “No hay ajustes de costo registrados.”, “No hay productos con stock crítico.”

## Integraciones con Productos

`/productos/:id` ya consultaba movimientos y ajustes. Se mantiene esa consulta. Se añadió el costo histórico del movimiento y el enlace **Inventario**, que abre `/inventario?productoId=`.

Desde el listado de inventario se abre la ficha, el ajuste de costo existente y el ajuste de unidades.

## Integraciones con Compras

Una compra completada genera un movimiento `COMPRA` / `ENTRADA` en el backend. Inventario lo lista. No se registra otra entrada.

## Integraciones con Ventas

Una venta completada genera `VENTA` / `SALIDA`. Inventario lo lista. No se registra otra salida.

## Integraciones con Devoluciones

`DEVOLUCION_VENTA` es entrada. `DEVOLUCION_COMPRA` es salida. La UI muestra el tipo, la dirección y la referencia que envió el backend. No deduce el documento desde observaciones.

## Código de barras

Se reutiliza `Producto.codigoBarras` y `ProductoService.obtenerPorCodigoBarras` a través de `resolverProductoPorCodigoBarras`. El Enter no envía un formulario. El lector HID sigue siendo texto. No hay cámara.

## UX/UI

Identidad solar / cyber-minimalista, tokens existentes, glow moderado.

Jerarquía: indicadores → stock crítico → productos → movimientos → ajustes de costo.

Un solo scroll vertical, el del `AdminLayout`. Las tablas tienen scroll horizontal solo si no caben. No hay `overflow: auto` anidado en vertical.

Normal es positivo. Crítico es advertencia. Agotado es error. Costo desconocido es neutro.

## Seguridad

La ruta usa `authGuard` y `adminGuard`. Los endpoints de inventario exigen rol `ADMIN` en el backend. Angular no autoriza el cambio de stock: solo llama operaciones ya protegidas.

## Responsabilidades Frontend/Backend

Frontend: presentación, navegación, filtros sobre datos ya cargados, envío de query params que el endpoint ya acepta, validación básica de formularios.

Backend: stock, costeo, movimientos, valoración, umbral, estados de métrica y autorización.

## Stitch

Referencia: `REFERENCE_code/SeccionInventario.crusorrules`.

Se tomó la jerarquía de bodega (estado, atención, consulta, movimientos). No se copió HTML.

No se implementó lo que el Stitch muestra y el backend no entrega como operación de esta pantalla: exportar, turnover, velocidad, KPI de sin stock.

“Nuevo ajuste” del Stitch se tradujo a los dos ajustes reales (unidades y costo), no a una edición libre de stock.

## Validación

- Tests de presentación: `inventario-ui.spec.ts` (8 casos). Pasaron.
- `npm run build`: correcto. Aviso de presupuesto del bundle inicial (1,52 MB; el límite es 1,50 MB). No es un error de esta pantalla.
- `npx ng test --watch=false --browsers=ChromeHeadless`: 65 ejecutados, 50 correctos, 15 fallos previos (Login, Home, Register, HSP, Demanda Recibo y diálogos). Ningún fallo nuevo de inventario. No se editaron esos tests.

## Limitaciones reales

- No existe conteo ni endpoint de productos agotados. Agotado es visual cuando el stock del producto es 0.
- El KPI de stock crítico incluye esos ceros. No se separan en el número oficial.
- No hay total de salidas del período. `unidadesVendidas` no es “salidas”. `unidadesDevueltasProveedor` solo cubre devolución de compra.
- `unidadesIngresadas` excluye devoluciones de venta, como define el backend.
- Movimientos y ajustes no vienen paginados ni ordenados.
- `GET /movimientos` sin filtro descarga el historial; la pantalla muestra 10 recientes.
- El valor de una línea no es el KPI de bodega.
- No hay mínimo de stock por producto.
- Una devolución no se abre en su detalle: falta el id del documento padre en el movimiento.
- La política de costeo no se consulta por HTTP.

## Pendientes

- Conteo o listado oficial de productos agotados, si se quiere un número distinto de “stock crítico incluyendo ceros”.
- Total de salidas del período, si debe existir como contrato.
- Paginación y orden en `GET /movimientos` y `GET /ajustes/costo`.
- Ruta de devolución que pueda abrirse con `referenciaId` sin el id padre.
- No proponer estos cambios como trabajo de frontend paralelo.
