# SOLVIX — FASE 3.15.12-C
## Validación, QA y cierre — Reportes MVP

**Tipo:** AUDITORÍA / QA (Evidence over Confidence)  
**Base:** FASE 3.15.12-B.1 + B.2  
**Fecha:** 2026-10-05  
**Estado del módulo:** **PASS WITH RISKS**

---

## 1. Misión 1 — Seguridad (pruebas reales)

| Caso | Endpoint | Resultado evidenciado |
|------|----------|------------------------|
| ADMIN + autenticado | `GET /api/v1/reportes/ventas/resumen` | **HTTP 200** (`ReportesControllerTest.ventasResumenAdmin`) |
| USUARIO + autenticado | `GET /api/v1/reportes/ventas/resumen` | **HTTP 403** (`ventasResumenUsuario`) |
| USUARIO + autenticado | `GET /api/v1/reportes/compras/exportar` | **HTTP 403** (`comprasExportUsuarioForbidden`) |
| Sin token | `GET /api/v1/reportes/ventas/resumen` | **HTTP 401** (`ventasResumenSinJwt`) |
| Token inválido/expirado | `GET /api/v1/reportes/ventas/resumen` + `Authorization: Bearer …` | **HTTP 401** (`ventasResumenTokenInvalido`) |

### Corrección aplicada (crítica)

Antes, Spring Security sin `AuthenticationEntryPoint` devolvía **403** a anónimos (convención previa del proyecto).  
Se configuró en `SecurityConfig`:

- sin autenticación → **401 Unauthorized**
- autenticado sin permiso (`@PreAuthorize`) → **403 Forbidden**

Tests de catálogo/imagen actualizados en consecuencia (`CatalogoControllerSecurityTest`, `ProductoImagenControllerTest`).

**Comando de evidencia:**

```text
mvn -q "-Dtest=ReportesControllerTest,ReportesConsistenciaTest,ReportCsvExportServiceTest,CatalogoControllerSecurityTest,ProductoImagenControllerTest" test
→ BUILD SUCCESS
```

---

## 2. Misión 2 — Consistencia KPI vs detalle / CSV

### Ventas

- Mismo `PeriodoAnalitico` para KPIs (`DashboardAnalyticsService`) y serie (`VentasAnalyticsService`).
- CSV generado desde el mismo `ReporteVentasResumenDTO` que el resumen JSON.
- **Evidencia:** `ReportesConsistenciaTest.ventasKpiIgualSumaSerie`
  - `Σ serie.ventas == kpis.ventasBrutas`
  - `Σ serie.devoluciones == kpis.devoluciones`
  - `Σ serie.ventasNetas == kpis.ventasNetas`
  - `Σ serie.ganancia == kpis.gananciaBruta`
  - `Σ serie.pedidos == kpis.pedidos`
  - CSV contiene el total KPI y cabecera de detalle.

### Compras

- Sin filtro: `Σ gastoPorProveedor.{brutas,devoluciones,netas,ordenes} == KPIs`  
  (`comprasKpiIgualSumaProveedores`).
- **Bug detectado:** con `proveedorId`, Analytics filtraba solo `gastoPorProveedor` y dejaba KPIs/serie/productos globales → KPI ≠ detalle.
- **Corrección:** `ReportesService.alinearKpisComprasConDetalleProveedor`:
  - KPI = suma del detalle filtrado (sin reinventar fórmulas de negocio).
  - `participacion` recalculada sobre el total filtrado.
  - `productosComprados` y `serie` → listas vacías (Analytics no soporta esos breakdowns por proveedor; omitir evita inconsistencia).
- **Evidencia:** `comprasConFiltroProveedorKpiAlineado`.

### Inventario

- KPIs y ABC son métricas de naturaleza distinta (stock/turnover vs ranking ABC).  
  No aplica “suma de filas ABC = stockTotal”. CSV serializa el mismo DTO del resumen.

**¿KPI y detalle coinciden 100% en el alcance Reportes?**  
**Sí**, tras la realineación de compras filtradas. Ver riesgos residuales abajo.

---

## 3. Misión 3 — Robustez CSV

| Aspecto | Decisión / evidencia |
|---------|---------------------|
| BOM UTF-8 | `EF BB BF` / carácter `\uFEFF` al inicio (`ReportCsvExportService`, tests unitarios + export controller) |
| **Separador oficial** | **`;` (punto y coma)** — Excel LATAM (es-CO / es-MX / etc.) |
| Escape | Campos con `;`, `,`, `"`, `\n`, `\r` entre comillas; `"` → `""` |
| Locale Excel es-* | Apertura directa con columnas separadas (hotfix post 3.15.12-C) |

Evidencia: `ReportCsvExportServiceTest` (`casoNormalSeparadorPuntoYComa`, `escapeSeparadorYSaltosEnFila`).

---

## 4. Archivos tocados (solo lo necesario)

| Archivo | Motivo |
|---------|--------|
| `security/SecurityConfig.java` | Entry point 401 / AccessDenied 403 |
| `ReportesService.java` | Alinear KPI compras con filtro proveedor |
| `ReportCsvExportService.java` | Documentar contrato CSV |
| `ReportesControllerTest.java` | 200 / 403 / 401 |
| `ReportesConsistenciaTest.java` | Regla de oro KPI = detalle |
| `ReportCsvExportServiceTest.java` | BOM + escape |
| `CatalogoControllerSecurityTest.java` | 401 anónimo + assertion listado sin costo |
| `ProductoImagenControllerTest.java` | 401 anónimo |
| `docs/backend/FASE_3_15_12_C_VALIDACION.md` | Este reporte |

**Zero-touch respetado:** sin nuevos dominios de reporte, sin rediseño UI, sin cambios al Analytics Engine (corrección solo en capa Reportes).

---

## 5. Riesgos residuales (PASS WITH RISKS)

1. **Compras + `proveedorId`:** el FE no recibirá `productosComprados` ni `serie` en ese modo (listas vacías a propósito). La UI debe tolerarlo; ampliar Analytics quedaría fuera de 3.15.12-C.
2. **CSV con coma vs Excel regional es-CO:** puede requerir asistente de importación; no se cambió a `;` para no romper locales US/RFC.
3. **Cambio global de 401:** afecta toda la API protegida (correcto REST; tests de seguridad de productos alineados). Clientes que interpretaban 403=“no autenticado” deben tratar 401.
4. **Inventario ABC:** no es reconciliable numéricamente contra KPIs de stock (diseño Analytics, no defecto Reportes).

---

## 6. Declaración final

```text
MÓDULO REPORTES MVP — FASE 3.15.12-C
ESTADO: PASS WITH RISKS
Seguridad 200/403/401: CONFIRMADO
Consistencia KPI↔detalle/CSV: CONFIRMADO (con realineación compras filtradas)
CSV BOM + separador ',' + escape: CONFIRMADO
```
