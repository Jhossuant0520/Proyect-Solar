# CORRECCIÓN — Regresión visual Computer & Electronic (panel admin)

**Fecha:** 2026-11-17  
**Referencia:** `docs/auditorias/AUDITORIA_REGRESION_VISUAL_COMPUTER_ELECTRONIC.md`  
**Estado:** corrección P0/P1 aplicada y validada (tokens + Playwright + suite + build).  
**Respaldo previo:** `docs/auditorias/backups/pre-fix-visual-20261117-113643/`

---

## 1. Causa raíz

Mixin `ce-admin-semantic-aliases` en `src/styles/_admin-ce.scss` definía aliases circulares:

```scss
--color-bg: var(--color-bg); /* inválido en cascada */
```

Los `--solvix-*` C&E del `.admin-shell` seguían correctos, pero los consumidores `--color-*` quedaban vacíos → superficies transparentes, wash ausente, tipografía Inter, pill activo invisible.

---

## 2. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/styles/_admin-ce.scss` | Mixin reescrito: `--color-*` / `--ce-*` / tipografía / sombras / btn-tech → `--solvix-*` |
| `src/styles/_theme-light.scss` | Refuerzo del indicator activo; fallbacks en `.metric` |
| `src/styles/admin-ce-tokens.spec.ts` | **Nuevo** — pruebas de valores efectivos light/dark |
| `docs/auditorias/CORRECCION_REGRESION_VISUAL_COMPUTER_ELECTRONIC.md` | Este informe |

**No modificados:** ThemeService, FOUC, backend, API, selectores Angular `solvix-*`, duales de compatibilidad, `DESIGN_CONSTITUTION.md`, homepage/login tokens globales Stitch.

**Respaldo:** `_admin-ce.scss`, `_theme-light.scss`, `_tokens.scss`, layout sidebar/topbar/shell.

---

## 3. Tokens corregidos

El mixin ahora mapea (sin autorreferencias), entre otros:

- Superficies: `--color-bg`, `--color-surface-*`, `--color-panel*`
- Texto: `--color-text-*`, `--color-on-*`
- Acentos: `--color-primary*`, `--color-secondary`, `--ce-neon`, `--ce-deep`, `--ce-glow`
- Bordes / focus / overlay / estados (success/warning/danger/info + soft)
- Chrome: `--shadow*`, `--topbar-bg`, `--select-panel-bg`, `--snack-surface-*`, `--btn-tech-*`
- Tipo: `--font-sans` → `--solvix-font` (Space Grotesk), `--font-mono`
- Radios / focus-ring

Dialogs admin (`.ce-dialog-panel` / `.solvix-dialog-panel`) reutilizan el mismo mixin.

---

## 4. Valores efectivos por tema (runtime Playwright)

### Light (`.admin-shell`)

| Token | Valor medido |
|-------|----------------|
| `--color-bg` | `#f4f8fc` |
| `--color-surface-1` | `#ffffff` |
| `--color-primary` | `#006194` |
| `--color-primary-soft` | `#cce5ff` |
| `--color-border` | `#d7e3f0` |
| `--color-text-primary` | `#131b2e` |
| `--ce-deep` | `#004b73` |
| `--ce-neon` | `#006194` |
| `--font-sans` | Space Grotesk… |
| `background` shell | `rgb(244, 248, 252)` |
| sidebar | `rgb(255, 255, 255)` |
| KPI `.metric` | `rgb(255, 255, 255)` + borde `#d7e3f0` |

### Dark (`.admin-shell`)

| Token | Valor medido |
|-------|----------------|
| `--color-bg` | `#0b1520` |
| `--color-primary` | `#5eb3e0` |
| shell / sidebar / metric | superficies C&E opacas |
| ≠ root SOLVIX | primary ≠ `#4fd1ff`, bg ≠ `#020617` |

---

## 5. Recuperación tipográfica

- `--font-sans: var(--solvix-font)` en el shell (Space Grotesk ya cargada en `index.html`).
- Verificado en shell, sidebar, topbar, KPIs y módulos: `fontFamily` incluye `Space Grotesk`.
- Homepage/login siguen con tipografía global (Inter/Geist vía `:root`); no se alteró su capa.

---

## 6. Superficies y bordes

Recuperado vía tokens:

- Fondo panel `#f4f8fc` / dark `#0b1520`
- Cards/KPI blancas (o surface oscura) con borde `#d7e3f0`
- Wash superior `linear-gradient` con `primary-soft`
- Topbar `rgba(255,255,255,0.92)` + borde
- Búsqueda con fondo `surface-2` y borde

---

## 7. Sidebar y topbar

- Sidebar blanco + divisores de grupo.
- Pill activo: `.admin-sidebar__indicator` con `primary-soft` + inset primary (opacity 1 en rutas con nav activa).
- `_theme-light.scss` mantiene enlace activo transparente (el pill lo pinta el indicator) y refuerza estilos del indicator.
- Topbar, búsqueda, avatar y tipografía restaurados.

---

## 8. Tablas y formularios

Sin cambios locales de módulo: al restaurar tokens, listados con `<table>` (clientes, cotizaciones, servicios, proveedores, cxp, inventario, productos) recuperan encabezados/bordes/hover que dependen de `--color-*`.

Formularios/inputs del shell heredan focus/borde/texto vía tokens globales del admin.

Dialogs admin siguen el mixin corregido (overlays fuera del shell).

---

## 9. Estado por módulo (Playwright real)

Todos abiertos en light 1366×768; tokens shell OK + captura:

| Módulo | Ruta | Resultado |
|--------|------|-----------|
| Dashboard | `/dashboard` | OK + light/dark + tablet/móvil |
| Clientes | `/clientes` | OK (tabla) |
| Cotizaciones | `/cotizaciones` | OK (tabla) |
| Servicios | `/servicios` | OK (KPI + tabla) light/dark |
| Ventas | `/ventas` | OK |
| Proveedores | `/proveedores` | OK (tabla) |
| Compras | `/compras` | OK |
| Cuentas por pagar | `/cxp` | OK (tabla) |
| Inventario | `/inventario` | OK (tabla) |
| Productos | `/productos` | OK (tabla) |
| Analytics | `/dashboard/analisis` | OK |
| Reportes | `/reportes` | OK |
| Configuración / cuenta | `/mi-cuenta` | OK (indicator opacity 0: sin ítem nav activo) |

**Sin ruta admin dedicada en `app.routes.ts`:** Usuarios/roles y Documentos (documentos viven en detalle de servicio). Shell compartido ya validado; pantallas específicas no abiertas.

---

## 10. Capturas antes / después

### Antes (regresión)

- `docs/auditorias/evidence/regresion-dashboard-light.png`
- `docs/auditorias/evidence/regresion-servicios-light.png`

### Después

- `despues-dashboard-light-1366.png` / `despues-dashboard-dark-1366.png`
- `despues-servicios-light-1366.png` / `despues-servicios-dark-1366.png`
- `despues-*-light-1366.png` (resto de módulos)
- `despues-dashboard-light-tablet.png` / `despues-dashboard-light-mobile.png`

---

## 11. Resultados de pruebas

| Suite | Resultado |
|-------|-----------|
| `admin-ce-tokens.spec.ts` | **3 SUCCESS** |
| `ng test --no-watch` | **488 SUCCESS / 0 FAILED** |

Línea base previa: **485**. Diferencia: **+3** specs nuevos de tokens (sin regresiones).

---

## 12. Build

`ng build --configuration=production` — **OK**  
Salida: `dist/computerElectronicFrontend`

---

## 13. Pendientes visuales

1. Abrir dialogs Material en cada módulo (mixin corregido; smoke puntual pendiente).
2. Módulo Documentos embebido en detalle de OT (no hay ruta top-level).
3. Usuarios/roles: sin ruta en el router actual.
4. Revisión fina de charts/compras en dark con datos reales.
5. Decisión de producto aparte: default ThemeService `dark` vs preferencia operativa light (no cambiado a propósito).

---

## 14. Riesgos residuales

| Riesgo | Estado |
|--------|--------|
| Ciclo de aliases | Mitigado + tests de valor efectivo |
| Overrides `!important` en `_theme-light` | Conservados con fallbacks en `.metric` |
| Overlays fuera del shell | Cubiertos por mixin en dialog panels; menús usan fallback tipográfico |
| Homepage Stitch vs admin C&E | Aislamiento por `.admin-shell` mantenido |
| Frontend mayormente untracked en Git | Respaldo en `docs/auditorias/backups/...` |

---

## 15. Criterios de aceptación

- [x] Sin autorreferencias en `ce-admin-semantic-aliases`
- [x] `--color-bg` / `--color-primary` resuelven en `.admin-shell`
- [x] Superficies opacas; cards con borde; wash visible
- [x] Space Grotesk en admin
- [x] Pill activo del sidebar visible
- [x] Topbar diferenciado
- [x] Light y dark C&E (no neón SOLVIX en shell)
- [x] Módulos principales validados en Playwright
- [x] Suite 488 + build producción OK

**Detenido.** Esperar revisión humana antes de k6 u otras migraciones 8H.
