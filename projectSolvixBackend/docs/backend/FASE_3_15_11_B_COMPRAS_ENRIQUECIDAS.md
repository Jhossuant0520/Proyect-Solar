# SOLVIX — FASE 3.15.11-B
## Compras enriquecidas

**Tipo:** IMPLEMENTACIÓN (enriquecimiento del dominio existente)  
**Base:** `docs/backend/FASE_3_15_11_A_AUDITORIA_COMPRAS.md`  
**Fecha de referencia:** código backend + frontend post 3.15.11-B

---

## 1. Modelo final

Se enriqueció **Compra / DetalleCompra** existentes. No se crearon:

- FacturaCompra, PedidoProveedor, OrdenCompra, RecepcionCompra
- CotizacionProveedor (entidad)
- ProductoProveedor, CxP, multi-moneda, factura electrónica

`Compra.numero` permanece `C-{yyyy}-{seq}`.

---

## 2. Nuevos campos

### Cabecera `compras`

| Campo | Columna | Notas |
|-------|---------|-------|
| `tipoDocumentoExterno` | `tipo_documento_externo` | enum `PEDIDO` \| `FACTURA` \| `OTRO` |
| `numeroDocumentoExterno` | `numero_documento_externo` | string opcional; obligatorio si hay tipo |
| `numeroOrdenCompra` | `numero_orden_compra` | referencia externa |
| `numeroCotizacionProveedor` | `numero_cotizacion_proveedor` | referencia externa |
| `fechaDocumentoProveedor` | `fecha_documento_proveedor` | fecha del documento del proveedor |
| `fechaEntrega` | `fecha_entrega` | entrega esperada/relevante |
| `fechaVencimiento` | `fecha_vencimiento` | vencimiento de pago |
| `condicionPagoAplicada` | `condicion_pago_aplicada` | snapshot `CONTADO` \| `CREDITO` |
| `diasCreditoAplicados` | `dias_credito_aplicados` | snapshot entero |
| `moneda` | `moneda` | fijo **COP** |
| `contactoProveedorId` | `contacto_proveedor_id` | id histórico opcional |
| `contactoNombreSnapshot` | `contacto_nombre_snapshot` | nombre congelado |
| `impuestoTotal` | `impuesto_total` | DECIMAL(14,2), default 0 |

Se mantienen: `proveedorNombreSnapshot`, `proveedorDocumentoSnapshot`, `fecha` (negocio), totales, estados.

### Línea `detalle_compra`

| Campo | Columna | Notas |
|-------|---------|-------|
| `referenciaProveedor` | `referencia_proveedor` | SKU del proveedor; no reemplaza código SOLVIX |
| `porcentajeImpuesto` | `porcentaje_impuesto` | default 0 |
| `valorImpuesto` | `valor_impuesto` | default 0 |

Invariante: `costoUnitario` histórico e inmutable.

---

## 3. Documento externo

- Enum `TipoDocumentoExternoCompra`: `PEDIDO`, `FACTURA`, `OTRO`.
- `numeroDocumentoExterno` acepta alfanuméricos (`F-123456`).
- Validación: si hay tipo → número obligatorio.
- No confundir con `Compra.numero` interno.

---

## 4. Condiciones de pago

Al crear:

1. Defaults desde `Proveedor.condicionPago` / `diasCredito`.
2. Override opcional en request.
3. Snapshot en Compra.

Reglas:

- `CONTADO` → `diasCreditoAplicados = 0`
- `CREDITO` → `diasCreditoAplicados > 0`

Cambios posteriores del proveedor **no** modifican la compra.

---

## 5. Fechas

| Campo | Significado |
|-------|-------------|
| `fecha` | fecha de negocio interna (existente) |
| `fechaDocumentoProveedor` | fecha del documento externo |
| `fechaEntrega` | entrega esperada/relevante |
| `fechaVencimiento` | vencimiento de pago |

### Regla de vencimiento (documentada)

- Si el request envía `fechaVencimiento` → se respeta (override).
- Si `condicionPagoAplicada = CREDITO` y no hay override →  
  `fechaVencimiento = fecha + diasCreditoAplicados`.
- Si `CONTADO` (o sin crédito) → `fechaVencimiento = null` (no se fuerza coincidencia con `fecha`).

No hay recepción parcial.

---

## 6. Impuestos (IVA mínimo)

**No** es facturación electrónica ni régimen fiscal completo.

Cálculo (scale 2, HALF_UP) — **fuente de verdad: backend** (refuerzo 3.15.11-C):

1. Subtotal líneas = Σ (cantidad × costoUnitario)
2. Impuesto de línea = subtotalLínea × porcentaje / 100 (**siempre calculado**; se ignora `valorImpuesto` del request)
3. `impuestoTotal` = Σ impuestos de línea (**se ignora** `impuestoTotal` del request)
4. `total = subtotal − descuento + impuestoTotal`

UI: tasa predeterminada **19%**, opción **0%**. Porcentaje omitido en API → **0** (compat).

Compras legacy: `impuestoTotal = 0` vía migración/default; total histórico = subtotal − descuento.

---

## 7. Descuentos

Solo cabecera (existente). Sin descuento por línea.

Validación: `0 ≤ descuento ≤ subtotal`.

Prorrateo de `DevolucionCompra` intacto: usa proporción sobre `Compra.total` (ahora puede incluir IVA).

---

## 8. Snapshots

- Proveedor: nombre + documento (ya existían).
- Contacto: `contactoProveedorId` + `contactoNombreSnapshot` al crear; no dependen del maestro vivo.
- Documento externo: el propio `numeroDocumentoExterno` es el histórico (sin duplicar).

---

## 9. Detalle

Campos legacy + `referenciaProveedor`, `porcentajeImpuesto`, `valorImpuesto`.

---

## 10. Integración inventario

Sin cambios de workflow:

| Acción | Stock |
|--------|-------|
| Crear | no mueve |
| Cancelar PENDIENTE | no mueve |
| Completar | entra stock |
| Devolución | revierte stock |

`InventarioService` no se modificó.

---

## 11. Integración costos

Sin cambios:

`Completar` → `PoliticaCosteoInventario` / `UltimoCostoPolitica` → `Producto.costoActual`.

`DetalleCompra.costoUnitario` nunca se recalcula desde `costoActual`.

---

## 12. Devoluciones

- Costo revertido = `DetalleCompra.costoUnitario` (sin IVA).
- Monto económico = prorrateo sobre `Compra.total` (incluye `impuestoTotal` en compras nuevas).
- Compra original no se recalcula.

---

## 13. API

### Request (`CompraRequestDTO`)

Campos nuevos: documento externo, OC, cotización, fechas, condición/días, contacto, `impuestoTotal`, detalles con ref/%/valor impuesto.

### Response (`CompraResponseDTO`)

Expone identificación interna, proveedor + snapshots, documento, referencias, fechas, condiciones, moneda COP, totales + impuesto, estado, detalles enriquecidos.

Compat: `numero`, `proveedorNombre`, `subtotal`, `descuento`, `total`, `estado` se mantienen.

---

## 14. Frontend

- `compra-form`: secciones Documento de compra, Fechas, Condiciones; líneas con ref. proveedor y % impuesto; resumen estimado.
- `compra-detail`: documento SOLVIX vs proveedor, OC, cotización, fechas, condiciones, impuesto en totales.
- Listado: filtros existentes (proveedor/estado/periodo); sin búsqueda de documento externo.
- Feedback: `SolvixFeedbackService` existente.

---

## 15. Migración

Archivo: `src/main/resources/db/migration/V18__compras_enriquecidas.sql`

- Idempotente (`information_schema` + `PREPARE`).
- Segura si Hibernate ya creó columnas (`ddl-auto=update`).
- Defaults: `moneda='COP'`, `impuesto_total=0`, impuestos de línea = 0.
- **No** modifica V1/V3/V17.
- Flyway no está cableado: aplicar manualmente o confiar en Hibernate + script documentado.

---

## 16. Compatibilidad histórica

- Compras antiguas consultables; campos nuevos NULL o 0.
- No se inventan IVA, OC, condiciones ni fechas.
- No se reescriben `costoUnitario` / subtotal / descuento / total históricos.

**Diferencia semántica de total:**

| Generación | Total |
|------------|-------|
| Legacy | `subtotal − descuento` (`impuestoTotal=0`) |
| Nueva | `subtotal − descuento + impuestoTotal` |

Analytics sigue sumando `Compra.total` / estados / fecha sin rediseño.

---

## 17. Tests

Backend (`CompraServiceTest`): documento, condiciones congeladas, IVA + total, validación tipo sin número, más casos previos de stock/costo/descuento.

Frontend:

- `compra-form.spec.ts`: secciones, prefill proveedor, validaciones, payload, cálculo visual.
- `compra-detail.spec.ts`: documento/condiciones/impuesto + compra legacy.

Regresión esperada: Compra/Devolucion/InventarioComprasAnalytics/AjusteCosto/Proveedor + builds.

---

## 18. Decisiones

1. Enriquecer Compra, no segundo dominio.
2. CONTADO → vencimiento null (consistente con opcionalidad).
3. Impuesto omitido = 0 / suma de líneas.
4. Moneda fija COP sin tasa.
5. Devolución económica hereda IVA vía `total` sin fórmula nueva de tasas.
6. V18 idempotente por ausencia de Flyway.

---

## 19. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| BD sin columnas si solo se despliega JAR sin V18/Hibernate | Script + `ddl-auto=update` |
| Analytics interpreta total con IVA en compras nuevas | Documentado; no se cambió agregación |
| Listado proveedores sin contactos cargados | Contacto opcional; selector vacío si no hay |

---

## 20. Limitaciones (NO-GOALS respetados)

Sin CxP, pagos, bancos, OC/factura como entidades, recepción parcial, multi-moneda real, PDF adjunto, e-invoicing, ProductoProveedor, nuevos estados, nuevo costeo.

---

## Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| `Compra.numero` intacto | OK |
| Documento externo / OC / cotización | OK |
| Fechas documento/entrega/vencimiento | OK |
| Condición y días congelados | OK |
| COP | OK |
| IVA mínimo | OK |
| Descuento cabecera | OK |
| Ref. proveedor línea | OK |
| Contacto snapshot | OK |
| Costo / inventario / devoluciones / analytics | OK (sin romper flujos) |
| Históricos | OK |
| Frontend + API | OK |
| V18 | OK (script) |
| Docs | este archivo |

FIN DE DOCUMENTACIÓN FASE 3.15.11-B
