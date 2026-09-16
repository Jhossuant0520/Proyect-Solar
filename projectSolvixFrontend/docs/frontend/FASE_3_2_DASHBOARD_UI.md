# SOLVIX — FASE 3.2
## Dashboard visual (UI)

**Proyecto:** `projectSolvixFrontend`  
**Estado documentado:** estructura visual del dashboard vigente en código  
**Fecha de documentación:** 2026-09-11

---

### 1. Objetivo

Definir la presentación del Dashboard administrativo: composición de secciones, KPIs, gráficas, estados visuales e identidad SOLVIX, de modo que un usuario no técnico entienda el negocio y un usuario técnico pueda profundizar.

Principio rector: **SOLVIX no simplifica la ingeniería. SOLVIX simplifica la forma de entenderla.**

Esta fase fija el “cómo se ve y se organiza” el dashboard. La conexión completa a Analytics se documenta en FASE 3.3.

---

### 2. Alcance

**Incluido**

- Estructura de pantalla del dashboard
- Header de período
- Cards de KPI
- Evolución de ventas (Chart.js)
- Top productos / bajo rendimiento
- Categorías
- Salud de inventario
- Análisis ABC
- Insights de negocio
- Formatters y estados visuales de sección
- Identidad dark / glass / glow controlado

**Fuera de alcance (histórico → resuelto en 3.3)**

- Contratos finales y mapeo DTO → UI de producción
- Reglas de cálculo de métricas (siempre backend)

**Nota de estado real:** la carpeta `dashboard/mocks/` existe vacía. El dashboard en runtime **no** usa mocks; consume APIs (ver FASE 3.3). Esta fase documenta la capa visual que permanece.

---

### 3. Rutas

| URL | Componente | Guards | Propósito |
|-----|------------|--------|-----------|
| `/dashboard` | `DashboardComponent` | `authGuard` (layout) | Panel de indicadores |

No usa `adminGuard`: usuarios autenticados no-admin pueden ver el dashboard (el backend decide qué datos entrega).

---

### 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `DashboardComponent` | Orquesta filtros, cargas y señales de secciones |
| `DashboardHeaderComponent` | Presets de período, fechas, refresh |
| `DashboardKpisComponent` | Grid de métricas principales |
| `SalesEvolutionComponent` | Gráfica temporal + selector de métrica/agrupación |
| `TopProductsComponent` | Ranking con criterio |
| `LowPerformanceProductsComponent` | Productos a revisar |
| `CategoryPerformanceComponent` | Participación por categoría |
| `InventoryHealthComponent` | KPIs de inventario |
| `AbcAnalysisComponent` | Resumen clases A/B/C |
| `BusinessInsightsComponent` | Insights accionables |
| `SectionStateComponent` | Wrapper loading / empty / error |

---

### 5. Servicios

En la capa visual se prepara el consumo de `AnalyticsService`. No se calculan métricas en Angular.

Utilidades de presentación:

- `dashboard-format.ts`
- `dashboard-period.ts`
- `dashboard-ui.scss`

---

### 6. Endpoints

La fase visual no define endpoints propios. Los endpoints reales del dashboard se documentan en **FASE 3.3**.

---

### 7. Flujo funcional (UI)

1. Usuario entra a `/dashboard`.
2. Header muestra período (por defecto mes).
3. Cada sección muestra loading → contenido o empty/error.
4. Controles de agrupación / criterio / métrica de gráfica cambian solo la presentación o disparan recargas parciales (detalle en 3.3).
5. Insights muestran recomendaciones con enlaces a módulos.

---

### 8. Estados y reglas

Estados visuales de sección (`SeccionEstado`):

- `ready` | `loading` | `empty` | `error`

Estados de métrica (texto/tono en UI, origen backend desde 3.3):

- `OK`, `VALOR_CERO`, `SIN_DATOS`, `COSTO_INCOMPLETO`, `SIN_BASE_DE_COMPARACION`, `SIN_VENTAS_RECIENTES`, `SIN_HISTORIAL_SUFICIENTE`

---

### 9. Responsabilidades

**FRONTEND**

- Composición, tipografía, jerarquía, formatters
- Progressive disclosure (dato → significado → contexto)
- Tooltips de ayuda en KPIs (`solvix-field-help`)

**BACKEND**

- Cálculo oficial de todas las métricas (FASE 3.3+)

---

### 10. Modelos / DTO / Mapper

Modelos de vista definidos en `dashboard.models.ts` (usados desde 3.2/3.3):

- `DashboardMetricVista`, `VentasSeriePunto`, `ProductoRankingVista`, `InventarioSaludVista`, `AbcClaseVista`, `InsightVista`, etc.

Formatters:

- `formatMoney` (compacto `M` para ≥ 1.000.000, locale `es-CO`)
- `formatPercent`, `formatRatio`, `formatQuantity`
- Labels/explicaciones de `EstadoMetrica`

---

### 11. Componentes compartidos reutilizados

- `solvix-metric-card`
- `solvix-section-header`
- `solvix-badge`
- `solvix-button`
- `solvix-loading-state` / `empty` / `error` (vía `SectionStateComponent`)
- `solvix-field-help`

---

### 12. Seguridad

- Ruta bajo layout con `authGuard`
- Endpoints de analytics protegidos en backend
- Sin `adminGuard` en `/dashboard`

---

### 13. Estados visuales

Cada bloque del dashboard puede mostrar:

- Loading (skeleton / label)
- Empty (sin datos del período)
- Error + reintentar
- Ready con badges de estado de métrica (costo incompleto, sin comparación, etc.)

---

### 14. Responsive / UX

- Grids de KPIs: 5 → 3 → 1 columnas
- Inventario: 4 → 2 → 1
- Copy empresarial sencillo en labels/hints/tooltips
- Moneda colombiana visible: `$410.000`, `$1,26 M`

---

### 15. Stitch / referencia visual

- `REFERENCE_code/DashboarPrincipal.cursorrules` — referencia de composición (adaptada, no copiada)

Paleta aplicada: `#020617`, `#0F172A`, `#4FD1FF`, `#38BDF8`, `#00E5FF`, `#94A3B8`, `#FFFFFF`.

---

### 16. Backend

Backend no modificado en esta fase de UI.

---

### 17. Limitaciones actuales

- Insights se derivan en cliente a partir de DTOs ya cargados (no hay endpoint dedicado de insights)
- Carpeta `mocks/` residual vacía
- Criterio ABC en UI fijo a `INGRESOS` al cargar

---

### 18. Validación

- Validado junto con build del frontend en fases posteriores
- Sin suite específica exclusiva de UI dashboard

---

### 19. Pendientes

- Selector de criterio ABC en UI
- Eliminar carpeta `mocks/` vacía o documentarla como histórica
- Más progressive disclosure en tablas densas

---

### 20. Archivos relevantes

```
src/app/features/panelAdmin/dashboard/dashboard.ts
src/app/features/panelAdmin/dashboard/dashboard.html
src/app/features/panelAdmin/dashboard/dashboard.scss
src/app/features/panelAdmin/dashboard/dashboard-ui.scss
src/app/features/panelAdmin/dashboard/models/dashboard.models.ts
src/app/features/panelAdmin/dashboard/utils/dashboard-format.ts
src/app/features/panelAdmin/dashboard/utils/dashboard-period.ts
src/app/features/panelAdmin/dashboard/components/*
REFERENCE_code/DashboarPrincipal.cursorrules
```
