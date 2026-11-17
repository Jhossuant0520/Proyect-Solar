# ETAPA 8H-1 — Limpieza controlada de residuos CSS y componentes sin uso

**Fecha:** 2026-11-09  
**Referencia:** `docs/auditorias/ETAPA_8H_AUDITORIA_CSS_RESIDUAL.md`  
**Alcance:** solo elementos demostrablemente obsoletos (Grupo E).  
**Estado:** cerrado. No se inició Grupo A ni migraciones de selectores Angular.

---

## 1. Elementos revisados

| Elemento | Verificación | Resultado |
|----------|--------------|-----------|
| `.solvix-btn` | Solo en `dashboard-header.scss` (`::ng-deep`); UI usa `<ce-button>`. Sin `classList`/`ngClass`. Tokens `--solvix-btn-tech-*` **no** son esta clase. | Obsoleto |
| `.solvix-state` | Solo declaraciones en `_motion.scss` (+ reduced-motion). Sin HTML/TS. | Obsoleto |
| `.solvix-table` | Solo en lista de selectores de filas en `_motion.scss`. Tablas reales usan `.venta-table`, `.svc-table`, etc. | Obsoleto |
| `.solvix-results-enter` | Solo dual con `.resultados` en `_motion.scss`. Sin HTML/TS. `.resultados` sí se usa. | Obsoleto (solo el alias) |
| `solvix-coming-soon` / `ComingSoonPage` | Un único archivo; sin `app.routes.ts`, sin imports TS/HTML, sin specs. Docs históricas mencionan el placeholder (no tocadas). | Obsoleto |

Búsquedas dinámicas (`classList.add/remove/toggle/contains` con esos nombres): **0** hits.

---

## 2. Evidencia post-eliminación (`rg` en `src/`)

```text
solvix-btn(?!-tech)     → 0
\.solvix-state          → 0
\.solvix-table          → 0
solvix-results-enter    → 0
solvix-coming-soon      → 0
ComingSoonPage          → 0
```

Tokens `--solvix-btn-tech-*` y duales `.solvix-mono|dialog|card-interactive` **conservados** (fuera de alcance).

---

## 3. Elementos eliminados

| Elemento | Acción |
|----------|--------|
| `.solvix-btn` | Quitado del selector `::ng-deep` en `dashboard-header.scss` (queda `button`) |
| `.solvix-state` | Bloque CSS + entrada en `prefers-reduced-motion` eliminados |
| `.solvix-table` | Quitado de la lista de filas de tabla (resto intacto) |
| `.solvix-results-enter` | Quitado; `.resultados` conserva la animación |
| `coming-soon.ts` + carpeta | Eliminados |

---

## 4. Elementos conservados (justificación)

| Elemento | Motivo |
|----------|--------|
| 19 selectores Angular `solvix-*` | Fuera de 8H-1 |
| `@keyframes solvix-*` | Fuera de 8H-1 (Grupo A) |
| `.solvix-menu` | Tiene consumidores HTML |
| Duales mono/dialog/card | Compatibilidad 8C; retiro en subetapa posterior |
| `--solvix-*` / `solvix-theme` | Exclusión obligatoria |
| Docs históricas que citan coming-soon | Documentación histórica; no modificar |
| `.resultados`, tablas de dominio | Siguen en uso |

---

## 5. Archivos modificados / eliminados

**Modificados**
- `src/styles/_motion.scss`
- `src/app/features/panelAdmin/dashboard/components/dashboard-header/dashboard-header.scss`

**Eliminados**
- `src/app/features/admin/coming-soon/coming-soon.ts`
- carpeta `src/app/features/admin/coming-soon/`

**Documentación**
- `docs/auditorias/ETAPA_8H_IMPLEMENTACION.md` (este archivo)

---

## 6. Resultados de pruebas

| Suite | Resultado |
|-------|-----------|
| Specs relacionados (`admin-topbar.stacking`) | **2/2 SUCCESS** |
| Suite completa `ng test --no-watch` | **485 SUCCESS / 0 FAILED** |

Línea base 8F: **485 SUCCESS** — sin regresión.

---

## 7. Build

`ng build --configuration=production` — **OK** (bundle generado en `dist/computerElectronicFrontend`).

---

## 8. Deuda técnica restante (post 8H-1; actualizada en §8H-2)

1. ~~Grupo A: keyframes `solvix-*` + `.solvix-menu`~~ → cerrado en **8H-2**
2. Dialogs `solvix-ajuste-*`
3. Dashboard widgets / `solvix-section-state`
4. Compras charts
5. Layout `solvix-admin-*`
6. Retiro duales `.solvix-mono|dialog*|card-interactive`
7. Tokens `--solvix-*` y `solvix-theme` (exclusiones)

---

# ETAPA 8H-2 — Migración de keyframes y clase de menú

**Fecha:** 2026-11-09  
**Referencia:** `docs/auditorias/ETAPA_8H_AUDITORIA_CSS_RESIDUAL.md`  
**Alcance:** renombrar `@keyframes solvix-*` → `ce-*` y `.solvix-menu` → `.ce-menu` sin cambiar comportamiento.  
**Estado:** cerrado. No se iniciaron dialogs, dashboard widgets, compras, layout admin ni duales.

---

## 8H-2.1 Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/styles/_motion.scss` | Keyframes globales + referencias `animation` |
| `src/styles/_buttons.scss` | `ce-spin` |
| `src/styles/_admin-ce.scss` | `.solvix-menu` → `.ce-menu` |
| `src/app/shared/components/ce-progress-fases/ce-progress-fases.scss` | `ce-connector-fill`, `ce-phase-flash` |
| `src/app/shared/components/ce-state/ce-state.scss` | `ce-shimmer` (uso) + unificación |
| `src/app/features/panelAdmin/servicios/servicio-detail/servicio-detail.scss` | `ce-estado-enter` |
| `src/app/features/panelAdmin/servicios/servicio-detail/servicio-detail.html` | `class="ce-menu …"` |
| `src/app/features/panelAdmin/servicios/servicio-cotizaciones-panel/servicio-cotizaciones-panel.html` | `class="ce-menu …"` |
| `src/app/features/panelAdmin/servicios/servicio-cotizaciones-panel/cotizacion-form-dialog/cotizacion-form-dialog.scss` | `ce-fade-in` |
| `src/app/features/panelAdmin/dashboard/components/dashboard-kpis/dashboard-kpis.scss` | `ce-kpi-enter`, `ce-shimmer` |
| `docs/auditorias/ETAPA_8H_IMPLEMENTACION.md` | Esta sección |

Sin cambios TypeScript: no había referencias dinámicas a `.solvix-menu` ni a nombres de keyframes.

---

## 8H-2.2 Keyframes migrados

| Antes | Después | Ubicación principal |
|-------|---------|---------------------|
| `solvix-page-enter` | `ce-page-enter` | `_motion.scss` |
| `solvix-fade-in` | `ce-fade-in` | `_motion.scss` (+ uso en cotización dialog) |
| `solvix-highlight-pulse` | `ce-highlight-pulse` | `_motion.scss` |
| `solvix-spin` | `ce-spin` | `_motion.scss` / `_buttons.scss` |
| `solvix-kpi-enter` | `ce-kpi-enter` | `_motion.scss` / `dashboard-kpis.scss` |
| `solvix-phase-flash` | `ce-phase-flash` | `_motion.scss` / `ce-progress-fases.scss` |
| `solvix-shimmer` | `ce-shimmer` | `_motion.scss` (canónico) |
| `solvix-connector-fill` | `ce-connector-fill` | `ce-progress-fases.scss` |
| `solvix-estado-enter` | `ce-estado-enter` | `servicio-detail.scss` |

Duración, easing, delay, iteration, direction, fill-mode y `prefers-reduced-motion`: **sin cambios**. Sin aliases permanentes `solvix-*`.

---

## 8H-2.3 Tratamiento de `solvix-shimmer` / `ce-shimmer`

Había dos `@keyframes` equivalentes (`background-position: 100% → -100%`):

1. Global en `_motion.scss`
2. Local en `ce-state.scss`

**Decisión:** unificar. Queda **una sola** definición canónica `@keyframes ce-shimmer` en `styles/_motion.scss`. En `ce-state.scss` se eliminó la declaración duplicada; el componente sigue usando `animation: ce-shimmer …`.

---

## 8H-2.4 Consumidores `.solvix-menu` → `.ce-menu`

| Archivo | Rol |
|---------|-----|
| `src/styles/_admin-ce.scss` | Selector `.ce-menu.mat-mdc-menu-panel` (+ descendientes) |
| `servicio-detail.html` | `#menuMasAcciones` |
| `servicio-cotizaciones-panel.html` | `#menuVigente` |

Estilos, z-index, sombras y apertura/cierre: **sin cambios**.

---

## 8H-2.5 Búsquedas de residuos (`src/`)

```text
@keyframes solvix-* / animation … solvix-* / animation-name: solvix-*  → 0
solvix-menu                                                        → 0
@keyframes ce-shimmer                                              → 1 (_motion.scss)
ce-menu (SCSS + HTML)                                              → 3 hits esperados
```

Exclusiones intactas: 19 selectores Angular `solvix-*`, duales `.solvix-mono|dialog*|card-interactive`, `--solvix-*`, `solvix-theme`.

---

## 8H-2.6 Pruebas

| Suite | Resultado |
|-------|-----------|
| Specs relacionados (progress-fases, button, dashboard-kpis, servicio-detail, cotizaciones) | **45 SUCCESS** |
| Suite completa `ng test --no-watch` | **485 SUCCESS / 0 FAILED** |

Línea base 8F / 8H-1: **485 SUCCESS** — sin regresión.

---

## 8H-2.7 Build

`ng build --configuration=production` — **OK** (`dist/computerElectronicFrontend`).

---

## 8H-2.8 Smoke visual/funcional

**Pendiente — no ejecutado en esta subetapa.** No se levantó la app ni se verificaron animaciones/menús/temas en navegador.

Checklist sugerido para cuando se ejecute:

- Entrada de página, fade-in, highlight de contexto, spinner de botones
- Entrada de KPIs, progreso de fases, skeleton/shimmer, transición de estado
- Menús de acciones (detalle de servicio y cotizaciones)
- Tema claro y oscuro

---

## 8H-2.9 Deuda técnica restante

1. Dialogs `solvix-ajuste-*`
2. Dashboard widgets / `solvix-section-state`
3. Compras charts
4. Layout `solvix-admin-*`
5. Retiro duales `.solvix-mono|dialog*|card-interactive`
6. Tokens `--solvix-*` y `solvix-theme` (exclusiones)
7. Smoke visual 8H-2 (pendiente)

**Siguiente paso:** esperar aprobación explícita antes de cualquier subetapa posterior (dialogs, dashboard, compras, layout o duales).
