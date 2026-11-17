# SOLVIX — FASE 3.15.12-B.1
## Report API & CSV Export Engine (Backend)

**Tipo:** IMPLEMENTACIÓN BACKEND  
**Base:** `FASE_3_15_12_A_AUDITORIA_REPORTES.md`  
**Fecha:** 2026-10-05

---

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `controller/.../ReportesContro/ReportesController.java` | Endpoints `/api/v1/reportes/*` |
| `service/.../ReportesService/ReportesService.java` | Orquestación delgada → Analytics |
| `service/.../ReportesService/ReportCsvExportService.java` | Motor CSV + BOM UTF-8 |
| `dtos/.../ReportesDtos/ReporteVentasResumenDTO.java` | Empaque KPIs + serie |
| `dtos/.../ReportesDtos/ReporteInventarioResumenDTO.java` | Empaque KPIs + ABC |
| `test/.../ReportCsvExportServiceTest.java` | BOM, cabeceras, escape |
| `test/.../ReportesControllerTest.java` | 200 ADMIN / 403 USUARIO+anon / CSV headers |

**Zero-touch:** Analytics Engine, frontend Angular y workflows comerciales **no** modificados.

---

## Diseño CSV / memoria

1. Analytics ya devuelve agregados (series diarias/mensuales, rankings), no el detalle operativo masivo.
2. `ReportCsvExportService.toCsv` escribe con `PrintWriter` → `ByteArrayOutputStream` + BOM al inicio.
3. No se carga el dominio fila-a-fila de ventas/compras históricas para export MVP.
4. Sin Apache POI / OpenCSV (nativo JDK).

---

## Endpoints

Base: `/api/v1/reportes` · `@PreAuthorize("hasRole('ADMIN')")`

| Método | Ruta | Query params | Respuesta |
|--------|------|--------------|-----------|
| GET | `/ventas/resumen` | `desde`, `hasta`, `agrupacion` | `ReporteVentasResumenDTO` |
| GET | `/ventas/exportar` | idem | `text/csv` → `ventas.csv` |
| GET | `/compras/resumen` | `desde`, `hasta`, `agrupacion`, `proveedorId` | `CompraAnalyticsDTO` |
| GET | `/compras/exportar` | idem | `text/csv` → `compras.csv` |
| GET | `/inventario/resumen` | `desde`, `hasta`, `umbralStockCritico`, `criterio`, `incluirAbc` (default true) | `ReporteInventarioResumenDTO` |
| GET | `/inventario/exportar` | idem | `text/csv` → `inventario.csv` |

Headers export:

- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="…"`

---

## Tests ejecutados

```bat
mvn clean "-Dtest=ReportCsvExportServiceTest,ReportesControllerTest,CompraServiceTest,DevolucionCompraServiceTest,InventarioComprasAnalyticsServiceTest" test
```

| Suite | Run | Fail | Error |
|-------|-----|------|-------|
| ReportesControllerTest | 7 | 0 | 0 |
| ReportCsvExportServiceTest | 3 | 0 | 0 |
| CompraServiceTest | 11 | 0 | 0 |
| DevolucionCompraServiceTest | 16 | 0 | 0 |
| InventarioComprasAnalyticsServiceTest | 17 | 0 | 0 |
| **Total** | **54** | **0** | **0** |

**BUILD SUCCESS**

FIN 3.15.12-B.1
