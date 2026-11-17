# ETAPA 8H — Auditoría de selectores CSS y utilidades residuales SOLVIX

**Fecha:** 2026-11-05  
**Proyecto:** `computerElectronicFrontend`  
**Tipo:** inspección y planificación (sin migración)  
**Estado:** informe listo para aprobación; **no implementar** hasta orden explícita.

---

## 1. Resumen ejecutivo

Tras 8B–8G, el núcleo compartido (`Ce*` / `ce-*`, servicios neutrales, tokens canónicos, `ce-theme`, rules Cursor) está migrado. Persisten residuos `solvix-*` en tres capas distintas:

| Capa | Hallazgo | Riesgo de migración |
|------|----------|---------------------|
| **Selectores Angular de feature/layout** | **19** componentes con `selector: 'solvix-…'` + consumidores HTML | Medio–alto (coordinación multiarchivo; shell admin crítico) |
| **Animaciones `@keyframes solvix-*`** | **10** nombres (7 globales + 3 locales/duplicados) | Bajo–medio (solo SCSS; sin lógica TS) |
| **Clases CSS utilitarias / menú** | `.solvix-state`, `.solvix-table`, `.solvix-results-enter`, `.solvix-menu`, `.solvix-btn` | Bajo (varias sin consumidores HTML/TS) |
| **Duales de compatibilidad 8C** | `.solvix-mono`, `.solvix-dialog-*`, `.solvix-card-interactive` | Bajo para retiro: **0** consumidores en `app/**/*.{ts,html}` del nombre legacy |

**Exclusiones respetadas (no auditadas para retiro):** `DESIGN_CONSTITUTION.md`, docs históricas, Flyway, DB names, `solvix-theme` / lectura legacy, `--solvix-*` como fuente de valor, backend/JWT/CORS, componentes `Ce*` ya migrados.

**Conclusión:** la siguiente implementación debe ir por **grupos pequeños** (layout → dashboard → compras/dialogs → motion/utils → retiro de duales), con build + suite + smoke visual por grupo. No hay reemplazo masivo seguro.

---

## 2. Inventario de selectores residuales (Angular custom elements)

> Nota: estos son **selectores de componente Angular** (elementos custom), no clases CSS. Se documentan aquí porque fueron los ~19 residuales de 8F y bloquean la identidad técnica limpia.

Método: `rg "selector:\s*'solvix-"` + conteo de archivos que referencian cada tag.

| # | Selector | Declaración | Consumidores principales | Módulo | Archivos ~ | Dinámico | Estilos globales | Nombre propuesto | Clase |
|---|----------|-------------|--------------------------|--------|------------|----------|------------------|------------------|-------|
| 1 | `solvix-admin-layout` | `layout/admin-layout/admin-layout.ts` | `app.routes.ts` (componente de ruta; tag poco usado) | Layout | 1–2 | No | `admin-layout.scss` | `ce-admin-layout` | **B/C** |
| 2 | `solvix-admin-sidebar` | `admin-sidebar.ts` | `admin-layout.html` | Layout | 2 | No | `admin-sidebar.scss` | `ce-admin-sidebar` | **B/C** |
| 3 | `solvix-admin-topbar` | `admin-topbar.ts` | `admin-layout.html` | Layout | 2 | No | `admin-topbar.scss` | `ce-admin-topbar` | **B/C** |
| 4 | `solvix-dashboard-header` | `dashboard-header.ts` | `dashboard.html`, `analisis-shell.html`, `analisis-detallado.html` | Dashboard | 4 | No | local SCSS | `ce-dashboard-header` | **B** |
| 5 | `solvix-dashboard-date-field` | `dashboard-date-field.ts` | `dashboard-header.html` | Dashboard | 2 | No | local SCSS | `ce-dashboard-date-field` | **A/B** |
| 6 | `solvix-dashboard-kpis` | `dashboard-kpis.ts` | `dashboard.html` | Dashboard | 2 | No | local + keyframes | `ce-dashboard-kpis` | **B/C** |
| 7 | `solvix-section-state` | `section-state.ts` | 10+ widgets dashboard/compras | Dashboard shared | **11** | No | local | `ce-section-state` | **B** |
| 8 | `solvix-sales-evolution` | `sales-evolution.ts` | dashboard, analisis, reportes | Dashboard | 4 | No | local + `cssVar('--solvix-*')` charts | `ce-sales-evolution` | **B/C** |
| 9 | `solvix-top-products` | `top-products.ts` | analisis/productos, reportes | Dashboard | 3 | No | local | `ce-top-products` | **B** |
| 10 | `solvix-category-performance` | `category-performance.ts` | analisis/categorias, reportes | Dashboard | 3 | No | local | `ce-category-performance` | **B** |
| 11 | `solvix-abc-analysis` | `abc-analysis.ts` | analisis-abc, reportes | Dashboard | 3 | No | local | `ce-abc-analysis` | **B** |
| 12 | `solvix-inventory-health` | `inventory-health.ts` | analisis-inventario, reportes | Dashboard | 3 | No | local | `ce-inventory-health` | **B** |
| 13 | `solvix-low-performance-products` | `low-performance-products.ts` | analisis productos/inventario, reportes | Dashboard | 4 | No | local | `ce-low-performance-products` | **B** |
| 14 | `solvix-business-insights` | `business-insights.ts` | analisis-hub, reportes | Dashboard | 3 | No | local | `ce-business-insights` | **B** |
| 15 | `solvix-compra-gasto-evolution` | `compra-gasto-evolution.ts` | compra-list, analisis-abastecimiento | Compras | 3 | No | charts `cssVar('--solvix-*')` | `ce-compra-gasto-evolution` | **B/C** |
| 16 | `solvix-compra-gasto-proveedor` | `compra-gasto-proveedor.ts` | compra-list, analisis-abastecimiento | Compras | 3 | No | local | `ce-compra-gasto-proveedor` | **B** |
| 17 | `solvix-ajuste-costo-dialog` | `ajuste-costo-dialog.ts` | abierto vía `MatDialog.open(AjusteCostoDialogComponent)` | Producto/Inventario | 1 (selector) + 3 TS open | No (dialog por clase) | dialog SCSS | `ce-ajuste-costo-dialog` | **A** |
| 18 | `solvix-ajuste-unidades-dialog` | `ajuste-unidades-dialog.ts` | `MatDialog.open(AjusteUnidadesDialogComponent)` | Inventario | 1 + opens | No | dialog SCSS | `ce-ajuste-unidades-dialog` | **A** |
| 19 | `solvix-coming-soon` | `coming-soon.ts` | **Sin ruta** en `app.routes.ts` al momento de la auditoría | Admin | 1 | No | local | `ce-coming-soon` o retirar si muerto | **E** / verificar |

### Dinámicos / mecanismos especiales

- **Dialogs de ajuste:** el selector custom casi no aparece en HTML; el host lo crea Material. Migrar selector + specs/importes de clase basta (bajo acoplamiento HTML).
- **Charts** (`sales-evolution`, `compra-gasto-evolution`): leen `getComputedStyle` / `cssVar('--solvix-…')` con fallback hex. Fuera del alcance de “solo selector”, pero conviene alinear a `--color-*` en el mismo grupo (riesgo visual C).
- **No** se hallaron `classList.add('solvix-…')`, `ngClass` ni `panelClass: 'solvix-…'` activos para snack/dialog (ya migrados a `ce-*` en 8D/8C).

---

## 3. Inventario de animaciones

| Keyframe | Declaración | Referencias `animation` | Compartido | Nombre propuesto | Clase |
|----------|-------------|-------------------------|------------|------------------|-------|
| `solvix-page-enter` | `_motion.scss` | shell content, snack, `.solvix-state` | Global | `ce-page-enter` o `page-enter` | **A** |
| `solvix-fade-in` | `_motion.scss` | `.solvix-results-enter`, cotizacion-form-dialog | Global + feature | `ce-fade-in` / `fade-in` | **A/B** |
| `solvix-highlight-pulse` | `_motion.scss` | `.ce-context-highlight` | Global (highlight 8D) | `ce-highlight-pulse` | **A/C** (visual highlight) |
| `solvix-spin` | `_motion.scss` | `_buttons.scss` loading | Global | `ce-spin` / `spin` | **A** |
| `solvix-kpi-enter` | `_motion.scss` | `dashboard-kpis.scss` | Dashboard | `ce-kpi-enter` | **A** |
| `solvix-phase-flash` | `_motion.scss` | `ce-progress-fases.scss` | Shared Ce | `ce-phase-flash` | **A** |
| `solvix-shimmer` | `_motion.scss` **y** `ce-state.scss` (duplicado) | dashboard-kpis + ce-state skeleton | Duplicado | Unificar `ce-shimmer` | **B** |
| `solvix-connector-fill` | `ce-progress-fases.scss` | mismo archivo | Local Ce | `ce-connector-fill` | **A** |
| `solvix-estado-enter` | `servicio-detail.scss` | mismo archivo | Feature OT | `ce-estado-enter` / `ot-estado-enter` | **A** |

**Restricción de implementación:** no cambiar duración, easing, delay ni iteraciones; solo el identificador.

---

## 4. Inventario de utilidades / clases CSS residuales

| Clase | Dónde se declara | Consumidores HTML/TS | Tipo | Nombre propuesto | Clase |
|-------|------------------|----------------------|------|------------------|-------|
| `.solvix-state` | `_motion.scss` (+ reduced-motion) | **Ninguno** encontrado | Utilidad global huérfana | `.ce-state` o retirar | **E** |
| `.solvix-table` | `_motion.scss` (hover filas, junto a `.venta-table` etc.) | **Ninguno** con esa clase; tablas usan clases de dominio | Utilidad / alias | retirar o `.ce-table` | **E** |
| `.solvix-results-enter` | `_motion.scss` | **Ninguno** (sí `.resultados`) | Compat / huérfana | retirar o alias de `.resultados` | **E** |
| `.solvix-menu` | `_admin-ce.scss` + HTML menus OT/cotización | `servicio-detail.html`, `servicio-cotizaciones-panel.html` | Módulo servicios + overlay global | `.ce-menu` | **A/B** |
| `.solvix-btn` | solo `dashboard-header.scss` (`::ng-deep`) | **Sin** elementos con esa clase; el botón es `<ce-button>` | Estilo muerto | eliminar regla | **E** |
| `.solvix-page-header` | — | **0** hits | — | N/A (ya migrado a `ce-page-header` en 8C) | — |

---

## 5. Estado de las clases de compatibilidad (duales 8C)

| Legacy | Canónico | Consumidores legacy en `app/**/*.{ts,html}` | Consumidores canónicos | ¿Retirable? |
|--------|----------|---------------------------------------------|------------------------|-------------|
| `.solvix-mono` | `.ce-mono` | **0** | ~41 archivos / ~141 hits | Sí, tras grep final + smoke tipografía mono | **D→E** |
| `.solvix-dialog-panel` | `.ce-dialog-panel` | **0** en app (solo dual CSS global) | ~21 archivos / panelClass | Sí, si no hay overlays runtime legacy | **D→E** |
| `.solvix-dialog-backdrop` | `.ce-dialog-backdrop` | **0** app | ~19 | Igual | **D→E** |
| `.solvix-card-interactive` | `.ce-card-interactive` | **0** app | ~2 archivos | Sí | **D→E** |

Condiciones para retirar duales (futura subetapa, **no 8H implementación**):

1. `rg` sin hits en `src/app` ni `panelClass`/`backdropClass` legacy.  
2. Build + specs de dialogs/listados.  
3. Smoke: abrir diálogo Material, tipografía mono en OT, hover card listado.  
4. Mantener dual **una release** si hay riesgo de caché/CDN de builds antiguos (opcional política producto).

---

## 6. Dependencias y riesgos

| Riesgo | Detalle |
|--------|---------|
| Shell admin | Renombrar `solvix-admin-*` rompe plantilla del layout si no se actualiza en el mismo PR. |
| `solvix-section-state` | Hub con 11 archivos; omitir un consumidor deja pantallas en blanco. |
| Charts | `--solvix-*` en `cssVar` no es selector CSS; migrar con el grupo dashboard/compras para no dejar color “roto” en tests visuales. |
| Keyframes duplicados | `solvix-shimmer` en global y `ce-state`; renombrar uno solo deja el otro huérfano. |
| Dialogs Material | Selector custom irrelevante para `open()`, pero tests/e2e que busquen el tag fallarían. |
| Tokens `--solvix-*` | **Fuera de migración 8H CSS**; siguen como fuente de valor (8C/8E). |
| `solvix-theme` | **Exclusión obligatoria**; no tocar. |

---

## 7. Clasificación consolidada

Leyenda: **A** bajo riesgo · **B** varios consumidores · **C** necesita prueba visual/funcional · **D** conservar temporal dual · **E** sin uso / retirable tras verify.

| Elemento | Clasificación |
|----------|---------------|
| Dialogs ajuste costo/unidades (selector) | **A** |
| Keyframes locales (`connector-fill`, `estado-enter`) + spin/page-enter/fade/kpi/phase | **A** (highlight **C**) |
| `.solvix-menu` | **A/B** |
| Dashboard widgets + section-state | **B** (+ charts **C**) |
| Admin layout/sidebar/topbar | **B/C** |
| Duales mono/dialog/card | **D** (candidatos **E** tras verify) |
| `.solvix-state` / `.solvix-table` / `.solvix-results-enter` / `.solvix-btn` / `coming-soon` sin ruta | **E** (verificar) |
| `solvix-theme`, `--solvix-*` tokens | **D** / exclusión |

---

## 8. Plan propuesto para la implementación (post-aprobación)

Grupos verificables; un PR o commit por grupo si es posible.

1. **Grupo E — limpieza muerta**  
   Confirmar y retirar/actualizar: `.solvix-btn` huérfano, utilidades sin HTML, `coming-soon` (ruta o rename).  
   Gate: `rg` + unit tests afectados.

2. **Grupo A — keyframes + menú**  
   Renombrar `@keyframes` y refs `animation:`; `.solvix-menu` → `.ce-menu` en HTML + `_admin-ce`.  
   Gate: build + smoke botones loading + menús OT.

3. **Grupo Dialogs feature**  
   `solvix-ajuste-*` → `ce-ajuste-*`.  
   Gate: specs inventario/producto.

4. **Grupo Dashboard**  
   section-state + widgets + header/date/kpis; opcional alinear `cssVar` charts a `--color-*`.  
   Gate: specs dashboard + revisión visual KPIs/charts.

5. **Grupo Compras charts**  
   gasto-evolution / gasto-proveedor.  
   Gate: compra-list + analisis-abastecimiento.

6. **Grupo Layout shell**  
   admin-layout / sidebar / topbar (+ stacking spec).  
   Gate: suite layout + smoke navegación autenticada.

7. **Grupo Duales 8C**  
   Quitar `.solvix-mono|dialog*|card-interactive` de CSS global **solo** tras gates 1–6.  
   Gate: dialogs Material + listados + mono.

**Fuera de este plan:** tokens `--solvix-*`, `solvix-theme`, docs históricas, Flyway, Cursor rules (8G hecho).

---

## 9. Matriz de pruebas recomendadas

| Área | Prueba |
|------|--------|
| Unit | Specs de cada componente renombrado; `admin-topbar.stacking`; dialogs ajuste; theme (no romper legacy key) |
| Suite | `ng test --no-watch` (baseline 8F: 485 SUCCESS) |
| Build | `ng build --configuration=production` |
| Visual / smoke | Login → shell (sidebar/topbar) → dashboard KPIs/charts → analisis hubs → compra list charts → OT menú acciones → abrir diálogo Material → snack/highlight |
| Regresión tokens | Tema light/dark/`system`; FOUC `index.html` vs `ThemeService` |
| Búsqueda | `rg "selector:\s*'solvix-"` → 0 al cerrar grupos 3–6; `rg "\.solvix-(mono|dialog|card)"` → 0 al cerrar grupo 7 |

---

## 10. Criterios de aceptación (para la futura implementación)

- Cero selectores Angular `solvix-*` en features/layout migrados según plan aprobado.  
- Keyframes y `animation` sin prefijo `solvix-` (o documentados si se deja alguno temporal).  
- Utilidades huérfanas retiradas o renombradas con evidencia de `rg`.  
- Duales de compatibilidad retirados **solo** con evidencia de cero consumidores.  
- Sin cambios a `solvix-theme`, `--solvix-*` value source, backend, ni `DESIGN_CONSTITUTION.md`.  
- Build producción OK; suite unitaria sin nuevas fallas atribuibles.  
- Sin regresión visual material en shell, dashboard y dialogs.

---

## 11. Validación de esta etapa (8H auditoría)

| Comprobación | Resultado |
|--------------|-----------|
| Código Angular / SCSS de app modificado | **No** (solo creado este informe) |
| Clases eliminadas | **No** |
| Comportamiento runtime alterado | **No** |
| Informe | `docs/auditorias/ETAPA_8H_AUDITORIA_CSS_RESIDUAL.md` |

### Búsquedas / comandos usados

```text
rg -n "@keyframes\s+solvix-" -g "*.{scss,css}" src
rg -n "animation:[^;]*solvix-" -g "*.{scss,css}" src
rg -n "selector:\s*'solvix-" -g "*.ts" src
rg -n "(^|[,\s{>+~])\.solvix-[\w-]+" -g "*.{scss,css}" src
rg -n "solvix-(mono|dialog|card-interactive|state|table|menu|btn|results)" -g "*.{ts,html,scss}" src
rg -l <selector> -g "*.{ts,html}" src   # conteo por componente
rg -c ce-mono|ce-dialog-panel|…          # contraste duales vs canónicos
```

---

## 12. Próximo paso

**No iniciar la migración** hasta aprobación explícita de este informe.  
Tras aprobación, ejecutar el plan por grupos (sección 8) como etapa de implementación (p. ej. 8H-impl / 8I, según nomenclatura del proyecto).
