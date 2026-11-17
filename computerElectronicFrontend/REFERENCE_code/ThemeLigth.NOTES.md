# ThemeLigth.cursorrules — referencia de diseño (Google Stitch)

Fuente: mock HTML de catálogo Productos (Electronic BI Terminal).
Integrado en SOLVIX como refinamiento del **tema claro** (`html[data-theme="light"]`).

## Paleta Stitch → tokens SOLVIX

| Stitch | Token | Valor |
|--------|-------|-------|
| slate-50 bg | `--solvix-bg` | `#f8fafc` |
| white panels | `--solvix-panel` / `--solvix-surface` | `#ffffff` |
| slate-100 | `--solvix-surface-low` | `#f1f5f9` |
| slate-200 borders | `--solvix-border` | `#e2e8f0` |
| slate-900 text | `--solvix-text` | `#0f172a` |
| slate-500 muted | `--solvix-text-muted` | `#64748b` |
| sky-600 | `--solvix-primary` | `#0284c7` |
| sky-700 | `--solvix-primary-hover` | `#0369a1` |
| sky-50 | `--solvix-primary-soft` | `#f0f9ff` |
| emerald activo | `--solvix-success` / soft | `#047857` / `#ecfdf5` |

## Archivos de integración

- `src/styles/_solvix-tokens.scss` — mixin `solvix-theme-light`
- `src/styles/_solvix-theme-light.scss` — sidebar pill, KPI, botones tech, filtros/tablas
- Componentes compartidos: `solvix-metric-card`, `solvix-page-header`
- Paneles admin: `background: var(--solvix-panel)` (ya no rgba oscuro fijo)

## Qué NO se cambia

- Tema oscuro (tokens dark intactos)
- Lógica de ThemeService / toggle
- Homepage / login (siguen con estética propia)

## HTML de referencia

El mock completo de Stitch se conserva debajo para contraste visual.
No se usa Tailwind en runtime: los estilos viven en SCSS + tokens.

---

