# SOLVIX — FASE 3.15.12-A
## AUDITORÍA Y DISEÑO — MÓDULO DE REPORTES

**Tipo:** AUDITORÍA / DISEÑO (sin implementación del módulo)  
**Fecha:** 2026-10-05  
**Predecesora cerrada:** 3.15.11-C (Compras enriquecidas — PASS WITH RISKS)  
**Power BI:** fuera de alcance

---

## 1. Objetivo

Diseñar el módulo **Reportes** de SOLVIX reutilizando:

- Analytics Engine existente;
- listados/filtros de dominios comerciales;
- infraestructura PDF (`HtmlToPdfService` / OpenHTMLToPDF);
- Design System SOLVIX;
- autenticación JWT + rol `ADMIN`.

Convertir **datos + analytics** en **reportes operativos + analíticos + exportación**, sin duplicar reglas de negocio ni crear un segundo motor de métricas.

---

## 2. Estado actual

| Área | Estado |
|------|--------|
| Analytics Engine | Operativo (`/api/v1/analytics/*`, `/api/v1/dashboard/resumen`) |
| Dashboard FE | Implementado (KPIs, series Chart.js, ABC, top/bajo rendimiento, inventario, categorías) |
| Ruta Reportes FE | `comingSoon('reportes', …)` — placeholder |
| Export CSV/Excel | **No existe** infraestructura |
| PDF | Solo documentos de servicio técnico / cotización comercial vía plantillas HTML→PDF |
| Roles BD | `ADMIN`, `USUARIO` — APIs de negocio/analytics exigen `ADMIN` |
| Compras enriquecidas (IVA) | Cerrado 3.15.11; `Compra.total` nuevas puede incluir IVA |
| Datos locales auditados | ventas=6, compras=0, OT=18, cot. comercial=8, mov. inventario=16 |

---

## 3. Arquitectura existente

```
Angular (Dashboard / módulos operativos)
        │
        ▼
JWT + ROLE_ADMIN
        │
        ├─ /api/v1/dashboard/resumen     → DashboardAnalyticsService
        ├─ /api/v1/analytics/*           → Ventas / Producto / Categoría / Inventario / Compras
        ├─ /api/v1/ventas|compras|…      → servicios de dominio (CRUD + listados)
        └─ /api/v1/…/documentos/*/pdf    → HtmlToPdfService (OpenHTMLToPDF + PDFBox)
                │
                ▼
             MySQL (solarfishdb)
```

**Separación actual (a preservar):**

| Capa | Responsabilidad |
|------|-----------------|
| Dominio comercial | Operación, snapshots, costos históricos, estados |
| Analytics Engine | Fórmulas, KPIs, `EstadoMetrica`, agregaciones |
| Frontend Dashboard | Presentación rápida; **no** redefine márgenes/costos |
| PDF | Documentos transaccionales (OT/cotización), no reportes |

---

## 4. Analytics Engine auditado

### 4.1 Componentes

| Pieza | Ubicación |
|-------|-----------|
| Controller | `AnalyticsController` (`/api/v1/analytics`) |
| Dashboard | `DashboardController` (`/api/v1/dashboard`) |
| Servicios | `VentasAnalyticsService`, `ProductoAnalyticsService`, `CategoriaAnalyticsService`, `InventarioAnalyticsService`, `ComprasAnalyticsService`, `DashboardAnalyticsService` |
| Aritmética | `CalculoAnalytics` (scale 2 HALF_UP dinero; null en división por cero) |
| Periodo | `PeriodoAnalitico` + zona `solvix.analytics.zona-horaria=America/Bogota` |
| Repos | `*AnalyticsRepository` (JPQL agregado) |

### 4.2 Endpoints reales (no inventados)

| Método | Path | Salida |
|--------|------|--------|
| GET | `/api/v1/dashboard/resumen` | `DashboardResumenDTO` (+ comparativa) |
| GET | `/api/v1/analytics/ventas` | `SerieTemporalDTO` |
| GET | `/api/v1/analytics/productos/top` | `ProductoRankingDTO[]` |
| GET | `/api/v1/analytics/productos/bajo-rendimiento` | `ProductoBajoRendimientoDTO[]` |
| GET | `/api/v1/analytics/productos/rentables` | `ProductoRankingDTO[]` |
| GET | `/api/v1/analytics/categorias` | `CategoriaAnalyticsDTO[]` |
| GET | `/api/v1/analytics/inventario` | `InventarioKpiDTO` |
| GET | `/api/v1/analytics/inventario/abc` | `AnalisisABCDTO` |
| GET | `/api/v1/analytics/compras` | `CompraAnalyticsDTO` |

Filtros analytics comunes: `desde`, `hasta`, `agrupacion` (`DIA|SEMANA|MES|ANIO`), `limite`, `criterio`, `categoriaCodigo`, `proveedorId`, `umbralStockCritico`.

### 4.3 Métricas con fórmula (backend = fuente de verdad)

**Ventas**

```
ventasNetas   = ventasBrutas - devoluciones
costoVentas   = costoLíneasVendidas - costoLíneasDevueltas   // DetalleVenta histórico
gananciaBruta = ventasNetas - costoVentas
margenBruto   = gananciaBruta / ventasNetas × 100
ticket        = ventasNetas / pedidos
```

Estados que cuentan: `EstadoVenta.esVentaRealizada()`.

**Compras**

```
comprasNetas = comprasBrutas - devolucionesDeCompra
```

`comprasBrutas = SUM(Compra.total)` en estados `esCompraRealizada()`.  
**Ambigüedad IVA:** tras 3.15.11, `Compra.total` nuevas = subtotal − descuento + impuesto; históricos sin IVA. Analytics **no** desglosa subtotal/descuento/IVA.

**Inventario**

- stock / valorización / turnover / sell-through / días inventario / stock crítico  
- costos desde movimientos/históricos; `EstadoMetrica.COSTO_INCOMPLETO` / `SIN_HISTORIAL_SUFICIENTE`

**Producto / categoría**

- ranking por unidades / ingresos / ganancia / margen  
- ABC  
- bajo rendimiento  
- participación por categoría  

### 4.4 Qué NO existe en Analytics (gaps)

| Gap | Evidencia |
|-----|-----------|
| Analytics de servicios / OT | Sin servicio ni endpoint |
| Analytics de cotizaciones (comercial o servicio) | Sin agregación de conversión |
| Ventas por cliente | Sin ranking/agregado; solo listado `GET /ventas?clienteId=` |
| Compras: desglose IVA / descuento / subtotal | Solo `total` |
| Compras pendientes vs completadas como KPI | Solo vía listado operativo `estado=` |
| Report API / export | Sin dominio Reportes |

### 4.5 Frontend vs backend

- Dashboard Angular **consume** analytics; formatea y grafica (Chart.js).  
- No se halló segundo motor de margen/costo en FE.  
- Vistas de compras (`compra-gasto-*`) reutilizan `CompraAnalyticsDTO` — patrón a seguir en Reportes.

---

## 5. Fuentes de datos

### 5.1 Tablas relevantes (MySQL `solarfishdb`)

| Dominio | Tablas |
|---------|--------|
| Ventas | `ventas`, `detalle_venta`, `devoluciones_venta`, `detalle_devolucion_venta` |
| Compras | `compras`, `detalle_compra`, `devoluciones_compra`, `detalle_devolucion_compra`, `contactos_proveedor` |
| Inventario | `movimientos_inventario`, `ajustes_costo_producto`, `productos` |
| Catálogo | `productos`, `categorias_producto` |
| Clientes / Proveedores | `clientes`, `proveedores` |
| Servicios | `ordenes_servicio`, `historial_estado_orden_servicio`, `cotizaciones_servicio`, `detalles_cotizacion_servicio`, `documentos_orden_servicio`, `equipos`, `entregas_orden_servicio`, `recepciones_orden_servicio`, `orden_servicio_repuestos` |
| Cot. comercial | `cotizaciones_comerciales`, `detalles_cotizacion_comercial`, `documentos_cotizacion_comercial` |
| Auth | `usuarios`, `roles` |
| Secuencias | `secuencias_documento` |

Campos históricos críticos: costos en detalle venta/compra; snapshots proveedor en compra; totales congelados; estados.

### 5.2 Listados operativos reutilizables

| Recurso | Endpoint | Filtros actuales |
|---------|----------|------------------|
| Ventas | `GET /api/v1/ventas` | q, clienteId, estado, desde, hasta, página, tamaño |
| Compras | `GET /api/v1/compras` | proveedorId, estado, desde, hasta (**sin paginación**) |
| Devoluciones venta | `GET /api/v1/devoluciones-venta` | filtros de periodo/estado en servicio |
| Devoluciones compra | `GET /api/v1/devoluciones-compra` | idem |
| Inventario movimientos | `GET /api/v1/inventario/movimientos` | productoId, tipo, desde, hasta (**lista completa**) |
| Productos | `GET /api/v1/productos` | activo, etc. |
| Clientes | `GET /api/v1/clientes` | |
| Proveedores | `GET /api/v1/proveedores` | |
| OT | `GET /api/v1/ordenes-servicio` | q, clienteId, equipoId, estado, página |
| Cot. comercial | `GET /api/v1/cotizaciones-comerciales` | q, estado, clienteId, página |

---

## 6. Inventario de reportes posibles

Leyenda: **D** = disponible · **P** = parcialmente · **N** = no disponible · **C** = requiere contrato nuevo · **M** = requiere métrica nueva

### Ventas

| Reporte | Estado | Base |
|---------|--------|------|
| Ventas por período | **D** | `/analytics/ventas` + dashboard resumen |
| Evolución temporal | **D** | serie + Chart.js ya en dashboard |
| Ventas por producto | **D** | `/analytics/productos/top` |
| Ventas por categoría | **D** | `/analytics/categorias` |
| Productos rentables / margen | **D** | `/analytics/productos/rentables` |
| Bajo rendimiento | **D** | `/analytics/productos/bajo-rendimiento` |
| Devoluciones de venta | **P** | listado operativo + KPI devoluciones en resumen; falta reporte analítico dedicado |
| Ventas por estado | **P** | listado `estado=`; sin serie agregada por estado |
| Ventas por cliente | **P/C** | listado filtrable; falta ranking/agregado analytics |

### Compras

| Reporte | Estado | Base |
|---------|--------|------|
| Compras por período | **D** | `/analytics/compras` (serie) |
| Compras por proveedor | **D** | `gastoPorProveedor` |
| Compras por producto | **D** | `productosComprados` |
| Devoluciones compra | **D/P** | monto en analytics + listado |
| Compras completadas / pendientes | **P** | listado `estado=`; no KPI analytics |
| IVA / descuentos | **N/M** | datos en cabecera compra; analytics no desglosa |
| Documento externo / OC | **P** | solo detalle operativo compra |

### Inventario

| Reporte | Estado | Base |
|---------|--------|------|
| KPIs stock / valorización / turnover | **D** | `/analytics/inventario` |
| ABC | **D** | `/analytics/inventario/abc` |
| Stock crítico | **D** | KPI + productos listado |
| Movimientos / entradas / salidas / ajustes | **P** | `GET /inventario/movimientos` (sin agregación ni paginación) |
| Costos / ajustes de costo | **P** | listado ajustes costo + política último costo |

### Servicios

| Reporte | Estado | Base |
|---------|--------|------|
| OT por estado / período | **P/C** | listado paginado; sin analytics ni filtro fecha nativo en listar |
| OT completadas / canceladas | **P** | filtro `estado` |
| Cotizaciones de servicio | **P** | anidadas a OT; sin ranking global |
| Ingresos de servicio | **N/M** | requiere definir si cotización aprobada = ingreso y cómo se contabiliza |

### Clientes

| Reporte | Estado | Base |
|---------|--------|------|
| Clientes (maestro) | **P** | listado operativo |
| Ventas por cliente | **P/C** | ver ventas |
| Servicios por cliente | **P** | OT `clienteId=` |
| Nuevos / recurrentes | **N/M** | sin métrica de recurrencia |

### Proveedores

| Reporte | Estado | Base |
|---------|--------|------|
| Gasto / participación | **D** | analytics compras |
| Productos comprados | **D** | analytics |
| Devoluciones | **D/P** | analytics + listado |
| Costos unitarios históricos | **P** | detalle compra (no agregado) |

### Cotizaciones comerciales

| Reporte | Estado | Base |
|---------|--------|------|
| Por estado (creada/presentada/aprobada/…) | **P** | listado `estado=` |
| Conversión | **N/M** | falta definición y métrica (aprobadas/presentadas, etc.) |

---

## 7. Matriz de reportes

| Reporte | Fuente | Endpoint actual | Analytics existente | Falta |
|---------|--------|-----------------|---------------------|-------|
| Ventas por período / evolución | ventas + devoluciones | `/analytics/ventas`, `/dashboard/resumen` | Serie + KPIs | UI Reportes + export |
| Ventas por producto | detalle_venta | `/analytics/productos/top\|rentables` | Ranking | UI + export |
| Ventas por categoría | detalle_venta | `/analytics/categorias` | Sí | UI + export |
| Ventas por cliente | ventas | `/ventas?clienteId=` | No | Agregado analytics o contrato Report |
| Devoluciones venta | devoluciones_venta | listado + KPI dashboard | Parcial | Reporte dedicado opcional |
| Compras período / proveedor / producto | compras | `/analytics/compras` | Sí | UI Reportes + export |
| Compras por estado | compras | `/compras?estado=` | No | Agregación o vista operativa |
| IVA / descuento compras | compras | detalle compra | No | Métrica nueva (desglose) |
| Inventario KPIs / ABC | movimientos + productos | `/analytics/inventario*` | Sí | UI Reportes + export |
| Movimientos inventario | movimientos_inventario | `/inventario/movimientos` | No | Paginación + agregados opcionales |
| OT por estado | ordenes_servicio | `/ordenes-servicio` | No | Analytics servicios + fechas |
| Cotizaciones comerciales | cotizaciones_comerciales | listado | No | Métricas conversión |
| Ingresos servicio | cotizaciones_servicio / OT | parcial por OT | No | Contrato económico |

---

## 8. Filtros

### Globales (varios reportes)

| Filtro | Soporte actual |
|--------|----------------|
| Fecha desde / hasta | Analytics + ventas/compras/movimientos |
| Agrupación temporal | Analytics (`Agrupacion`) |
| Producto | Movimientos; rankings vía categoría |
| Categoría | `/productos/top?categoriaCodigo=` |
| Proveedor | `/analytics/compras?proveedorId=` |
| Cliente | Ventas / OT / cot. comercial listados |
| Estado | Ventas, compras, OT, cotizaciones |

### Específicos

| Filtro | Dónde |
|--------|-------|
| Criterio ranking (UNIDADES/INGRESOS/GANANCIA/MARGEN) | Productos analytics |
| Umbral stock crítico | Inventario analytics |
| Tipo movimiento inventario | Movimientos |
| Equipo | OT |
| Usuario (`createdBy`) | Campos existen; **sin filtro API** estándar |

**No implementar filtros en 12-A.** En 12-B reutilizar params existentes; no inventar query params sin contrato.

---

## 9. Exportación

| Formato | Infra actual | Recomendación 12-B |
|--------|--------------|--------------------|
| **PDF** | `HtmlToPdfService` + plantillas classpath + OpenHTMLToPDF/PDFBox | Reutilizar para reportes “imprimibles” (resumen + tabla). Nuevas plantillas bajo `templates/documentos/reportes/` sin cambiar el motor. |
| **CSV** | No hay dependencia | Generar `text/csv` en backend (sin libs nuevas). Ideal para Excel-compatible inmediato. |
| **Excel (.xlsx)** | No hay Apache POI ni similar en `pom.xml` | **No instalar** en 12-B salvo decisión explícita. Diferir o usar CSV. |

**Principio:** el exportador **no recalcula** métricas; serializa DTOs ya calculados por Analytics / filas operativas.

---

## 10. Permisos

| Rol BD | Uso actual |
|--------|------------|
| `ADMIN` | Todos los controllers comerciales, analytics, dashboard, documentos |
| `USUARIO` | Existe; no autoriza APIs de negocio auditadas |

**Reportes (propuesta):** `@PreAuthorize("hasRole('ADMIN')")` — mismo criterio.  
**No** crear roles financieros/inventario nuevos en 12-B.  
Frontend: `adminGuard` (ruta `reportes` hoy placeholder).

---

## 11. Históricos

Reglas obligatorias para Reportes:

1. Costos desde líneas (`DetalleVenta` / `DetalleCompra` / movimientos), **nunca** reconstruir con `Producto.costoActual`.
2. Nombres/documentos de proveedor desde snapshots de compra cuando el reporte sea histórico de compra.
3. Totales de documentos no se recalculan al exportar.
4. Respetar `EstadoMetrica` (`COSTO_INCOMPLETO`, etc.) en lugar de inventar ceros.

---

## 12. Rendimiento

| Riesgo | Evidencia | Nota |
|--------|-----------|------|
| Listado compras sin página | `CompraController.listar` → `List` | Reportes de detalle deben paginar o limitar |
| Movimientos inventario sin página | `List` completa | Peligroso con histórico grande |
| Analytics agrega en BD | JPQL `SUM/COUNT/GROUP BY` | Adecuado para KPI; OK reutilizar |
| Sin vistas materializadas / ETL | Intencional | No crear en 12-B |
| Índices | `idx_compras_num_doc_ext` y PKs/FKs | Suficiente para volumen actual; monitorear por fecha/estado |

No optimizar anticipadamente. Si un reporte de detalle crece, paginar en contrato Report.

---

## 13. UX

### Dashboard vs Reportes

| | Dashboard | Reportes |
|--|-----------|----------|
| Pregunta | ¿Qué está pasando? | ¿De dónde salió? |
| Profundidad | Resumen | Filtros + detalle + export |
| Duplicación | Evitar clonar widgets sin filtros/export |

### Navegación propuesta (sin implementar)

```
Reportes
├── (Hub) catálogo de reportes
├── Ventas
├── Compras
├── Inventario
├── Servicios        ← fase posterior si no hay métricas
├── Clientes         ← parcial / enlaces a operativos
├── Proveedores
└── Cotizaciones     ← parcial
```

**Elección UX para 12-B:** pantalla **hub** + **subrutas por dominio** (no tabs masivos). Cantidad real de reportes “D” justifica hub; servicios/cotizaciones aparecen como “próximamente” o vistas operativas enlazadas hasta existir métricas.

### Estructura de cada reporte

1. **Resumen** — KPIs (`solvix-metric-card`)  
2. **Detalle** — tabla  
3. **Análisis** — gráfico solo si responde pregunta (reutilizar Chart.js del dashboard)  
4. **Acción** — export CSV / PDF / ir al detalle operativo  

### Responsive

| Breakpoint | Estrategia |
|------------|------------|
| Desktop | Filtros horizontales + tabla + gráfico |
| Tablet | Filtros en 2 columnas; tabla scroll |
| Mobile | KPIs + filtros colapsables; tabla compacta (columnas prioritarias); sin forzar 15 columnas |

### Design System

Reutilizar: `solvix-page-header`, `solvix-card`, `solvix-button`, `solvix-badge`, `solvix-metric-card`, `solvix-section-header`, `solvix-loading-state`, `solvix-empty-state`, `solvix-error-state`.  
Feedback: `SolvixFeedbackService`. Sin segunda identidad visual.

---

## 14. Arquitectura propuesta

```
Angular Reportes (hub + vistas)
        │  filtros / presentación / export trigger
        ▼
Report API  (capa delgada, NUEVA en 12-B)
        │  orquesta, no redefine fórmulas
        ├─► Analytics Engine (métricas)
        ├─► Servicios de dominio (detalle operativo paginado)
        └─► ReportExportService (CSV / PDF plantilla)
                │
                ▼
             MySQL
```

### Responsabilidades

| Capa | Hace | No hace |
|------|------|---------|
| **Analytics** | Métricas, fórmulas, estados | PDF/CSV, layout |
| **Report API** | Selección de reporte, filtros, empaquetado DTO de reporte, export | Recalcular margen/IVA |
| **Angular Reportes** | UI, filtros, tablas, gráficos, disparar export | Fórmulas comerciales |
| **Dominio** | Datos operativos / históricos | Report layout |

### Contratos conceptuales (para 12-B — no implementados aquí)

Ejemplos de shape (orientativos):

- `GET /api/v1/reportes/ventas/resumen?desde&hasta&agrupacion` → reutiliza serie + totales  
- `GET /api/v1/reportes/compras/resumen?desde&hasta&proveedorId` → reutiliza `CompraAnalyticsDTO`  
- `GET /api/v1/reportes/inventario/resumen?desde&hasta` → reutiliza `InventarioKpiDTO` + ABC opcional  
- `GET /api/v1/reportes/{codigo}/export.csv?…`  
- `GET /api/v1/reportes/{codigo}/export.pdf?…`  

Alternativa válida: que 12-B **no** cree Report API aún y consuma analytics directo desde FE + export mínimo backend; documentado como decisión de alcance en §19.

---

## 15. No Goals

- Power BI / Azure BI / ETL / data warehouse  
- Cuentas por pagar, pagos, facturación electrónica, ERP  
- Rediseño del Analytics Engine  
- Nuevos roles  
- Dashboard completamente nuevo  
- Materialized views / tablas de reporting  
- Instalar POI/Excel sin decisión explícita  
- Cambios de dominio comercial (ventas/compras/OT)  
- Resolver todos los gaps de métricas en una sola fase

---

## 16. Gaps

| ID | Gap | Impacto | Resolución sugerida |
|----|-----|---------|---------------------|
| G1 | Sin módulo/ruta Reportes | Bloquea UX | 12-B hub + subrutas |
| G2 | Sin export CSV/PDF de reportes | Bloquea “acción” | Export CSV primero; PDF con plantillas |
| G3 | Sin analytics servicios | Reportes OT débiles | Fase posterior o reportes operativos listado |
| G4 | Sin ventas por cliente agregadas | Reporte cliente incompleto | Nuevo query analytics o agregación Report |
| G5 | IVA compras no desglosado en analytics | Ambigüedad “gasto” vs base | Documentar semántica; métrica opcional futura |
| G6 | Listados compras/movimientos sin página | Riesgo performance | Paginación al construir detalle |
| G7 | Cotizaciones sin conversión | Solo operativo | Definir métrica luego |
| G8 | Filtro usuario/createdBy ausente | Auditoría débil | Fuera de 12-B salvo necesidad |

---

## 17. Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Duplicar Analytics en Angular/Report | Alto | Regla: solo presentar DTOs existentes |
| `Compra.total` con IVA mezcla semántica de gasto | Medio | Etiquetar “total documento”; no llamar “base gravable” sin desglose |
| Export que recalcula | Alto | Export = serialización |
| Movimientos/compras sin página | Medio | Limitar periodos; paginar en 12-B |
| Expectativa Power BI | Bajo | Comunicar NO-GOAL |
| Permisos futuros multi-rol | Bajo | Hoy solo ADMIN; no inventar roles |
| Históricos rotos por usar costo actual | Alto | Reutilizar Analytics/repos que ya usan histórico |

---

## 18. Criterios de aceptación (12-A)

| Criterio | Estado |
|----------|--------|
| Analytics Engine auditado | OK |
| Servicios/endpoints auditados | OK |
| Frontend dashboard/rutas auditados | OK |
| PDF auditado | OK (`HtmlToPdfService`) |
| Modelo de datos auditado | OK |
| Matriz reporte→fuente→contrato→disponibilidad | OK (§6–7) |
| Arquitectura propuesta documentada | OK (§14) |
| Responsabilidades Analytics vs Reportes | OK |
| Scope sí / parcial / no | OK |
| Riesgos documentados | OK |
| Documento `FASE_3_15_12_A_AUDITORIA_REPORTES.md` | OK |
| Sin implementación del módulo completo | OK |

---

## 19. Propuesta de 3.15.12-B

### Alcance recomendado (MVP)

Implementar **solo** reportes con contrato analytics **completo (D)**:

1. **Hub Reportes** (reemplaza `comingSoon`)  
2. **Reporte Ventas** — KPIs + serie + top productos + categorías (reusa analytics)  
3. **Reporte Compras** — KPIs + serie + gasto proveedor + productos (reusa `/analytics/compras`)  
4. **Reporte Inventario** — KPIs + ABC (reusa analytics)  
5. **Export CSV** de las tablas/KPIs del reporte activo  
6. **PDF opcional** de resumen (plantilla HTML→PDF existente) si el esfuerzo cabe  
7. Permisos `ADMIN`  
8. Design System + estados loading/empty/error  

### Fuera de 12-B (posterior)

- Analytics servicios / conversión cotizaciones  
- Desglose IVA compras en analytics  
- Ventas por cliente ranking (salvo extensión mínima justificada)  
- Excel nativo  
- Power BI  
- Paginación masiva de todo el dominio (solo donde el reporte lo exija)

### Decisión de arquitectura para 12-B

**Opción recomendada:** capa delgada `ReportesController` que **delega** a Analytics + export, sin nuevas fórmulas.  
Si se prefiere aún más delgado: FE llama analytics directo + endpoint único de export.

---

## 20. Estado final

**FASE 3.15.12-A — COMPLETA (auditoría/diseño)**

No se implementó el módulo Reportes.  
No se modificó Analytics Engine.  
No se alteró BD.  
No se inició 3.15.12-B.

### Entregables

1. Hallazgos (§2–5)  
2. Arquitectura propuesta (§14)  
3. Matriz de reportes (§6–7)  
4. Gaps (§16)  
5. Riesgos (§17)  
6. Recomendación de alcance 12-B (§19)

---

## Apéndice A — Diferencia Dashboard / Reportes (resumen)

- **Dashboard:** pulso del negocio.  
- **Reportes:** investigación con filtros, detalle y exportación.  
No clonar el dashboard dentro de Reportes sin añadir profundidad.

## Apéndice B — Semántica IVA en reportes de compras

| Campo compra | Uso en reportes |
|--------------|-----------------|
| `subtotal` | Base de líneas |
| `descuento` | Descuento cabecera |
| `impuestoTotal` | IVA documento (0 en legacy) |
| `total` | Usado hoy por Analytics como `comprasBrutas` |

Hasta exista métrica de desglose, el reporte de compras debe etiquetar el KPI como **total de compras (documento)** y no como “base sin IVA”.

FIN DE FASE 3.15.12-A
