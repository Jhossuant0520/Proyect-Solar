# SOLVIX — FASE 3.3
## Dashboard conectado a Analytics (API)

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** dashboard en producción local consumiendo APIs reales  
**Fecha de documentación:** 2026-09-11

---

### 1. Objetivo

Conectar el Dashboard visual (FASE 3.2) con el motor de Analytics del backend, manteniendo una separación estricta:

- **Backend** calcula métricas, estados de calidad y series
- **Angular** mapea DTO → modelos de UI, formatea y presenta

---

### 2. Alcance

**Incluido**

- Consumo de endpoints de dashboard/analytics
- Mapper DTO → vista
- Manejo de `EstadoMetrica`
- Loading / empty / error por sección
- Series temporales, rankings, categorías, inventario, ABC
- Períodos y fechas ISO de consulta
- Insights derivados de resumen + inventario
- KPIs reutilizados en lista de ventas (mismo `mapKpis`)

**Fuera de alcance**

- Recalcular ganancia, margen, turnover, ABC en frontend
- Inventar endpoints o estados

---

### 3. Rutas

| URL | Componente | Guards | Propósito |
|-----|------------|--------|-----------|
| `/dashboard` | `DashboardComponent` | `authGuard` | Dashboard conectado |

---

### 4. Componentes

Los mismos de FASE 3.2, ahora alimentados por datos reales:

- `DashboardComponent` — `loadAll()` paralelo con control de carrera (`requestId`, `ventasSeq`, `topSeq`)
- Secciones hijas reciben señales / inputs ya mapeados

---

### 5. Servicios

| Servicio | Rol |
|----------|-----|
| `AnalyticsService` | Única puerta HTTP del dashboard |
| Utilidades `dashboard-mapper`, `dashboard-format`, `dashboard-period` | Presentación |

---

### 6. Endpoints

Base: `http://localhost:8080`

| Método | Endpoint | Propósito | Parámetros | Cuándo |
|--------|----------|-----------|------------|--------|
| `GET` | `/api/v1/dashboard/resumen` | KPIs + comparativa | `desde`, `hasta` | Carga / cambio de período |
| `GET` | `/api/v1/analytics/ventas` | Serie temporal | `desde`, `hasta`, `agrupacion` | Carga / agrupación |
| `GET` | `/api/v1/analytics/productos/top` | Ranking | `desde`, `hasta`, `criterio`, `limite` | Carga / criterio |
| `GET` | `/api/v1/analytics/productos/bajo-rendimiento` | Revisión | `desde`, `hasta`, `limite` | Carga período |
| `GET` | `/api/v1/analytics/categorias` | Categorías | `desde`, `hasta` | Carga período |
| `GET` | `/api/v1/analytics/inventario` | Salud inventario | `desde`, `hasta` | Carga período |
| `GET` | `/api/v1/analytics/inventario/abc` | ABC | `desde`, `hasta`, `criterio` | Carga período |

Fechas enviadas: `YYYY-MM-DDT00:00:00` / `YYYY-MM-DDT23:59:59` vía `toQueryDesde` / `toQueryHasta`.

`GET /api/v1/analytics/compras` existe en el servicio pero **no** lo usa el dashboard (sí Compras, FASE 3.6).

---

### 7. Flujo funcional

1. Usuario elige período (hoy / semana / mes / año / personalizado).
2. `DashboardComponent.loadAll()` dispara en paralelo las llamadas de Analytics.
3. Cada respuesta pasa por `mapKpis` / `mapSerie` / `mapRanking` / etc.
4. Si una sección falla, solo esa sección entra en `error` (reintento local).
5. Cuando resumen e inventario están listos, `mapInsights` genera tarjetas (costo incompleto, líneas sin costo, etc.).
6. Cambio de agrupación recarga solo ventas; cambio de criterio recarga solo top.
7. El selector de métrica de la gráfica (`ventas`, `devoluciones`, `ventasNetas`, `ganancia`) filtra series **ya cargadas** (sin nueva petición).

---

### 8. Estados y reglas

`EstadoMetrica` (backend → UI):

| Estado | Presentación típica |
|--------|---------------------|
| `OK` | Valor + comparación si aplica |
| `VALOR_CERO` | Cero formateado |
| `SIN_DATOS` | Label “Sin datos” |
| `COSTO_INCOMPLETO` | Warning; puede mostrar valor parcial o label |
| `SIN_BASE_DE_COMPARACION` | “Sin comparación” + explicación |
| `SIN_VENTAS_RECIENTES` | Label dedicado |
| `SIN_HISTORIAL_SUFICIENTE` | Label dedicado |

Angular **no** inventa reglas nuevas: solo traduce estados recibidos.

---

### 9. Responsabilidades

**FRONTEND**

- Presentación y formateo
- Mapeo DTO → `*Vista`
- Validación de rango de fechas en UI
- Orquestación de cargas parciales

**BACKEND**

- Fórmulas oficiales (ventas netas, ganancia, margen, ticket, turnover, sell-through, ABC…)
- Estados de calidad de métrica
- Comparativas de período
- Autorización de analytics

---

### 10. Modelos / DTO / Mapper

**DTOs** (`core/models/analytics.models.ts`):  
`DashboardResumenDTO`, `SerieTemporalDTO`, `ProductoRankingDTO`, `ProductoBajoRendimientoDTO`, `CategoriaAnalyticsDTO`, `InventarioKpiDTO`, `AnalisisABCDTO`, `VariacionDTO`, etc.

**Mapper** (`dashboard-mapper.ts`):

| Función | Entrada → Salida |
|---------|------------------|
| `mapKpis` | Resumen → `DashboardMetricVista[]` |
| `mapSerie` | Serie → `VentasSeriePunto[]` |
| `mapRanking` | Top → `ProductoRankingVista[]` |
| `mapRevision` | Bajo rendimiento → `ProductoRevisionVista[]` |
| `mapCategorias` | Categorías → `CategoriaVista[]` |
| `mapInventario` | Inventario KPI → `InventarioSaludVista` |
| `mapAbcClases` | ABC → conteos/participación A/B/C |
| `mapInsights` | Resumen + inventario → `InsightVista[]` |

KPIs de ventas expuestos al usuario (copy UX):

- Ventas netas, Ganancia bruta, Pedidos, Margen bruto, Ticket promedio  
(con `hint` + `help` para lenguaje empresarial)

---

### 11. Componentes compartidos reutilizados

- `solvix-metric-card` (help, statusNote, variation)
- `solvix-field-help`
- `solvix-badge`
- `SectionStateComponent` + estados SOLVIX

---

### 12. Seguridad

- Layout autenticado
- JWT en interceptor
- Backend exige rol adecuado en analytics (ADMIN típico)
- Usuario no-admin puede abrir `/dashboard`, pero las APIs pueden responder 403 → sección en error

---

### 13. Estados visuales

- Loading por sección
- Empty cuando el backend no trae puntos/listas
- Error + Reintentar
- Badges de costo incompleto / sin comparación
- Insights con prioridad visual

---

### 14. Responsive / UX

- Misma grilla responsive de 3.2
- Tooltips de KPI: “qué significa” vs descripción “qué es el número”
- Inventario: distingue dinero invertido (costo actual) vs rotación (histórico)

---

### 15. Stitch / referencia visual

- `REFERENCE_code/DashboarPrincipal.cursorrules` como referencia de jerarquía
- Adaptación a componentes Angular + Chart.js (no HTML literal)

---

### 16. Backend

Backend no modificado en esta fase de frontend.  
Se consumen contratos ya existentes del motor Analytics.

---

### 17. Limitaciones actuales

- Sin endpoint de insights: se arman en cliente con reglas de presentación
- ABC siempre se pide con criterio `INGRESOS` desde `loadAbc`
- Sin paginación en rankings (usa `limite` del API, default 10)
- Carpeta `dashboard/mocks/` vacía residual

---

### 18. Validación

- `npm run build` OK en validaciones posteriores del panel
- Specs de dashboard usan stubs de `AnalyticsService` (no mocks de negocio en runtime)

---

### 19. Pendientes

- UI para cambiar criterio ABC
- Endpoint opcional de insights si se quiere centralizar reglas
- Comparativas más ricas si el backend las expande

---

### 20. Archivos relevantes

```
src/app/core/services/analytics.service.ts
src/app/core/models/analytics.models.ts
src/app/features/panelAdmin/dashboard/dashboard.ts
src/app/features/panelAdmin/dashboard/utils/dashboard-mapper.ts
src/app/features/panelAdmin/dashboard/utils/dashboard-format.ts
src/app/features/panelAdmin/dashboard/utils/dashboard-period.ts
src/app/features/panelAdmin/dashboard/models/dashboard.models.ts
src/app/features/panelAdmin/dashboard/components/*
```
