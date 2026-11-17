# AUDITORÍA — Regresión visual del panel administrativo Computer & Electronic

**Fecha:** 2026-11-17  
**Tipo:** solo lectura (sin correcciones de código)  
**App inspeccionada:** `http://localhost:4200` (`ng serve` activo)  
**Estado:** causa raíz principal **confirmada con evidencia runtime**; correcciones pendientes de aprobación.

---

## 1. Resumen ejecutivo

El panel administrativo **sí conserva la paleta C&E prevista** en variables `--solvix-*` dentro de `.admin-shell` (`#f4f8fc`, `#006194`, `#cce5ff`, etc.), pero **los consumidores canónicos `--color-*` quedan inválidos** por un ciclo CSS en el mixin `ce-admin-semantic-aliases` de `src/styles/_admin-ce.scss`.

Efecto observable en **todos los módulos** del shell:

- Fondos de shell, sidebar y cards transparentes o “planos”.
- Wash azul superior ausente.
- Estados activos sin superficie azul clara.
- Bordes/acentos que no pintan con la identidad C&E.
- Tipografía del panel permanece en Inter/Geist en lugar de Space Grotesk.

**No es un rediseño faltante:** los valores correctos ya están definidos; **no se reinyectan** a `--color-*` / `--ce-*` / `--font-sans`.

Hipótesis descartada como causa única: ThemeService “atascado en dark”. En la sesión auditada el tema resuelto era `light` (`ce-theme=system`) y la regresión persistía igual en `dark`.

---

## 2. Evidencia del estado actual

### 2.1 Runtime (Playwright + `getComputedStyle`)

Medición sobre `.admin-shell` con `data-theme=light`:

| Variable | Valor computado en `.admin-shell` | Esperado C&E admin |
|----------|-----------------------------------|--------------------|
| `--solvix-bg` | `#f4f8fc` | `#f4f8fc` |
| `--solvix-primary` | `#006194` | `#006194` |
| `--solvix-primary-soft` | `#cce5ff` | `#cce5ff` |
| `--color-bg` | *(vacío / inválido)* | `#f4f8fc` |
| `--color-primary` | *(vacío / inválido)* | `#006194` |
| `--color-surface-1` | *(vacío / inválido)* | `#ffffff` |
| `--color-border` | *(vacío / inválido)* | `#d7e3f0` |
| `--ce-neon` | `#0284c7` (Stitch global) | `#006194` |
| `--ce-deep` | `#0369a1` (Stitch global) | `#004b73` |
| `--font-sans` | Inter, Geist | Space Grotesk |
| `background-color` del shell | `rgba(0,0,0,0)` | `#f4f8fc` |
| `::before` wash en `__main` | `none` | gradiente `primary-soft` |

Resolución de prueba inyectada en el shell:

- `var(--solvix-primary)` → `rgb(0, 97, 148)` ✅  
- `var(--color-primary)` → cae al color heredado (token inválido) ❌  
- `var(--solvix-bg)` → `rgb(244, 248, 252)` ✅  
- `var(--color-bg)` → inválido ❌  

Con `data-theme=dark`:

| Capa | Hallazgo |
|------|----------|
| `:root` / `body` | Tokens globales oscuros SOLVIX (`--color-bg:#020617`, `--color-primary:#4fd1ff`) sí resuelven |
| `.admin-shell` | `--solvix-bg:#0b1520`, `--solvix-primary:#5eb3e0` correctos C&E oscuro |
| `.admin-shell` | `--color-*` siguen vacíos; `background` transparente |

### 2.2 Capturas visuales

Inspección Playwright realizada (dashboard + servicios, tema claro; servicios tema oscuro). Hallazgos visuales alineados con tokens rotos:

- Sidebar sin superficie blanca nítida ni separadores claros.
- Ítem activo sin fondo azul claro (solo texto azulado).
- KPI/cards sin borde/superficie definidos; se “diluyen” en el fondo.
- Segmented controls y filtros sin acento C&E consistente.
- En oscuro: fondo global cyber (`#020617`) visible a través del shell transparente; identidad C&E admin no llega a superficies.

Evidencia en disco:

- `docs/auditorias/evidence/regresion-dashboard-light.png`
- `docs/auditorias/evidence/regresion-servicios-light.png`

Tema oscuro: medido por `getComputedStyle` (tokens `--solvix-*` C&E correctos, `--color-*` vacíos, shell transparente). La prueba visual **sí se ejecutó**.

### 2.3 Git

- Raíz git: monorepo `Computer&Electronic` (`Proyect-Solar`).
- `src/` del frontend aparece **mayormente untracked** (`git ls-files src/` → 0). No hay blame/diff confiable de commits remotos para `_admin-ce.scss` / `_tokens.scss`.
- Comparación histórica usable = **valores vivos en código** (`--solvix-*` del shell) + aliases globales correctos en `_tokens.scss` + evidencia runtime.

---

## 3. Inventario de tokens

### 3.1 Capas

| Capa | Archivo | Rol |
|------|---------|-----|
| Global dark/light | `src/styles/_tokens.scss` | Fuente `--solvix-*` + aliases `--color-*` / `--ce-*` |
| Refinamientos light | `src/styles/_theme-light.scss` | Overrides bajo `html[data-theme='light']` |
| Identidad admin C&E | `src/styles/_admin-ce.scss` | Remapeo localizado a `.admin-shell` y dialogs |
| Layout | `src/app/layout/admin-layout/*.scss` | Consume `--color-*` |
| Material | `src/styles/_material-theme.scss` | Tema Angular Material |

### 3.2 Tabla de tokens críticos (admin light)

| Token | Valor actual efectivo en UI admin | Valor anterior / canónico comprobable | Consumidores | Resultado |
|-------|-----------------------------------|----------------------------------------|--------------|-----------|
| `--solvix-bg` | `#f4f8fc` (definido en shell) | `#f4f8fc` en `_admin-ce.scss` | indirecto | OK definido, poco consumido |
| `--color-bg` | inválido en shell | debería = `--solvix-bg` | shell, layout, módulos | **ROTO** |
| `--solvix-surface` | `#ffffff` | `#ffffff` | indirecto | OK definido |
| `--color-surface-1` | inválido | `#ffffff` | sidebar, cards, topbar | **ROTO** |
| `--solvix-primary` | `#006194` | `#006194` | indirecto | OK definido |
| `--color-primary` | inválido | `#006194` | botones, focus, acentos | **ROTO** |
| `--solvix-primary-soft` | `#cce5ff` | `#cce5ff` | indirecto | OK definido |
| `--color-primary-soft` | inválido | `#cce5ff` | activos, wash, icon chips | **ROTO** |
| `--solvix-text` | `#131b2e` | `#131b2e` | indirecto | OK definido |
| `--color-text-*` | inválidos | textos C&E | tipografía local | **ROTO** (hereda root) |
| `--solvix-border` | `#d7e3f0` | `#d7e3f0` | indirecto | OK definido |
| `--color-border*` | inválidos | bordes C&E | cards/tablas | **ROTO** |
| `--ce-neon` / `--ce-deep` | Stitch sky `#0284c7` / `#0369a1` | C&E `#006194` / `#004b73` | brand sidebar activo | **NO remapados** |
| `--font-sans` | Inter/Geist (root) | Space Grotesk (shell `--solvix-font`) | layout/admin | **NO remapado** |
| Root light `--solvix-primary` | `#0284c7` (Stitch catálogo) | distinto de C&E admin | homepage/login/público | Intencional; no es el bug del panel |

---

## 4. Comparación histórica

Evidencia comprobable **sin Git**:

1. `_tokens.scss` `semantic-aliases` hace correctamente `--color-*: var(--solvix-*)`.
2. `_admin-ce.scss` redefine `--solvix-*` C&E en `.admin-shell`, pero el mixin local hace `--color-*: var(--color-*)` (ciclo).
3. La identidad visual descrita por el usuario coincide **byte a byte** con el bloque claro C&E de `_admin-ce.scss` (`#f4f8fc`, sidebar blanco, primary `#006194`, soft `#cce5ff`, texto `#131b2e`).
4. Etapas 8C–8E migraron consumidores a `--color-*` / `ce-theme`; el remapeo admin quedó desconectado exactamente en esa frontera.

No se afirma un commit hash concreto: el frontend no está versionado de forma usable en este remoto.

---

## 5. Estado del ThemeService

| Aspecto | Estado |
|---------|--------|
| Preferencia default código | `'dark'` (`ThemeService`, FOUC `index.html`, `:root`) |
| Persistencia | `ce-theme` canónico; lectura legacy `solvix-theme` |
| Sesión auditada | `ce-theme=system` → resuelto `light` |
| FOUC | Alineado con ThemeService |
| ¿Tema incorrecto causa la regresión? | **No como causa principal**. Con light y dark el ciclo `--color-*` rompe el shell |
| Riesgo secundario | Usuarios nuevos sin preferencia caen a dark global SOLVIX (`#4fd1ff` / `#020617`), distinto del C&E admin |

Compatibilidad legacy: **no eliminar**.

---

## 6. Auditoría de estilos globales

### 6.1 Causa raíz confirmada

Archivo: `src/styles/_admin-ce.scss`

```scss
@mixin ce-admin-semantic-aliases {
  --color-bg: var(--color-bg);
  --color-surface-1: var(--color-surface-1);
  /* …mismo patrón en el resto de --color-*… */
}
```

Incluido en:

- `html[data-theme='light'] .admin-shell, .admin-shell`
- `html[data-theme='dark'] .admin-shell`
- superficies de dialogs admin (también con el mixin)

Según CSS Custom Properties, la autorreferencia hace el token **invalid at computed-value time**. Por eso `getPropertyValue('--color-bg')` devuelve vacío dentro del shell aunque `--solvix-bg` exista.

### 6.2 Causas contribuyentes confirmadas

1. **Remapeo incompleto:** aunque se corrija el ciclo, el mixin actual no reasigna `--ce-neon`, `--ce-deep`, `--font-sans`, `--shadow*`, `--topbar-bg`, etc. a los `--solvix-*` del shell.
2. **`_theme-light.scss` anula el activo del sidebar:**

```scss
.admin-sidebar__link.is-active {
  background: transparent;
  box-shadow: none;
}
```

   Sobrescribe el pill definido en `admin-sidebar.scss` (fondo soft + barra inset).

3. **Overrides light sin fallback:** p. ej. `.metric { background: var(--color-panel) !important; }` — con token inválido la card queda transparente y además pisa fallbacks de componentes (`var(--color-panel, #fff)`).

4. **Selector base `.admin-shell` sin `data-theme`:** aplica identidad clara C&E siempre; el oscuro depende de `html[data-theme='dark'] .admin-shell`. Funciona por especificidad, pero acopla “default visual” al claro dentro del shell.

### 6.3 Qué NO es la causa principal

- Eliminación 8H-1 de `.solvix-btn` / coming-soon.
- Renombre 8H-2 de keyframes / `.ce-menu` (no altera colores de superficie).
- Lógica de negocio, API, JWT, CORS.
- Componentes `Ce*` en su lógica TypeScript.

---

## 7. Auditoría de componentes compartidos `Ce*`

Consumen mayoritariamente `--color-*` (tras 8B/8C). Con tokens inválidos en el shell, fallan de forma transversal:

| Componente | Dependencia típica | Impacto |
|------------|--------------------|---------|
| `ce-metric-card` | `--color-panel`, `--color-border`, `--color-primary*` | Cards planas / sin acento |
| `ce-card` | `--color-panel`, `--color-border` | Mismo |
| `ce-button` / btn-tech | `--btn-tech-*` / primary | Jerarquía débil |
| `ce-progress-fases` | `--color-primary-soft`, success | Fases sin relleno |
| `ce-state` | shimmer/`--color-primary*` | Skeleton degradado |
| `ce-page-header` / `ce-section-header` | text/primary | Jerarquía apagada |
| Layout sidebar/topbar | `--color-surface-*`, borders, soft | Chrome del panel |

No requieren cambio funcional: **se recuperan al restaurar tokens**.

---

## 8. Estado por módulo

Problema **global del shell** (misma causa en todos). Severidad visual similar:

| # | Módulo | ¿Afectado? | Notas |
|---|--------|------------|-------|
| 1 | Dashboard | Sí | KPI transparentes, wash ausente, charts con tokens de acento rotos |
| 2 | Clientes | Sí | Listas/cards vía tokens compartidos |
| 3 | Cotizaciones | Sí | + dialogs con mixin circular |
| 4 | Servicios | Sí (capturado) | Toolbar/segmentados/tabla sin superficies |
| 5 | Ventas | Sí | Mismo chrome |
| 6 | Proveedores | Sí | Mismo chrome |
| 7 | Compras | Sí | Charts admin usan `--ce-chart-*` (estos sí se setean en shell) — parcial |
| 8 | Cuentas por pagar | Sí | Mismo chrome |
| 9 | Inventario | Sí | Dialogs de ajuste expuestos al mixin |
| 10 | Productos | Sí | Mismo |
| 11 | Usuarios y roles | Sí | Mismo |
| 12 | Documentos | Sí | Mismo |
| 13 | Analytics / reportes | Sí | Shell + posibles overrides light |
| 14 | Configuración / cuenta | Sí si vive en admin-shell | Login/homepage usan root Stitch (capa distinta) |

Conclusión: **regresión global**, no un bug aislado de dashboard.

---

## 9. Causa raíz — respuestas

1. **¿Qué cambió exactamente?**  
   El remapeo semántico del admin dejó de apuntar `--color-*` → `--solvix-*` y pasó a autorreferencias. Además, refinamientos light neutralizan el activo del menú y refuerzan `var(--color-*)` sin fallback.

2. **¿En qué archivo se originó?**  
   Primario: `src/styles/_admin-ce.scss` (`ce-admin-semantic-aliases`).  
   Contributivo: `src/styles/_theme-light.scss`.  
   Consumidores afectados: layout admin + `Ce*` + SCSS de módulos.

3. **¿Qué token/selector dejó de funcionar?**  
   Todos los `--color-*` redefinidos en el mixin (ciclo). Secundario: `--ce-neon`/`--ce-deep`/`--font-sans` no re-aliasados.

4. **¿Por qué afecta a todos los módulos?**  
   Todos renderizan bajo `.admin-shell` y consumen `--color-*`.

5. **¿Relación con etapas 8C–8H?**  
   8C/identidad admin localizada + migración a `--color-*` crearon la dependencia del remapeo. 8E cambió persistencia del tema (no es la causa del ciclo). 8H-1/8H-2 no originan esta regresión de superficies.

6. **¿Qué propiedades restaurar?**  
   Aliases correctos; remap completo de tipografía/ce/shadow/topbar; pill activo del sidebar; washes/cards vía tokens válidos.

7. **¿Correcciones locales por módulo?**  
   No como primera línea. Solo tras validar shell + `Ce*`. Revisar hex hardcodeados residuales si aparecen.

8. **¿Cómo evitar repetición?**  
   Test/smoke de `getComputedStyle` sobre `.admin-shell` para `--color-bg`/`--color-primary`; checklist visual light/dark; no autorreferenciar custom properties.

---

## 10. Plan de corrección priorizado

**Sin rediseño. Sin tocar backend/API/auth.**

### P0 — Restaurar puente de tokens (obligatorio)

1. En `_admin-ce.scss`, reemplazar `ce-admin-semantic-aliases` por mapeo real:

   `--color-*: var(--solvix-*)`  
   (equivalente al `semantic-aliases` global; idealmente reutilizar el mixin canónico si el `@use` lo permite).

2. Extender el remapeo a:
   - `--ce-neon`, `--ce-deep`, `--ce-glow`
   - `--font-sans`, `--font-mono`
   - `--shadow`, `--shadow-sm`
   - `--topbar-bg`, `--select-panel-bg`, `--snack-surface-*`
   - `--btn-tech-*` ya definidos como `--solvix-btn-tech-*` → asegurar alias neutros usados por botones

3. Aplicar el mismo mixin corregido en dialogs admin (hoy también lo incluyen).

### P1 — Identidad light del chrome

4. En `_theme-light.scss`, dejar de forzar `background: transparent` / `box-shadow: none` en `.admin-sidebar__link.is-active` (o alinearlo al pill C&E de `admin-sidebar.scss`).
5. Revisar reglas `!important` de `.metric` / cards para que usen tokens con fallback o dependan solo del shell sano.
6. Verificar wash `.admin-shell__main::before` tras P0.

### P2 — Temas y Material

7. Validar light/dark admin (C&E `#0b1520` / `#5eb3e0` en oscuro, no confundir con root SOLVIX neon).
8. Revisar Material (inputs, menus, dialogs) tras tokens válidos.
9. Decidir aparte (no bloquear P0) si el default de producto debe seguir siendo `dark` o `light` para operadores C&E.

### P3 — Validación

10. Matriz §11 + suite `ng test` + `ng build --configuration=production`.
11. No iniciar 8H-3 ni k6 hasta cerrar P0–P2 visualmente.

---

## 11. Matriz de pruebas

| Superficie | Light desktop | Dark desktop | Móvil | Estado actual auditoría |
|------------|---------------|--------------|-------|-------------------------|
| Dashboard | Inspeccionado | Medido tokens | Pendiente | Regresión confirmada |
| Listados (Servicios) | Inspeccionado | Inspeccionado | Pendiente | Regresión confirmada |
| Formularios | Pendiente post-fix | Pendiente | Pendiente | Esperable global |
| Tablas | Observado en Servicios | Observado | Pendiente | Sin superficies |
| Dialogs | Código auditado | Código auditado | Pendiente | Mixin circular |
| Menús | Código (`.ce-menu`) | Pendiente | Pendiente | Tipografía/tokens |
| Cards / KPI | Inspeccionado | Medido | Pendiente | Transparentes |
| Botones | Observado | Pendiente | Pendiente | Acento débil |
| Inputs / search | Observado topbar | Pendiente | Pendiente | Depende `--color-*` |
| Navegación sidebar | Inspeccionado | Medido | Pendiente | Activo sin pill |
| Responsive | Pendiente | Pendiente | Pendiente | No bloquea P0 |

Criterio de aceptación visual post-fix: `--color-bg` y `--color-primary` en `.admin-shell` no vacíos; shell/sidebar/cards opacos; wash visible; activo con soft `#cce5ff` / primary `#006194` en light.

---

## 12. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Corregir aliases cambia homepage/login | Remapeo solo bajo `.admin-shell` / dialogs admin (como hoy) |
| Reutilizar `semantic-aliases` crea dependencia circular SCSS | Copiar mapeo explícito o exportar mixin compartido con cuidado `@use` |
| Restaurar pill activo vs intención Stitch en `_theme-light` | Priorizar identidad C&E admin documentada en `_admin-ce.scss` |
| Default `dark` confunde operadores | Separar decisión de producto; no mezclar con el fix del ciclo |
| Material overlays fuera del shell | Asegurar mixin corregido en paneles de dialog/menu |
| Frontend untracked en git | Commit/backup antes del fix para poder comparar |

---

## 13. Criterios de aceptación

- [ ] `getComputedStyle(.admin-shell).getPropertyValue('--color-bg')` = valor C&E del tema (`#f4f8fc` light / `#0b1520` dark)
- [ ] `--color-primary` = `#006194` (light) / `#5eb3e0` (dark) dentro del shell
- [ ] Shell, sidebar y cards con fondo no transparente
- [ ] Wash azul superior visible en light
- [ ] Ítem de menú activo con superficie soft + acento
- [ ] Tipografía admin Space Grotesk vía `--font-sans`
- [ ] Light y dark validados en al menos Dashboard + un listado + un dialog
- [ ] Suite de pruebas sin regresión nueva; build producción OK
- [ ] Sin cambios de API/auth/backend; sin rediseño

---

## 14. Archivos involucrados (para la corrección futura)

| Prioridad | Archivo |
|-----------|---------|
| P0 | `src/styles/_admin-ce.scss` |
| P1 | `src/styles/_theme-light.scss` |
| Verificar | `src/styles/_tokens.scss` (referencia de aliases correctos) |
| Verificar | `src/app/layout/admin-layout/admin-layout.scss` |
| Verificar | `src/app/layout/admin-layout/admin-sidebar.scss` |
| Verificar | `src/app/layout/admin-layout/admin-topbar.scss` |
| Verificar | `src/app/shared/components/ce-*` (sin cambio lógico) |
| No tocar ahora | Backend, JWT, CORS, `DESIGN_CONSTITUTION.md`, duales 8H, selectores Angular `solvix-*` |

---

## 15. Cierre

**Causa raíz confirmada:** ciclo CSS en `ce-admin-semantic-aliases` (`--color-*: var(--color-*)`) dentro de `_admin-ce.scss`, que invalida los tokens canónicos en todo el panel pese a tener `--solvix-*` C&E correctos.

**Corrección recomendada:** restaurar el puente `--color-* → --solvix-*` (+ remap de `--ce-*` / tipografía / sombras), luego revertir anulaciones del activo en `_theme-light.scss` y validar light/dark.

**Detenido aquí.** No se modificó código de estilos ni se inició la fase k6. Esperar aprobación explícita para aplicar el fix P0/P1.
