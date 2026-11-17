# FASE 3.15.7 — Cotizaciones formales de Orden de Servicio (Backend)

## Objetivo

Propuesta económica formal por OT, independiente de inventario y de costos internos.

## Modelo

| Entidad | Tabla | Rol |
|---------|-------|-----|
| `CotizacionServicio` | `cotizaciones_servicio` | Cabecera comercial |
| `DetalleCotizacionServicio` | `detalles_cotizacion_servicio` | Líneas con snapshot |

**Tipos:** `INICIAL` \| `ADICIONAL`  
**Estados cotización:** `BORRADOR` → `PENDIENTE_APROBACION` → `APROBADA` \| `RECHAZADA` \| `ANULADA`

## Dinero

- `BigDecimal` precision 14, scale 2
- Redondeo: `RoundingMode.HALF_UP` (misma política que Venta/Compra)
- Subtotales y total **solo** los calcula el backend
- Angular no es autoridad económica

## Precios vs costos

| Concepto | Fuente | Uso |
|----------|--------|-----|
| Precio al cliente | `DetalleCotizacionServicio.precioUnitario` | Cotización (congelado) |
| Costo interno | `OrdenServicioRepuesto.costoUnitario` / `Producto.costoActual` | Inventario; **no** se usa como precio |
| Precio sugerido | `Producto.precioVentaActual` | Solo al armar línea REPUESTO en borrador |

Cotizar **no** modifica stock, movimientos, `precioVentaActual` ni `costoActual`.

## Numeración

`TipoSecuencia.COTIZACION_SERVICIO` → `COT-{yyyy}-{000000}` vía `SecuenciaDocumentoService`.

## Workflow OT (matriz 3.15.7)

```
DIAGNOSTICADO → COTIZADO          (crear/preparar cotización inicial válida)
COTIZADO → PENDIENTE_APROBACION   (presentar)
PENDIENTE_APROBACION → APROBADO   (aprobar INICIAL)
REQUIERE_APROBACION_ADICIONAL → PENDIENTE_APROBACION  (presentar ADICIONAL)
PENDIENTE_APROBACION → EN_REPARACION  (aprobar ADICIONAL)
PENDIENTE_APROBACION → COTIZADO   (rechazo INICIAL)
PENDIENTE_APROBACION → REQUIERE_APROBACION_ADICIONAL  (rechazo ADICIONAL)
```

Estas transiciones **solo** vía `CotizacionServicioService` → `OrdenServicioService.transicionarPorDominio`.  
`POST /estado` genérico las rechaza (`requiereDominioCotizacion`).

## Endpoints

Base: `/api/v1/ordenes-servicio/{ordenId}/cotizaciones` — `@PreAuthorize("hasRole('ADMIN')")`

| Método | Ruta | Acción |
|--------|------|--------|
| GET | `/` | Listar |
| GET | `/resumen-economico` | Total autorizado (aprobadas) |
| GET | `/{id}` | Detalle |
| POST | `/inicial` | Crear INICIAL (OT DIAGNOSTICADO/COTIZADO) |
| POST | `/adicional` | Crear ADICIONAL |
| PUT | `/{id}` | Editar BORRADOR |
| POST | `/{id}/presentar` | Presentar |
| POST | `/{id}/aprobar` | Aprobar completa |
| POST | `/{id}/rechazar` | Rechazar (obs. opcional) |
| DELETE | `/{id}` | Eliminar solo BORRADOR |

Usuario/fechas de presentación y aprobación: **servidor** + JWT; el cliente no los envía.

## Migración

`V11__cotizaciones_orden_servicio.sql`

- CHECK OT/historial: `PENDIENTE_APROBACION`
- CHECK secuencias: `COTIZACION_SERVICIO`
- Tablas cotización + detalle + FKs/índices

## Separación obligatoria

```
ORDEN DE SERVICIO
 ├── REPUESTOS OPERATIVOS → inventario / consumo
 └── COTIZACIONES COMERCIALES → repuestos cotizados / mano de obra / otros
```

## Fuera de alcance

Pagos, facturación, WhatsApp, correo, PDF, aprobación parcial, impuestos, analytics de margen, reservas de inventario.
