# SOLVIX — FASE 3.15.12-B.2
## Frontend Hub de Reportes + CSV Blob

**Fecha:** 2026-10-05  
**Backend:** sin cambios (consume 3.15.12-B.1)

## Rutas (`adminGuard`)

| Path | Componente |
|------|------------|
| `/reportes` | `ReportesHubComponent` |
| `/reportes/ventas` | `ReporteVentasComponent` |
| `/reportes/compras` | `ReporteComprasComponent` |
| `/reportes/inventario` | `ReporteInventarioComponent` |

## Archivos

- `core/models/reportes.models.ts`
- `core/services/reportes.service.ts` (JSON + `responseType: 'blob'` + `descargarBlobComoArchivo`)
- `features/panelAdmin/reportes/**`

## Descarga CSV con JWT

`HttpClient.get(..., { responseType: 'blob' })` → interceptor adjunta Bearer → `URL.createObjectURL` + `<a download>` (sin `window.open` a la API).

## Build

`npx ng build --configuration=production` → **SUCCESS** (warning budget preexistente).

FIN 3.15.12-B.2
