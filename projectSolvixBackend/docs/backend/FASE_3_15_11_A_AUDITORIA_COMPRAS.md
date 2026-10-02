# SOLVIX — FASE 3.15.11-A
## Auditoría del dominio de Compras enriquecidas

**Tipo:** AUDITORÍA Y DISEÑO (sin implementación)  
**Fecha de referencia:** código backend + frontend post FASE 3.15.10-C  
**Restricción cumplida:** no se crearon entidades, migraciones, DTOs, endpoints, frontend ni cambios de BD.

Leyenda: **HECHO** · **INFERENCIA** · **PROPUESTA** · **DECISIÓN** · **DECISIÓN PENDIENTE** · **INCERTIDUMBRE**

---

## Informe ejecutivo

| Campo | Valor |
|-------|--------|
| **Estado** | **READY** |
| **Compra actual** | Documento interno de abastecimiento (`C-{yyyy}-{seq}`), no factura fiscal ni OC independiente |
| **Dominio** | Ya implementado (FASE 1 + devoluciones + analytics + snapshots proveedor 10-B) |
| **Enriquecimiento** | Ampliar **cabecera** con referencias documentales y condiciones aplicadas; **no** segundo stack |
| **Siguiente fase** | **3.15.11-B** (implementación acotada según decisiones) |

---

## 1. Estado actual — arquitectura

**HECHO**

```
Proveedor (maestro 3.15.10)
    ↓ FK
Compra (cabecera) ──1:N──► DetalleCompra (líneas + costo congelado)
    │                              │
    │ completar()                  │ costoUnitario histórico
    ├─► PoliticaCosteoInventario → Producto.costoActual
    └─► InventarioService → MovimientoInventario TIPO=COMPRA
    │
    └─► DevolucionCompra (documento propio DC-…)
           └─► InventarioService TIPO=DEVOLUCION_COMPRA
```

**Capas:** `CompraController` → DTO → `CompraService` → `CompraRepository` / specs → entity.  
**Autoridad stock:** solo `InventarioService`.  
**Analytics:** `ComprasAnalyticsService` sobre compras “realizadas” + devoluciones aparte.

**DECISIÓN (brief):** no crear segundo dominio Compra; no reemplazar entidad; no duplicar inventario/costos.

---

## 2. Compra actual (cabecera)

**HECHO** — entity `Compra` / tabla `compras` (+ columnas 10-B):

| Campo | Tipo | Rol |
|-------|------|-----|
| `id` | Long | PK |
| `numero` | String UK | Identificador **interno** `C-{yyyy}-{seq}` |
| `fecha` | LocalDateTime | Fecha de negocio (analytics / default al crear) |
| `proveedor` | ManyToOne | FK obligatorio |
| `proveedorNombreSnapshot` | String | Histórico razón social |
| `proveedorDocumentoSnapshot` | String | Histórico NIT |
| `subtotal` | DECIMAL(14,2) | Suma líneas |
| `descuento` | DECIMAL(14,2) | Descuento **cabecera** (valor, no %) |
| `total` | DECIMAL(14,2) | subtotal − descuento |
| `estado` | enum | Ver §5 |
| `observaciones` | String | Libre |
| `fechaCompletada` / `fechaAnulada` | datetime | Eventos |
| `createdAt` / `updatedAt` / `createdBy` | audit | Técnico |

**Request API:** `proveedorId`, `fecha?`, `descuento?`, `observaciones?`, `detalles[]`.  
**Sin PUT/edición** tras crear — solo `completar` / `cancelar` / devoluciones.

---

## 3. DetalleCompra actual

**HECHO**

| Campo | Rol |
|-------|-----|
| `producto` | FK |
| `productoNombre` | snapshot descriptivo |
| `categoriaCodigo` | snapshot |
| `cantidad` | enteros > 0 |
| `costoUnitario` | **costo histórico congelado** |
| `subtotal` | cantidad × costoUnitario (scale 2 HALF_UP) |
| `cantidadDevuelta` | acumulado devoluciones |

**No existen:** descuento línea, IVA línea, referencia proveedor, descripción externa, precio lista vs costo.

---

## 4. Estados y transiciones

**HECHO** — `EstadoCompra`:

| Estado | Cómo se llega | Inventario | Costo producto | Edición líneas | Devolución |
|--------|---------------|------------|----------------|----------------|------------|
| `PENDIENTE` | `crear` | no | no | no (sin API edit) | no |
| `COMPLETADA` | `completar` | entrada COMPRA | actualiza `costoActual` | no | sí |
| `CANCELADA` | `cancelar` (solo desde PENDIENTE) | no | no | no | no |
| `PARCIALMENTE_DEVUELTA` | devolución parcial | salida DEV_COMPRA | no recalcula líneas | no | sí (resto) |
| `DEVUELTA` | devolución total líneas | salida DEV_COMPRA | no | no | no (agotado) |

**HECHO:** `permiteDevolucion()` = COMPLETADA \| PARCIALMENTE_DEVUELTA.  
**HECHO:** `esCompraRealizada()` = COMPLETADA \| PARCIALMENTE_DEVUELTA \| DEVUELTA (analytics brutas).  
**HECHO:** no existe `BORRADOR` separado; `PENDIENTE` actúa como pre-ingreso.

**INFERENCIA:** “Anulada” en lenguaje de negocio ≈ `CANCELADA` (nunca completó) o devolución total (`DEVUELTA`) si ya ingresó stock.

---

## 5. Completar — comportamiento exacto

**HECHO** (`CompraService.completar`):

1. Exige `PENDIENTE`.
2. Por cada línea: política costeo → `Producto.costoActual` → `InventarioService.registrarMovimiento(COMPRA, …, costoUnitario histórico, ref COMPRA)`.
3. Estado → `COMPLETADA`, `fechaCompletada = now`.

**HECHO:** crear compra **no** mueve stock.  
**HECHO:** cancelar PENDIENTE **no** mueve stock.  
**HECHO:** no hay recepción parcial / multi-entrada por compra.

---

## 6. Devoluciones

**HECHO**

- Documento propio `DevolucionCompra` (`DC-…`), no altera `Compra.total` histórico.
- Montos con prorrateo de descuento cabecera; costo revertido = `DetalleCompra.costoUnitario` (nunca `costoActual` vivo).
- Stock vía `DEVOLUCION_COMPRA`.
- Actualiza `cantidadDevuelta` y estado compra a PARCIALMENTE_DEVUELTA / DEVUELTA.

**PROPUESTA 11-B+:** cualquier campo nuevo de cabecera/línea debe preservar este contrato (totales históricos inmutables; devolución aparte).

---

## 7. Proveedor como dependencia

**HECHO (3.15.10)**

- Compra exige proveedor **activo** al crear.
- Snapshots nombre/documento al crear; DTO prioriza snapshot.
- Completar permitido si proveedor se inactiva después.
- Condiciones habituales viven en Proveedor (`condicionPago`, `diasCredito`) — **no** se copian aún a Compra.
- Contactos 1:N en Proveedor; Compra **no** referencia contacto.

**DECISIÓN:** no embeber Proveedor completo en Compra; solo FK + snapshots necesarios.

---

## 8. Documento externo vs número interno

| Concepto | Estado | Nota |
|----------|--------|------|
| `Compra.numero` interno | **EXISTE** | No reemplazar; secuencia SOLVIX |
| Nº pedido proveedor | **FALTA** | Documento real “PEDIDO” |
| Nº factura proveedor | **FALTA** | Distinto conceptualmente |
| Nº OC | **FALTA** | Referencia en documento |
| Nº cotización proveedor | **FALTA** | Referencia documental |
| Tipo documento externo | **FALTA** | PEDIDO / FACTURA / OTRO |

**PROPUESTA (mínima, sin 4 entidades):**

- `Compra` = **documento interno de compra** (sigue siendo la unidad que completa e inventaría).
- Campos opcionales de cabecera: `tipoDocumentoExterno` + `numeroDocumentoExterno` (o campos dedicados `numeroPedidoProveedor` / `numeroFacturaProveedor` si negocio exige separación visual).
- `numeroOrdenCompra` y `numeroCotizacionProveedor` = **referencias string** opcionales.
- **No** crear `OrdenCompra`, `FacturaCompra`, `PedidoProveedor`, `RecepcionCompra` en 11-B salvo decisión explícita.

**Clasificación factura / pedido / OC:**

| Etiqueta documento real | En SOLVIX hoy | Propuesta |
|-------------------------|---------------|-----------|
| “PEDIDO” (papel proveedor) | sin entidad | Referencia externa + Compra interna |
| Factura fiscal proveedor | no existe | Campo/tipo externo o fase CxP/FE (**fuera** 11-B mínimo) |
| OC | no existe | String en cabecera |
| Cotización proveedor | no existe | String en cabecera (≠ CotizacionComercial / CotizacionServicio) |
| Recepción | implícita en `completar` | Sin entidad recepción parcial todavía |

---

## 9. Campos de cabecera — clasificación candidata

| Campo | Clasificación |
|-------|----------------|
| proveedorId | **EXISTE** |
| proveedorNombreSnapshot / DocumentoSnapshot | **EXISTE** |
| numeroInterno (`numero`) | **EXISTE** |
| numeroDocumentoProveedor | **FALTA** — PROPUESTA |
| tipoDocumentoProveedor | **FALTA** — PROPUESTA (enum simple) |
| fechaDocumento | **FALTA** vs `fecha` actual — DECISIÓN PENDIENTE si se separa |
| fechaRegistro (`createdAt`) | **EXISTE** |
| fechaEntrega | **FALTA** — PROPUESTA opcional |
| fechaVencimiento | **FALTA** — PROPUESTA |
| condicionPago / diasCredito aplicados | **FALTA** — PROPUESTA (snapshot desde proveedor) |
| moneda / tasaCambio | **FALTA** — ver §12 |
| numeroOrdenCompra | **FALTA** — PROPUESTA string |
| numeroCotizacionProveedor | **FALTA** — PROPUESTA string |
| subtotal / descuento / total | **EXISTE** |
| impuesto | **FALTA** — ver §13 |
| observaciones | **EXISTE** |
| contactoProveedorId / snapshot | **FALTA** — ver §21 |

---

## 10. Fechas

| Concepto | Hoy | Necesidad |
|----------|-----|-----------|
| Creación técnica | `createdAt` | **EXISTE** |
| Fecha negocio / documento | `fecha` (única) | **EXISTE**; puede mezclar “fecha pedido” |
| Completado / recepción efectiva | `fechaCompletada` | **EXISTE** (= ingreso stock) |
| Anulación | `fechaAnulada` | **EXISTE** |
| Entrega esperada | — | **PROPUESTA** opcional |
| Vencimiento pago | — | **PROPUESTA** si hay crédito |
| Recepción parcial | — | **FUERA** (no hay infra) |

**PROPUESTA:** mantener `fecha` como fecha de negocio del documento; si negocio aporta fecha distinta de creación, usarla en request (ya soportado). Separar `fechaDocumentoProveedor` solo si evidencia operativa lo exige (**DECISIÓN PENDIENTE**).

---

## 11. Condiciones de pago

**HECHO:** habituales en Proveedor; **no** en Compra.

**PROPUESTA:**

- Al crear: copiar `condicionPagoAplicada` + `diasCreditoAplicados` desde proveedor (editables en request).
- Congelar en cabecera; cambio posterior del maestro **no** altera compras.
- `fechaVencimiento`: **DECISIÓN PENDIENTE** entre:
  - **A** calcular `fecha + diasCredito`
  - **B** registrar explícita
  - **C** default A con override B  

**INFERENCIA:** documento “30D CREDITO 30 DIAS” → CREDITO + 30; alinear con enum proveedor CONTADO/CREDITO.

---

## 12. Moneda

**HECHO**

- Sin campo moneda en Compra/Venta/Cotizaciones.
- Importes `BigDecimal` scale 2 HALF_UP.
- PDFs de servicio formatean **COP** presentacionalmente (`DocumentoPlantillaSupport`).
- No USD / exchange rate en dominio comercial.

**PROPUESTA 11-B:**  
- **Opción recomendada mínima:** documentar implícito **COP**; **no** agregar moneda aún.  
- Si negocio exige etiqueta: `moneda = 'COP'` fijo opcional **sin** tasa ni multi-moneda.

**DECISIÓN PENDIENTE:** ¿alguna compra real en USD?

---

## 13. Impuestos / IVA

**HECHO**

- Compra/DetalleCompra/Venta/CotizacionComercial/CotizacionServicio: **sin** modelo de IVA en líneas/cabecera comercial auditada.
- Totales compra = subtotal − descuento cabecera (sin impuesto).

**PROPUESTA:**

- No inventar régimen fiscal en 11-B sin decisión negocio.
- Si se incluye más adelante: alinear scale 2 HALF_UP; cabecera `impuestoTotal` + línea `%` y valor; **no** booleano único.
- Impacto alto en devoluciones (prorrateo actual asume solo descuento cabecera).

**DECISIÓN PENDIENTE:** ¿IVA incluido en costo unitario hoy o desglosado al proveedor?

---

## 14. Descuentos

**HECHO**

- Solo descuento **cabecera** (valor absoluto ≤ subtotal).
- Líneas: sin descuento.
- Devolución prorratea descuento cabecera en monto económico.

**PROPUESTA:** mantener un solo nivel en 11-B salvo evidencia de descuento por línea en operación real. Si se agrega línea: evitar sumar cabecera+línea sin regla explícita.

---

## 15. Detalle — capacidad futura

| Necesidad | Estado |
|-----------|--------|
| producto / cantidad / costoUnitario / subtotal | **EXISTE** |
| descuento línea / IVA línea / total línea | **FALTA** |
| referencia proveedor / descripción externa | **FALTA** — opcional bajo |
| snapshots productoNombre / categoriaCodigo | **EXISTE** — no sustituir por join vivo |

---

## 16. Costos

**HECHO / DECISIÓN**

- `DetalleCompra.costoUnitario` = histórico inmutable.
- `Producto.costoActual` = vigente vía `UltimoCostoPolitica` al completar.
- Movimiento inventario guarda costo de la entrada.
- **No** cambiar política en 11-A/B.

---

## 17. Inventario

**HECHO**

| Momento | Stock |
|---------|-------|
| crear PENDIENTE | sin cambio |
| completar | +cantidad COMPRA |
| cancelar PENDIENTE | sin cambio |
| devolución | −cantidad DEVOLUCION_COMPRA |

**PROPUESTA:** enriquecer cabecera **no** debe mover stock en create. Recepciones parciales = **FUERA DE ALCANCE** 11-B.

---

## 18. Snapshots

| Snapshot | Estado |
|----------|--------|
| proveedorNombre / Documento | **EXISTE** |
| productoNombre / categoriaCodigo | **EXISTE** |
| costoUnitario | **EXISTE** |
| condición pago / días crédito | **FALTA** — PROPUESTA |
| moneda | **FALTA** — si se modela |
| contacto comercial | **FALTA** — ver §21 |
| nº documento externo | **FALTA** (el valor *es* histórico por sí mismo) |

**Regla documentada:** maestro actual ≠ hecho histórico de compra cerrada/completada.

---

## 19. Analytics

**HECHO** depende de:

- `compras.total`, `estado`, `fecha`, `proveedor_id`
- `pr.nombre` **vivo** en gasto por proveedor (**LIMITACION** 10-C)
- devoluciones por monto separado
- líneas para productos comprados / costos

**RIESGO 11-B:** columnas nuevas generalmente **no** rompen queries actuales si no se renombra `total`/`estado`/`fecha`. Cambiar semántica de `total` (p. ej. incluir IVA) **sí** rompería KPIs — requiere decisión explícita y migración de métricas.

---

## 20. Frontend actual

**HECHO**

| Pantalla | Datos |
|----------|--------|
| `compra-form` | proveedor activo, líneas producto/costo/cantidad, descuento cabecera, observaciones; barcode; **sin** OC/IVA/condiciones |
| `compra-list` | filtros proveedor/estado/periodo; analytics gasto proveedor |
| `compra-detail` | totales, líneas, completar/cancelar, devoluciones; muestra snapshot proveedor vía DTO |

**Sin** edición de compra PENDIENTE. UX alineada panel admin (loading/error/feedback).

---

## 21. Contacto comercial de la compra

Documento real: asesora/vendedor del proveedor.

**PROPUESTA:**

- Preferible **fase posterior** o 11-B opcional: `contactoNombreSnapshot` (+ opcional `contactoProveedorId` al crear).
- No es usuario SOLVIX.
- Si el contacto se borra/cambia, snapshot conserva histórico.

**DECISIÓN PENDIENTE:** prioridad vs campos documentales (OC, nº pedido).

---

## 22–24. OC, cotización, archivos

| Tema | Propuesta |
|------|-----------|
| OC | string `numeroOrdenCompra` en Compra; **sin** entidad |
| Cotización proveedor | string; **≠** CotizacionComercial/Servicio |
| PDF/factura escaneada | infraestructura docs existe en OT; **FUERA** 11-B salvo necesidad inmediata |

---

## 25. Totales y redondeo

**HECHO Compra:** scale 2, HALF_UP; orden: sum(líneas) → descuento cabecera → total.  
**HECHO Cotizaciones:** mismo scale/round en servicio.  
**PROPUESTA:** no inventar política distinta al enriquecer.

---

## 26. Clasificación del documento real (campo a campo)

| Campo observado | Propuesta | Destino |
|-----------------|-----------|---------|
| Razón social | Maestro + snapshot compra | **A** Proveedor / **B** Compra snapshot |
| NIT | Maestro + snapshot | **A** / **B** snapshot |
| Dirección / ciudad / teléfono | Maestro | **A** Proveedor |
| Contacto (persona) | ContactoProveedor | **D** |
| Vendedor/asesora | Contacto + opcional snapshot compra | **D** / **B** futuro |
| Forma de pago / días crédito | Habitual maestro; aplicada compra | **A** habitual / **B** aplicada |
| Fecha entrega | Cabecera opcional | **B** |
| Número pedido | Documento externo | **E** / **B** |
| Número OC | Referencia | **B** string |
| Número cotización | Referencia | **B** string |
| Moneda | Implícito COP hoy | **F** o mínimo COP |
| Referencia producto | Detalle / catálogo | **C** (hoy vía Producto SOLVIX) |
| Cantidad | Detalle | **C** |
| Precio | = costo compra en SOLVIX | **C** `costoUnitario` |
| Descuento | Cabecera hoy | **B** (línea = futuro) |
| IVA | No modelado | **F** / decisión fiscal |
| Subtotal / Total | Cabecera | **B** |
| “Cliente” del pedido (CEC) | Comprador = empresa SOLVIX | **F** (no Cliente comercial) |
| Fax | Bajo valor | **F** / opcional maestro |

---

## 27. Impact surface (futuro 11-B+)

| Área | Impacto potencial |
|------|-------------------|
| **BACKEND** | Columnas Compra; request/response DTO; validaciones; defaults desde Proveedor; posiblemente DetalleCompra |
| **DATABASE** | ALTER compras; índices por nº externo; sin tocar V1 histórica |
| **FRONTEND** | Secciones form/detail; filtros opcionales por nº externo |
| **INVENTARIO** | Ninguno si completar sigue igual |
| **COSTOS** | Ninguno si `costoUnitario` intacto |
| **DEVOLUCIONES** | Revisar si total/impuesto cambia semántica |
| **ANALYTICS** | Seguro si `total`/`estado`/`fecha` conservan significado |
| **DOCUMENTOS** | Adjuntos fuera de alcance |

---

## 28. Decisiones pendientes

1. ¿Separar `fecha` vs `fechaDocumentoProveedor`?
2. ¿`fechaVencimiento` calculada, explícita o ambas?
3. ¿IVA desglosado obligatorio en 11-B o aplazado?
4. ¿Moneda solo COP implícito o campo fijo?
5. ¿Un campo `numeroDocumentoExterno` + tipo, o campos separados pedido/factura?
6. ¿Contacto snapshot en 11-B o después?
7. ¿Descuento por línea en alcance?
8. ¿Referencia/SKU del proveedor en línea?

---

## 29. Propuesta FASE 3.15.11-B (alcance sugerido)

**Incluir (PROPUESTA mínima segura):**

1. Cabecera: `numeroDocumentoExterno` (+ `tipoDocumentoExterno` opcional), `numeroOrdenCompra`, `numeroCotizacionProveedor`.
2. Condición aplicada: `condicionPagoAplicada`, `diasCreditoAplicados` (default desde Proveedor).
3. `fechaEntrega` y/o `fechaVencimiento` según decisión §28.
4. DTOs + form/detail FE: sección “Documento proveedor” y “Condiciones”.
5. Tests: snapshot condiciones; create no mueve stock; completar/devolución/analytics regresión.
6. Docs API + reglas.

**Excluir explícitamente:**

- Entidades OC/Factura/Pedido/Recepción  
- Multi-moneda / tasa  
- IVA completo (salvo decisión #3 = sí mínimo)  
- CxP, pagos, FE, adjuntos, recepción parcial, ProductoProveedor  
- Cambio de política de costeo / estados nuevos  

---

## 30. Criterios de aceptación 11-A

| Criterio | Estado |
|----------|--------|
| Compra / Detalle / estados / transiciones | ✅ |
| Proveedor dependencia | ✅ |
| Documento externo vs interno | ✅ |
| Pedido/OC/Factura conceptual | ✅ |
| Fechas / condiciones / moneda / IVA / descuentos | ✅ |
| Costos / inventario / devoluciones / snapshots | ✅ |
| Analytics / frontend | ✅ |
| Documento real clasificado | ✅ |
| Impact surface + pendientes + 11-B | ✅ |
| Sin código implementado | ✅ |
| Doc creada | ✅ este archivo |

---

## Informe final (plantilla brief)

**Estado:** READY  

**Compra actual:** documento interno abastecimiento con completar→stock/costo y devoluciones propias.  

**Campos existentes:** numero, fecha, proveedor+snapshots, subtotal/descuento/total, estado, observaciones, audit, líneas con costo histórico.  

**Campos faltantes (candidatos):** refs externas (pedido/OC/cotización), condiciones aplicadas, fechas entrega/vencimiento, IVA, moneda explícita, contacto snapshot.  

**Documento externo:** no mezclar con `Compra.numero`; refs en cabecera.  

**Impuestos / Moneda:** no modelados; COP implícito; IVA **DECISIÓN PENDIENTE**.  

**Condiciones / Fechas:** habituales en Proveedor; aplicadas/fechas extra **PROPUESTA**.  

**Costos / Inventario / Devoluciones:** contratos FASE 1 intactos a preservar.  

**Snapshots:** proveedor+producto+costo OK; ampliar condiciones/contacto.  

**Analytics:** nombre proveedor vivo en agregados; totales semánticos sensibles.  

**Frontend:** form/list/detail operativos; faltan campos enriquecidos.  

**Clasificación factura/pedido:** “PEDIDO” papel ≠ factura fiscal; Compra interna + refs; sin 4 entidades.  

**Decisiones pendientes:** §28.  

**Impact Surface:** §27.  

**Siguiente fase:** **3.15.11-B**

---

*Fin FASE 3.15.11-A — auditoría y diseño únicamente.*
