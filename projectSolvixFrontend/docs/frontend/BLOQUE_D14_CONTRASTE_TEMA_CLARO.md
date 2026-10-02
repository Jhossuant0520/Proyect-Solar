# SOLVIX Frontend — BLOQUE D.14
## Contraste de campos en tema claro

**Fecha:** 2026-10-01  
**Alcance:** estilos de inputs/labels en Cotizaciones (servicio + comercial) y refuerzo global de diálogos.  
**Sin cambios:** lógica, DTOs, listado Servicios, workflow.

---

### 1. Problema

Con `data-theme=light`, el texto tipado en campos de Cotización de Servicio (y diálogos asociados) permanecía **blanco** (`#f8fafc`) sobre fondo claro → contraste insuficiente / ilegible.

---

### 2. Causa raíz

CSS **local** en `cotizacion-form-dialog.scss`:

```scss
color: #f8fafc;          /* diálogo e inputs */
```

No era Material ni un token global: hex oscuro-only con especificidad de componente, por encima del tema claro.

Fallbacks `#fff` en diálogos rechazar/confirmar eran secundarios (solo si faltaba token).

Cotización comercial ya usaba `var(--solvix-text)` en inputs; se alineó placeholders/focus/disabled.

---

### 3. Corrección

| Capa | Cambio |
|------|--------|
| `cotizacion-form-dialog.scss` | Hex de texto → `--color-text-*` / `--solvix-*`; inputs/select/textarea con placeholder, focus, disabled |
| `cotizacion-rechazar-dialog.scss` | Tokens; sin fallback `#fff` |
| `cotizacion-confirmar-dialog.scss` | Tokens |
| `cotizacion-comercial-form.scss` | Placeholder / focus / disabled / caret |
| `_solvix-material-theme.scss` | Controles nativos en `.mat-mdc-dialog-surface` / overlay |
| `styles.scss` | Baseline global de `color`/`caret`/`option` vía tokens |

**No** se usó `color: black !important`.

---

### 4. Comportamiento por tema

| | Dark | Light |
|--|------|-------|
| Valor tipado | `--solvix-text` (#fff) | `--solvix-text` (#0f172a) |
| Placeholder | `--solvix-text-muted` | `--solvix-text-muted` (#64748b) |
| Label / hint | muted | muted |
| Error | `--solvix-error` | `--solvix-error` |

---

### 5. Validación manual

- Escribir / seleccionar / autocomplete (buscadores)  
- Focus / disabled / mensaje de error  
- Dark + light en Cotización servicio y comercial  

---

### 6. Tests / build

- `theme.service.spec.ts` — D.14 tokens dark vs light  
- `cotizacion-form-dialog.spec.ts` + cotizaciones relacionadas  
- `ng build`

---

### 7. Fuera de alcance

Servicios listado no modificado.
