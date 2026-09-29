# SOLVIX Backend — BLOQUE A
## Listado de productos sin costo

**Fecha:** 2026-09-27

### Cambio

`GET /api/v1/productos` responde con `ProductoListadoResponseDTO` (sin `costoActual` / `costoConocido`).

El detalle `GET /api/v1/productos/{id}` y las mutaciones siguen usando `ProductoResponseDTO` completo.

El porcentaje de recargo **no** se modela en BD: es herramienta de UI en el frontend.

### Test

`ProductoBusquedaServiceTest.listadoSinCostoDetalleConCosto`
