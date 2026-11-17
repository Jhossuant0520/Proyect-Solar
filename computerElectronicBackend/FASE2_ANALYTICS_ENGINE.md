# SOLVIX — FASE 2: Analytics Engine (backend)

Motor de métricas comerciales sobre las entidades de FASE 1 y 1.2. Solo backend: no se tocó
Angular, no hay componentes ni gráficos. Sin IA generativa: cada número sale de una consulta
agregada y una fórmula documentada.

---

## 1. Arquitectura

```
Controller (resuelve período, no calcula)
   ↓
Service  (fórmula + estado del dato)
   ↓
Repository (agregación en base de datos)
   ↓
Entidades existentes (Venta, Compra, Devoluciones, Producto, MovimientoInventario)
```

No se creó ninguna tabla nueva. El motor lee lo que ya escriben los módulos comerciales.

### Principio de diseño: el estado del dato viaja con el número

Cada métrica que puede no existir se acompaña de un `EstadoMetrica`. Un `0%` sin contexto es
la forma más rápida de tomar una decisión equivocada, así que el motor distingue:

| Estado | Significado |
|---|---|
| `OK` | Hay datos y el valor es real y completo |
| `VALOR_CERO` | Hubo operaciones, el resultado es efectivamente cero |
| `SIN_DATOS` | No hubo operaciones: la métrica no se puede calcular |
| `COSTO_INCOMPLETO` | Se calculó, pero alguna línea no tenía costo conocido |
| `SIN_BASE_DE_COMPARACION` | El período anterior está en cero: no hay variación posible |
| `SIN_VENTAS_RECIENTES` | Velocidad de venta cero: no se proyectan días de inventario |
| `SIN_HISTORIAL_SUFICIENTE` | Producto demasiado nuevo para juzgar su desempeño |

Cuando una métrica no se puede calcular, su valor viaja en `null` y el estado explica por qué.
Nunca se devuelve cero como sustituto de "no sé".

---

## 2. Archivos creados

### DTOs y enums — `dtos/BusinessDtos/AnalyticsDtos/`

| Archivo | Contenido |
|---|---|
| `Agrupacion.java` | DIA, SEMANA, MES, ANIO |
| `EstadoMetrica.java` | Calidad del dato (tabla anterior) |
| `CriterioRanking.java` | UNIDADES, INGRESOS, GANANCIA, MARGEN |
| `PeriodoDTO.java` | desde, hasta, dias, agrupacion |
| `VariacionDTO.java` | actual, anterior, variacionPorcentual, estado |
| `DashboardResumenDTO.java` | Resumen ejecutivo + comparativa |
| `ComparativaResumenDTO.java` | Variaciones frente al período anterior |
| `VentasSerieDTO.java` | Punto de serie: fecha, ventas, devoluciones, ventasNetas, ganancia, pedidos |
| `SerieTemporalDTO.java` | Serie completa + período + estado |
| `ProductoRankingDTO.java` | Desempeño neto por producto |
| `ProductoBajoRendimientoDTO.java` | Bajo desempeño con contexto (stock, última venta, antigüedad) |
| `CategoriaAnalyticsDTO.java` | Ventas, ganancia, margen y participación por categoría |
| `InventarioKpiDTO.java` | Rotación, sell-through, velocidad, días de inventario |
| `ABCProductoDTO.java` | Participación individual, acumulada y clase A/B/C |
| `AnalisisABCDTO.java` | Análisis ABC + criterio + límites |
| `CompraAnalyticsDTO.java` | Compras brutas, devoluciones, netas, proveedores, productos |
| `ProveedorGastoDTO.java` | Gasto por proveedor |
| `ProductoCompradoDTO.java` | Producto comprado con su devolución |

### Repositorios — `repository/BusinessRepo/AnalyticsRepo/`

| Archivo | Consultas |
|---|---|
| `VentaAnalyticsRepository.java` | resumen, costoDeVentas, serieDiaria, costoDiario, ventasPorProducto, ventasPorCategoria, ultimaVentaPorProducto |
| `DevolucionVentaAnalyticsRepository.java` | resumen, unidadesDevueltas, serieDiaria, devolucionesPorProducto, devolucionesPorCategoria |
| `CompraAnalyticsRepository.java` | resumen, serieDiaria, comprasPorProveedor, comprasPorProducto |
| `DevolucionCompraAnalyticsRepository.java` | resumen, serieDiaria, devolucionesPorProveedor, devolucionesPorProducto |
| `InventarioAnalyticsRepository.java` | stockGlobal, stockPorProducto, contarStockCritico, movimientoNetoEntre, movimientoNetoDespuesDe |

Todos extienden `Repository<T, Long>` (no `JpaRepository`): son de solo lectura y no exponen
CRUD. Las proyecciones son interfaces anidadas mapeadas por alias.

### Servicios — `service/BusinessService/AnalyticsService/`

| Archivo | Responsabilidad |
|---|---|
| `PeriodoAnalitico.java` | Ventana de tiempo, período anterior equivalente, buckets |
| `CalculoAnalytics.java` | Redondeo, divisiones seguras, porcentajes, variaciones |
| `TotalesVentas.java` | Magnitudes base de venta de un período |
| `VentasAnalyticsService.java` | KPIs 1, 3, 4, 5, 6, 7 |
| `DashboardAnalyticsService.java` | Resumen + KPI 2 (comparación) |
| `ProductoAnalyticsService.java` | KPIs 8, 9, 16, 17 |
| `CategoriaAnalyticsService.java` | KPIs 10, 11 |
| `InventarioAnalyticsService.java` | KPIs 12, 13, 14, 15 |
| `ComprasAnalyticsService.java` | KPI 18 |

### Controllers — `controller/BusinessController/AnalyticsContro/`

| Archivo | Rutas |
|---|---|
| `DashboardController.java` | `/api/v1/dashboard` |
| `AnalyticsController.java` | `/api/v1/analytics` |

### Pruebas — `test/.../service/BusinessService/AnalyticsService/`

| Archivo | Pruebas |
|---|---|
| `AnalyticsTestSupport.java` | Base: crea operaciones reales vía servicios de negocio |
| `DashboardAnalyticsServiceTest.java` | 13 |
| `ProductoCategoriaAnalyticsServiceTest.java` | 10 |
| `InventarioComprasAnalyticsServiceTest.java` | 17 |

### Costo histórico del inventario (correcciones posteriores a FASE 2)

Necesarios para que la rotación pueda valorar el inventario con costos históricos. Ver la
sección 5.1.

| Archivo | Rol |
|---|---|
| `AjusteCostoProducto.java` | Entidad: historial de correcciones manuales de costo |
| `MotivoAjusteCosto.java` | Enum del motivo, agrupable en analytics |
| `AjusteCostoProductoRepository.java` | Acceso al historial |
| `AjusteCostoRequestDTO.java` / `AjusteCostoResponseDTO.java` | Contrato del endpoint de ajuste |
| `V4__costo_historico_inventario.sql` | Migración: columna nueva + tabla de ajustes |
| `AjusteCostoInventarioTest.java` | 8 pruebas de gobierno del costo |

## 3. Archivos modificados

| Archivo | Cambio |
|---|---|
| `application.properties` | Nueva propiedad `solvix.analytics.zona-horaria` |
| `ComercialTestSupport.java` | Pasó a `public`; limpia el historial de ajustes entre pruebas |
| `MovimientoInventario.java` | Campo `costoProductoResultante` |
| `MovimientoInventarioResponseDTO.java` | Expone `costoProductoResultante` |
| `InventarioService.java` | Escribe el costo resultante; registra y lista ajustes de costo |
| `InventarioController.java` | Endpoints de ajuste de costo |
| `CompraService.java` | Aplica la política de costeo **antes** de registrar el movimiento |
| `ProductoService.java` | El PUT ya no puede modificar `costoActual` |
| `ProductoStockReglaTest.java` | Prueba de rechazo del cambio de costo por PUT |

Las entidades y endpoints comerciales de FASE 1 / 1.2 conservan su contrato. Los dos cambios de
comportamiento —el orden en `CompraService` y el bloqueo del costo en el PUT— son exactamente los
que la valuación histórica exigía, y están justificados en la sección 5.1.

---

## 4. Fórmulas de cada KPI

### KPI 1 — Ventas por período

```
ventasBrutas = Σ venta.total            (estado ∈ EstadoVenta.esVentaRealizada())
devoluciones = Σ devolucionVenta.montoTotalDevuelto
ventasNetas  = ventasBrutas - devoluciones
```

Las tres magnitudes se mantienen separadas en la respuesta. Día, semana, mes, año y rango
personalizado son el mismo cálculo con distinta ventana.

### KPI 2 — Comparación entre períodos

```
variación = ((actual - anterior) / anterior) × 100
```

El período anterior es la misma cantidad de días inmediatamente antes, desplazado por días
naturales. Si `anterior = 0` no se divide: `variacionPorcentual = null` con estado
`SIN_BASE_DE_COMPARACION` (o `SIN_DATOS` si ambos son cero).

### KPI 3 — Ganancia bruta

```
costoVentas   = Σ (detalleVenta.costoUnitario × cantidad)
              - Σ (detalleDevolucionVenta.costoUnitario × cantidad)
gananciaBruta = ventasNetas - costoVentas
```

El costo sale del valor **congelado en la línea de venta**, nunca de `Producto.costoActual`.
La devolución revierte el costo con el mismo criterio histórico.

### KPI 4 — Margen bruto

```
margenBruto = gananciaBruta / ventasNetas × 100
```

Sin ventas netas no se divide: `null` + `SIN_DATOS`.

### KPI 5 — Pedidos

```
pedidos = COUNT(venta) donde estado ∈ esVentaRealizada()
```

No cuenta PENDIENTE ni CANCELADA. Una venta devuelta sigue siendo una operación histórica;
una devolución no es un pedido nuevo.

### KPI 6 — Ticket promedio (TICKET PROMEDIO NETO)

```
ticketPromedio = ventasNetas / pedidosValidos
```

**Definición oficial: ticket promedio neto.** Numerador en ventas **netas** (ya descontadas las
devoluciones), denominador en pedidos **válidos** (operaciones realizadas, sin descontar las que
después se devolvieron). Responde "cuánto dinero terminó dejando en promedio cada pedido".

Criterio constante: no se cuentan PENDIENTE ni CANCELADA, y una devolución nunca crea un pedido
nuevo. Sin pedidos: `null` + `SIN_DATOS`.

En la interfaz se muestra simplemente como **"Ticket promedio"**; el calificativo "neto" es la
definición interna, no una etiqueta para el usuario. No existe un segundo KPI de ticket bruto.

**Ejemplo.** Dos pedidos por 1.000 y 500, con una devolución posterior de 300 sobre el primero:

```
ventasBrutas = 1.500     devoluciones = 300     ventasNetas = 1.200
pedidos = 2              ticketPromedio = 1.200 / 2 = 600
```

El pedido devuelto sigue contando en el denominador porque la operación existió.

### KPI 7 — Ventas a lo largo del tiempo

Serie con `fecha`, `etiqueta`, `ventas`, `devoluciones`, `ventasNetas`, `ganancia`, `pedidos`.
Agrupaciones DIA, SEMANA (identificada por su lunes, ISO), MES y ANIO. Los buckets sin
operaciones aparecen en cero, no se omiten.

### KPI 8 — Productos más vendidos

Ranking por UNIDADES (por defecto), INGRESOS o GANANCIA. Todas las magnitudes son netas de
devolución. Filtro opcional por `categoriaCodigo`.

### KPI 9 — Productos menos vendidos

No se ordena solo por unidades. Cada fila lleva unidades, ingresos, stock, velocidad de venta,
última venta, días sin venta y días en catálogo. Los productos con menos de **30 días** en
catálogo se marcan `SIN_HISTORIAL_SUFICIENTE` y se envían al final: un producto nuevo no vende
poco, todavía no tuvo tiempo de vender.

### KPI 10 — Ventas por categoría

```
participación = ventasCategoría / ventasTotales × 100
```

Se agrupa por el `categoriaCodigo` **congelado en la línea de venta**, no por la categoría
actual del producto. El nombre visible sí se resuelve contra la tabla de categorías, así que
renombrar una categoría no rompe reportes históricos.

### KPI 11 — Ganancia por categoría

Ventas, costo, ganancia y margen con las mismas fórmulas del KPI 3 y 4, agrupados por categoría.

### KPI 12 — Inventory turnover

Responde: **¿cuántas veces el costo del inventario disponible se convierte en costo de ventas
durante el período?**

```
inventarioPromedio = (valorInventarioInicial + valorInventarioFinal) / 2
inventoryTurnover  = costoVentas / inventarioPromedio
```

**Cantidades: exactas.** El stock de un momento pasado se reconstruye desde el vigente:

```
stockFinal   = stockActual - movimientoNeto(posterior a "hasta")
stockInicial = stockFinal  - movimientoNeto(dentro del período)
```

Es exacto porque toda variación de stock pasa por `MovimientoInventario`.

**Valuación: histórica.** Cada extremo se valora con el costo que regía en esa fecha,
reconstruido desde `MovimientoInventario.costoProductoResultante` y `AjusteCostoProducto`. Nunca
con `Producto.costoActual`. La metodología completa está en la **sección 5.1**.

**Estados.** Con inventario promedio cero: `null` + `SIN_DATOS`. Con productos cuyo costo
histórico no se conoce en alguno de los extremos: `null` + `COSTO_INCOMPLETO`.

**Ejemplo.** Producto con 100 unidades a costo 600 al abrir el período. Se venden 40 y después
se corrige el costo a 900:

```
costoVentas            = 40 × 600 = 24.000     (costo congelado en la línea, no el corregido)
valorInventarioInicial = 100 × 600 = 60.000    (costo vigente al abrir, no el de hoy)
valorInventarioFinal   =  60 × 900 = 54.000    (costo vigente al cerrar)
inventarioPromedio     = (60.000 + 54.000) / 2 = 57.000
inventoryTurnover      = 24.000 / 57.000 = 0,4211
```

Con valuación al costo de hoy en ambos extremos, el inicial habría sido 90.000 y la rotación
0,3333: un 21% de diferencia sobre el mismo negocio.

### KPI 13 — Sell-through

Responde: **¿qué porcentaje del inventario que estuvo disponible para vender durante el período
se vendió efectivamente?**

```
inventarioDisponible  = stockInicial + unidadesIngresadas - unidadesDevueltasProveedor
unidadesVendidasNetas = unidadesVendidas - unidadesDevueltasPorClientes
sellThrough           = unidadesVendidasNetas / inventarioDisponible × 100
```

Fórmula oficial única, idéntica en backend, DTO y esta documentación.

**Fuente de datos:** `MovimientoInventario`, imputado por la fecha del movimiento.

- `unidadesIngresadas`: movimientos de ENTRADA del período **excepto** `DEVOLUCION_VENTA`; es
  decir compras, carga inicial y ajustes de entrada.
- `unidadesDevueltasProveedor`: movimientos `DEVOLUCION_COMPRA` del período.

**Tratamiento de devoluciones.** Las devoluciones de cliente **no** suman inventario disponible:
esas unidades ya estaban contadas en el inventario del que salieron, y volver a sumarlas las
contaría dos veces. Su efecto es restar del numerador, nunca sumar como venta nueva. Las
devoluciones al proveedor sí restan del denominador: salieron sin haberse vendido.

**Decisión explícita:** las salidas por merma y ajuste manual de salida **no** se restan del
inventario disponible, porque esas unidades sí estuvieron disponibles para vender. Si el negocio
prefiere excluirlas, es un cambio de una línea en la consulta.

**Ejemplo oficial.**

```
Stock inicial           = 100
Compra                  =  50
Devolución a proveedor  =  10
Ventas                  =  60
Devoluciones de cliente =   5

inventarioDisponible  = 100 + 50 - 10 = 140
unidadesVendidasNetas =  60 - 5       =  55
sellThrough           =  55 / 140 × 100 = 39,29 %
```

**Estados.** Sin inventario disponible (`<= 0`) no se divide: `null` + `SIN_DATOS`. Con
inventario disponible y sin ventas el resultado es real: `0.00` + `VALOR_CERO`.

**Compatibilidad con la definición anterior.** La fórmula previa era
`unidadesVendidas / (unidadesVendidas + stockFinal) × 100`. Cuando en el período no hay compras
ni ajustes, ambas coinciden exactamente, porque en ese caso
`inventarioDisponible = stockFinal + unidadesVendidasNetas`. Divergen solo cuando entra o sale
inventario por causas distintas de la venta, que es justo el caso que la definición nueva corrige:
la anterior ignoraba la mercancía comprada durante el período y sobreestimaba el porcentaje.

### KPI 14 — Velocidad de venta

```
velocidadVenta = unidadesVendidas / díasDelPeríodo
```

Unidades netas de devolución. El período nunca tiene menos de un día.

### KPI 15 — Días de inventario

```
diasInventario = stockActual / velocidadVenta
```

Con velocidad cero no se divide: `null` + `SIN_VENTAS_RECIENTES`.

### KPI 16 — Productos más rentables

Ranking por ganancia bruta (contribución monetaria), con `criterio=MARGEN` para ordenar por
rentabilidad relativa. Son preguntas distintas: un producto puede tener margen alto y aportar
poco dinero.

### KPI 17 — Análisis ABC

1. Ordenar por ingresos descendentes
2. Participación individual = magnitud / total × 100
3. Participación acumulada
4. Clasificar: **A** hasta 80%, **B** por encima de 80% y hasta 95%, **C** el resto

El criterio se cambia a GANANCIA con el parámetro `criterio`, sin tocar el modelo.

### KPI 18 — Compras

```
comprasNetas = comprasBrutas - devolucionesDeCompra
```

Criterio de compra realizada: `EstadoCompra.esCompraRealizada()`. Incluye gasto por proveedor
con participación, productos comprados con su devolución, y serie temporal. La devolución al
proveedor reduce las compras netas sin tocar el histórico de la compra original.

---

## 5. Decisiones técnicas

### Prorrateo del descuento de cabecera

El subtotal de una línea no incluye el descuento aplicado al total del documento. Para que la
suma de los ingresos por producto coincida **exactamente** con las ventas brutas, cada línea
lleva su parte proporcional:

```sql
ingresoLinea = detalle.subtotal × venta.total / venta.subtotal
```

Misma técnica en compras. Es el mismo prorrateo que ya usaban las devoluciones en FASE 1.1,
así que producto, categoría y cabecera cierran entre sí sin residuo.

### Costo desconocido: nunca un margen falso

`costoUnitario` es NULL cuando el costo se desconoce y SQL lo excluye de la suma; jamás se
sustituye por cero. En paralelo se cuentan las líneas afectadas:

- **Resumen y categorías:** el valor se entrega con estado `COSTO_INCOMPLETO` y el campo
  `lineasSinCosto` indica cuánto falta.
- **Ranking de productos:** si el producto tiene alguna línea sin costo, su `ganancia` y su
  `margen` viajan en `null`. Sumar solo el costo conocido produciría un margen cercano al 100%,
  que es justo la lectura que hay que evitar. Al ordenar por ganancia o margen, esos productos
  quedan al final.

### Devoluciones imputadas por su propia fecha

Una devolución de marzo sobre una venta de enero reduce las ventas netas de **marzo**: es cuando
el dinero volvió. La venta de enero conserva intacto su importe histórico.

### 5.1 Metodología de valuación del inventario

**Regla: numerador y denominador de la rotación están ambos en costo histórico.** No se mezcla
costo histórico con costo de reposición actual.

| Magnitud | Criterio de costo | Fuente |
|---|---|---|
| Costo de ventas (numerador) | Costo histórico congelado | `DetalleVenta` / `DetalleDevolucionVenta` |
| Cantidades inicial y final | Reconstruidas exactas | `MovimientoInventario` |
| Valor del inventario inicial y final | Costo **vigente en esa fecha** | Línea de tiempo del costo |
| `valorInventario` (aparte, no entra en la rotación) | Costo de reposición **de hoy** | `Producto.costoActual` |

La última fila es la única que usa `costoActual`, y responde otra pregunta: cuánto vale la bodega
hoy si hubiera que reponerla. No participa en ningún cálculo histórico.

#### La línea de tiempo del costo

El costo vigente de un producto en una fecha se reconstruye desde dos fuentes, tomando el punto
más reciente anterior a esa fecha:

1. **`MovimientoInventario.costoProductoResultante`** — costo que quedó vigente en el producto
   después de cada operación que movió unidades. Lo escribe `InventarioService.registrarMovimiento`,
   el único punto por el que pasa todo el stock.
2. **`AjusteCostoProducto`** — correcciones manuales de costo, que no mueven unidades y por eso
   no aparecen en el libro de inventario.

Ante el mismo instante prevalece el ajuste manual: es la intención más explícita sobre el costo.

#### Por qué `costoUnitario` y `costoProductoResultante` son campos distintos

- `costoUnitario` = costo económico **de esa operación**. Es NULL en ajustes y mermas, donde no
  se conoce, y nunca se inventa.
- `costoProductoResultante` = costo **del producto** tras la operación y la política de costeo.

Hoy coinciden en las compras porque la política es `ULTIMO_COSTO`. Bajo promedio ponderado dejarían
de coincidir: el primero seguiría siendo el costo de la factura y el segundo pasaría a ser el
promedio recalculado. Guardar solo uno haría que la valuación fallara en silencio al cambiar de
política. En una merma el primero queda NULL y el segundo conserva el costo vigente, que sí se conoce.

Como consecuencia, `CompraService.completar` aplica la política **antes** de registrar el
movimiento, para que el libro guarde el costo resultante y no el anterior.

#### Quién puede cambiar el costo

`Producto.costoActual` dejó de ser un campo editable del catálogo. La cadena es:

```
Compra completada  →  PoliticaCosteoInventario  →  costoActual  →  movimiento con costo resultante
Ajuste de costo    →  InventarioService         →  costoActual  →  fila en ajustes_costo_producto
```

El PUT de producto rechaza cualquier intento de modificarlo y remite al endpoint de ajuste.
Reenviar el costo vigente sin cambios sí se acepta, para que el cliente pueda mandar el objeto
completo sin romperse.

#### Períodos históricamente incompletos

Los movimientos anteriores a la migración V4 no tienen `costoProductoResultante` y **no se
rellenan**: reconstruirlos con el costo de hoy sería inventar historia.

Si algún producto **con existencias** no tiene costo conocido en alguno de los dos extremos del
período, la valuación no se completa y la respuesta entrega:

```
valorInventarioInicial = null
valorInventarioFinal   = null
inventarioPromedio     = null
inventoryTurnover      = null
estadoTurnover         = COSTO_INCOMPLETO
productosSinValuacionHistorica = cuántos productos lo impiden
```

El costo de ventas del mismo período sigue siendo exacto: sale de las líneas de venta, no de la
valuación. Un producto sin existencias en esa fecha no necesita costo y no bloquea nada.

**Por qué no hay un estado `VALUACION_HISTORICA_NO_DISPONIBLE`.** Se evaluó y no se agregó.
`COSTO_INCOMPLETO` ya significa "esta métrica no es confiable porque falta costo conocido".
La distinción entre "líneas de venta sin costo" y "no hay foto histórica del inventario" vive
en el DTO (`lineasSinCosto` vs `productosSinValuacionHistorica`) y en que el margen viaja con
número subestimado mientras la rotación viaja en `null`. Un enum extra obligaría al cliente a
tratar dos estados para la misma idea. Si más adelante hace falta un mensaje distinto en
interfaz, se puede agregar sin cambiar la fórmula.

**Fecha desde la cual la rotación es históricamente precisa:** la de ejecución de
`V4__costo_historico_inventario.sql`. Para consultarla en una instalación concreta:

```sql
SELECT MIN(fecha) AS inicio_valuacion_historica
FROM movimientos_inventario
WHERE costo_producto_resultante IS NOT NULL;
```

Los productos que ya existen y no volverán a tener movimiento pueden incorporarse a la línea de
tiempo registrando un ajuste de costo con motivo `CARGA_DE_COSTO_INICIAL`. Es una decisión del
negocio; la migración no lo hace por su cuenta.

#### Limitación restante

La valuación usa el costo vigente del producto, que bajo `ULTIMO_COSTO` significa que **todas**
las unidades en bodega se valoran al costo de la última compra, incluidas las que se compraron
más barato antes. Eso no es un defecto de la reconstrucción: es lo que significa la política de
costeo elegida, y la reconstrucción la reproduce fielmente en cada fecha. Un valor por capas
(FIFO) o un promedio ponderado real requerirían cambiar `PoliticaCosteoInventario`, cuya
abstracción sigue intacta para permitirlo sin tocar el historial.

### Agrupación temporal portable

Las series se agregan por año/mes/día con las funciones estándar `YEAR()`, `MONTH()` y `DAY()`
de JPQL, en lugar de formatear fechas con sintaxis propia de cada motor (`DATE_FORMAT` en MySQL,
`FORMATDATETIME` en H2). La base devuelve como mucho 366 filas por año y el servicio reagrupa a
semana, mes o año. Funciona igual en MySQL de producción y en H2 de pruebas.

### Zona horaria

Las fechas de negocio son `LocalDateTime` sin zona, escritas con el reloj del servidor. Agrupar
por año/mes/día usa ese mismo calendario local, así que la agrupación es consistente con lo
guardado. La propiedad `solvix.analytics.zona-horaria` (por defecto `America/Bogota`) solo
resuelve "hoy" cuando el cliente no envía fechas; es el único punto a ajustar si el servidor
quedara en otro huso.

### Precisión monetaria

`BigDecimal` en todo el motor, nunca `double`. Escalas: dinero 2, porcentajes 2, ratios 4
(rotación y velocidad), días de inventario 1. Redondeo `HALF_UP`, el mismo criterio que ventas,
compras y devoluciones.

### Dónde se agrega y dónde se filtra

Fechas, agrupaciones, sumas y conteos se resuelven en base de datos: analytics nunca carga las
operaciones en memoria. Los filtros por categoría, producto o proveedor se aplican sobre los
agregados ya reducidos (decenas de filas), lo que mantiene las consultas simples y portables sin
costo de rendimiento.

### Umbral de stock crítico

`Producto` no tiene stock mínimo por unidad, así que el umbral es un parámetro del endpoint con
valor por defecto **5**. Si más adelante se agrega un mínimo por producto, es el único punto a
cambiar.

---

## 6. Endpoints

Todos requieren rol **ADMIN** (`@PreAuthorize("hasRole('ADMIN')")` a nivel de clase) y JWT.
Sin `desde`/`hasta` el período por defecto es el **mes en curso**.

| Método | Ruta | Parámetros |
|---|---|---|
| GET | `/api/v1/dashboard/resumen` | `desde`, `hasta` |
| GET | `/api/v1/analytics/ventas` | `desde`, `hasta`, `agrupacion` |
| GET | `/api/v1/analytics/productos/top` | `desde`, `hasta`, `criterio`, `categoriaCodigo`, `limite` |
| GET | `/api/v1/analytics/productos/bajo-rendimiento` | `desde`, `hasta`, `limite` |
| GET | `/api/v1/analytics/productos/rentables` | `desde`, `hasta`, `criterio`, `limite` |
| GET | `/api/v1/analytics/categorias` | `desde`, `hasta`, `categoriaId` |
| GET | `/api/v1/analytics/inventario` | `desde`, `hasta`, `umbralStockCritico` |
| GET | `/api/v1/analytics/inventario/abc` | `desde`, `hasta`, `criterio` |
| GET | `/api/v1/analytics/compras` | `desde`, `hasta`, `agrupacion`, `proveedorId` |

Las fechas son ISO-8601 (`2026-09-01T00:00:00`). Todas las respuestas son agregados listos para
visualizar: un mes de ventas son 31 puntos, nunca las operaciones que los produjeron.

### Ajuste de costo

Operación de escritura que alimenta la línea de tiempo del costo. También requiere **ADMIN**.

| Método | Ruta | Cuerpo / parámetros |
|---|---|---|
| POST | `/api/v1/inventario/ajustes/costo` | `productoId`, `costoNuevo`, `motivo`, `observaciones` |
| GET | `/api/v1/inventario/ajustes/costo` | `productoId` (opcional) |

```json
POST /api/v1/inventario/ajustes/costo
{ "productoId": 1, "costoNuevo": 900.00, "motivo": "CORRECCION_ERROR",
  "observaciones": "El costo se cargó con el precio de lista del proveedor." }

201 Created
{ "id": 7, "productoId": 1, "productoNombre": "Panel 550W",
  "costoAnterior": 600.00, "costoNuevo": 900.00, "costoProductoResultante": 900.00,
  "stockAlAjustar": 60, "motivo": "CORRECCION_ERROR",
  "observaciones": "El costo se cargó con el precio de lista del proveedor.",
  "usuarioRegistro": "admin", "fecha": "2026-09-02T11:40:00" }
```

`stockAlAjustar` se devuelve para dejar explícito que la operación no movió unidades. Motivos
disponibles: `CORRECCION_ERROR`, `ACTUALIZACION_PROVEEDOR`, `CARGA_DE_COSTO_INICIAL`,
`REVALUACION`, `OTRO`.

Ajustar al mismo costo que ya está vigente se rechaza: no hay corrección que registrar.

---

## 7. Ejemplos de respuesta

### `GET /api/v1/dashboard/resumen`

```json
{
  "periodo": { "desde": "2026-09-01T00:00:00", "hasta": "2026-09-02T23:59:59", "dias": 2, "agrupacion": "DIA" },
  "ventasBrutas": 1000000.00,
  "devoluciones": 200000.00,
  "ventasNetas": 800000.00,
  "costoVentas": 480000.00,
  "gananciaBruta": 320000.00,
  "margenBruto": 40.00,
  "pedidos": 1,
  "ticketPromedio": 800000.00,
  "estadoVentas": "OK",
  "estadoGanancia": "OK",
  "estadoMargen": "OK",
  "estadoTicket": "OK",
  "lineasSinCosto": 0,
  "comparativa": {
    "periodoAnterior": { "desde": "2026-08-30T00:00:00", "hasta": "2026-08-31T23:59:59", "dias": 2, "agrupacion": "DIA" },
    "ventasNetas": { "actual": 800000.00, "anterior": 0.00, "variacionPorcentual": null, "estado": "SIN_BASE_DE_COMPARACION" },
    "gananciaBruta": { "actual": 320000.00, "anterior": 0.00, "variacionPorcentual": null, "estado": "SIN_BASE_DE_COMPARACION" },
    "pedidos": { "actual": 1.00, "anterior": 0.00, "variacionPorcentual": null, "estado": "SIN_BASE_DE_COMPARACION" }
  }
}
```

### `GET /api/v1/analytics/ventas?agrupacion=DIA`

```json
{
  "periodo": { "desde": "2026-08-31T00:00:00", "hasta": "2026-09-02T23:59:59", "dias": 3, "agrupacion": "DIA" },
  "estado": "OK",
  "puntos": [
    { "fecha": "2026-08-31", "etiqueta": "2026-08-31", "ventas": 0.00,   "devoluciones": 0.00, "ventasNetas": 0.00,   "ganancia": 0.00,   "pedidos": 0 },
    { "fecha": "2026-09-01", "etiqueta": "2026-09-01", "ventas": 200.00, "devoluciones": 0.00, "ventasNetas": 200.00, "ganancia": 80.00,  "pedidos": 1 },
    { "fecha": "2026-09-02", "etiqueta": "2026-09-02", "ventas": 300.00, "devoluciones": 0.00, "ventasNetas": 300.00, "ganancia": 120.00, "pedidos": 1 }
  ]
}
```

### `GET /api/v1/analytics/productos/rentables`

```json
[
  {
    "productoId": 2, "nombre": "Margen", "categoriaCodigo": "GENERAL", "categoriaNombre": "General",
    "unidades": 10, "ingresos": 10000.00, "costo": 2000.00, "ganancia": 8000.00, "margen": 80.00,
    "stockActual": 0, "estadoGanancia": "OK"
  },
  {
    "productoId": 3, "nombre": "Sin costo", "categoriaCodigo": "GENERAL", "categoriaNombre": "General",
    "unidades": 10, "ingresos": 1000.00, "costo": 0.00, "ganancia": null, "margen": null,
    "stockActual": 0, "estadoGanancia": "COSTO_INCOMPLETO"
  }
]
```

### `GET /api/v1/analytics/inventario`

```json
{
  "periodo": { "desde": "2026-09-02T00:00:00", "hasta": "2026-09-02T23:59:59", "dias": 1, "agrupacion": "DIA" },
  "stockTotal": 60, "valorInventario": 6000.00,
  "stockInicial": 100, "valorInventarioInicial": 10000.00,
  "stockFinal": 60, "valorInventarioFinal": 6000.00,
  "inventarioPromedio": 8000.00,
  "productosSinValuacionHistorica": 0,
  "unidadesIngresadas": 0, "unidadesDevueltasProveedor": 0, "inventarioDisponible": 100,
  "unidadesVendidas": 40, "costoVentas": 4000.00,
  "inventoryTurnover": 0.5000, "sellThrough": 40.00, "velocidadVenta": 40.0000, "diasInventario": 1.5,
  "productosStockCritico": 0, "umbralStockCritico": 5, "productosSinCosto": 0,
  "estadoValorInventario": "OK", "estadoTurnover": "OK", "estadoSellThrough": "OK", "estadoDiasInventario": "OK"
}
```

Mismo endpoint sobre un período que abarca datos anteriores a la migración V4. El costo de ventas
sigue siendo exacto; la valuación no se inventa:

```json
{
  "periodo": { "desde": "2026-08-01T00:00:00", "hasta": "2026-08-31T23:59:59", "dias": 31, "agrupacion": "DIA" },
  "stockTotal": 60, "valorInventario": 6000.00,
  "stockInicial": 100, "valorInventarioInicial": null,
  "stockFinal": 60, "valorInventarioFinal": null,
  "inventarioPromedio": null,
  "productosSinValuacionHistorica": 1,
  "unidadesIngresadas": 0, "unidadesDevueltasProveedor": 0, "inventarioDisponible": 100,
  "unidadesVendidas": 40, "costoVentas": 24000.00,
  "inventoryTurnover": null, "sellThrough": 40.00, "velocidadVenta": 1.2903, "diasInventario": 46.5,
  "productosStockCritico": 0, "umbralStockCritico": 5, "productosSinCosto": 0,
  "estadoValorInventario": "OK", "estadoTurnover": "COSTO_INCOMPLETO",
  "estadoSellThrough": "OK", "estadoDiasInventario": "OK"
}
```

### `GET /api/v1/analytics/inventario/abc`

```json
{
  "periodo": { "desde": "2026-09-02T00:00:00", "hasta": "2026-09-02T23:59:59", "dias": 1, "agrupacion": "DIA" },
  "criterio": "INGRESOS", "limiteA": 80.00, "limiteB": 95.00, "total": 1000.00, "estado": "OK",
  "productos": [
    { "productoId": 1, "nombre": "Clase A", "categoriaCodigo": "GENERAL", "ingresos": 800.00, "participacion": 80.00, "participacionAcumulada": 80.00,  "clasificacion": "A" },
    { "productoId": 2, "nombre": "Clase B", "categoriaCodigo": "GENERAL", "ingresos": 150.00, "participacion": 15.00, "participacionAcumulada": 95.00,  "clasificacion": "B" },
    { "productoId": 3, "nombre": "Clase C", "categoriaCodigo": "GENERAL", "ingresos": 50.00,  "participacion": 5.00,  "participacionAcumulada": 100.00, "clasificacion": "C" }
  ]
}
```

### `GET /api/v1/analytics/compras`

```json
{
  "periodo": { "desde": "2026-09-02T00:00:00", "hasta": "2026-09-02T23:59:59", "dias": 1, "agrupacion": "DIA" },
  "comprasBrutas": 1000.00, "devolucionesCompra": 200.00, "comprasNetas": 800.00, "ordenes": 1, "estado": "OK",
  "gastoPorProveedor": [
    { "proveedorId": 1, "nombre": "Proveedor de Producto D", "comprasBrutas": 1000.00, "devoluciones": 200.00, "comprasNetas": 800.00, "ordenes": 1, "participacion": 100.00 }
  ],
  "productosComprados": [
    { "productoId": 1, "nombre": "Producto D", "unidades": 10, "unidadesDevueltas": 2, "costoCompras": 1000.00, "costoDevuelto": 200.00, "costoNeto": 800.00 }
  ]
}
```

---

## 8. Pruebas

38 pruebas, todas contra datos creados por los servicios de negocio reales (no mocks),
de modo que también validan que las consultas JPQL funcionan sobre el esquema.

### `DashboardAnalyticsServiceTest` (13)

1. Ventas 1.000.000 y costo 600.000 → ganancia 400.000, margen 40%
2. La devolución reduce ventas netas y revierte costo, sin tocar la venta original
3. Varias devoluciones se acumulan sin diferencia de redondeo
4. Costo desconocido → `COSTO_INCOMPLETO`, sin margen falso
5. Período sin operaciones → `SIN_DATOS`, no cero
6. Período anterior en cero → `SIN_BASE_DE_COMPARACION`, no infinito
7. Comparación entre períodos aplica la fórmula de variación (+100%)
8. Los pedidos no cuentan pendientes ni canceladas
9. Ticket promedio = ventas netas / pedidos válidos
10. Ticket promedio neto con devolución: 1.200 / 2 = 600, el pedido devuelto sigue contando
11. La serie diaria rellena con cero los días sin ventas
12. La serie mensual agrupa el período en un punto
13. Serie de período vacío → `SIN_DATOS`

### `ProductoCategoriaAnalyticsServiceTest` (10)

1. El producto que más unidades mueve no es el que más ganancia deja
2. El ranking descuenta lo devuelto
3. Producto sin costo → ganancia `null`, `COSTO_INCOMPLETO`, último en el ranking
4. Ranking acotado por categoría
5. Producto recién creado no se clasifica como lento
6. Producto con antigüedad y sin ventas → `SIN_VENTAS_RECIENTES`
7. Categorías con ventas, ganancia, margen y participación (90,91% / 9,09%)
8. Categoría sin ventas no aparece en el período
9. ABC clasifica por participación acumulada (80/95/100 → A/B/C)
10. ABC sin ventas → `SIN_DATOS`

### `InventarioComprasAnalyticsServiceTest` (17)

1. Rotación 0,5, inventario disponible 100, sell-through 40%, velocidad 40/día, días 1,5
2. La devolución de cliente resta ventas netas pero no suma inventario disponible
3. **Ejemplo oficial de sell-through:** 100 + 50 - 10 = 140 disponible, 60 - 5 = 55 netas → 39,29%
4. Sin compras, el inventario disponible es solo el stock inicial (25/100 → 25%)
5. Varias compras y varias devoluciones se acumulan: 50 + 50 - 10 = 90, 20 netas → 22,22%
6. Con inventario y sin ventas → `0.00` + `VALOR_CERO`
7. Inventario disponible cero → `null` + `SIN_DATOS`
8. Un ajuste de costo posterior no reescribe el COGS (sigue 40 × 600)
9. La rotación valora cada extremo con el costo que regía en esa fecha (0,4211)
10. Producto anterior a V4, sin línea de tiempo de costo → rotación `null` + `COSTO_INCOMPLETO`
11. Con historial completo, una compra actualiza el costo y la valuación es exacta
12. Inventario en cero no divide: cada KPI declara su estado
13. Velocidad cero → `SIN_VENTAS_RECIENTES`
14. Stock crítico por umbral y aviso de inventario sin costo conocido
15. Compras netas descuentan la devolución sin tocar la compra original
16. Gasto por proveedor con participación (75% / 25%)
17. Compras sin operaciones → `SIN_DATOS`

### `AjusteCostoInventarioTest` (8)

1. Completar una compra actualiza el costo mediante la política
2. El movimiento de compra guarda `costoProductoResultante`
3. Un ajuste de inventario sin costo de operación conserva el costo vigente del producto
4. Si el costo vigente tampoco se conoce, el movimiento lo deja en NULL
5. El ajuste de costo explícito actualiza el costo vigente
6. El ajuste de costo no mueve stock ni genera movimiento de inventario
7. El ajuste de costo queda auditado con motivo, usuario y fecha
8. Ajustar al mismo costo vigente se rechaza

### `ProductoStockReglaTest` (incluye)

- Actualizar el producto no permite modificar el costo directamente
- Reenviar el costo vigente sin cambios sí se acepta

Las pruebas 8–11 de inventario son el cierre de la valuación histórica: el COGS nunca se
reescribe, la rotación usa costos de cada fecha cuando existen, y un período anterior a V4
no inventa valores.

### Resultados

```
mvn compile  →  BUILD SUCCESS
mvn test     →  Tests run: 110, Failures: 0, Errors: 0, Skipped: 0  —  BUILD SUCCESS
```

---

## 9. Decisiones pendientes

1. **Valuación histórica del inventario.** Cerrada. Ver sección 5.1. Los períodos anteriores a
   V4 siguen declarando `COSTO_INCOMPLETO`; no se reconstruyen.

2. **Stock mínimo por producto.** Mientras no exista el campo, el stock crítico depende de un
   umbral global enviado por parámetro.

3. **Umbral de "producto nuevo".** Fijado en 30 días dentro de `ProductoAnalyticsService`. Si el
   negocio maneja ciclos de venta más largos, conviene volverlo configurable.

4. **Ventas por cliente.** El KPI 18 cubre proveedores; el equivalente por cliente no estaba en el
   alcance de FASE 2 y se puede agregar con el mismo patrón cuando se necesite.
