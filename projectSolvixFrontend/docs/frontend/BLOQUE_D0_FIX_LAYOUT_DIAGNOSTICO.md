# SOLVIX Frontend — BLOQUE D.0
## Fix de layout — formulario de registro de diagnóstico

**Fecha:** 2026-09-28  
**Alcance:** solo CSS del formulario técnico en detalle de OT.  
**Sin cambios** a lógica, endpoints, DTOs, estados, textos funcionales, validaciones, navegación ni listado de Servicios.

---

### 1. Problema detectado

En la pantalla de detalle de orden (`servicio-detail`), al entrar en modo edición / “Registrar diagnóstico”, los `textarea` de las cards del formulario se salían horizontalmente de su contenedor (`.campo-edit` / panel técnico).

Síntomas:

- bordes del campo fuera de la card;
- sensación de overflow horizontal en mobile/tablet;
- el padding interno de la card no contenía el control.

---

### 2. Causa identificada

Componente: `servicio-detail` (formulario `.edit-panel` dentro de “Sección técnica”).

**Causa raíz:**

1. `.edit-panel textarea` usaba `width: 100%` + padding horizontal **sin** `box-sizing: border-box`.  
   Con el modelo por defecto (`content-box`), el ancho total = `100% + padding`, y el control desborda la card.
2. No hay reset global de `box-sizing` en `styles.scss` del frontend.
3. `.campo-edit` es un `<label>` (inline por defecto) sin `min-width: 0` / `max-width: 100%`, lo que empeora el comportamiento dentro del grid flex del detalle.

No se usó `overflow: hidden` como “tapa”: habría ocultado el desborde sin corregir el modelo de caja.

---

### 3. Corrección aplicada

**Archivo modificado:**  
`src/app/features/panelAdmin/servicios/servicio-detail/servicio-detail.scss`

Cambios mínimos:

| Selector | Ajuste |
|---|---|
| `.campo-tecnico`, `.campo-edit` | `box-sizing: border-box`; `display: block`; `width/max-width: 100%`; `min-width: 0` |
| `.edit-panel` | `width/max-width: 100%`; `min-width: 0`; `box-sizing: border-box` |
| `.edit-panel textarea` | `box-sizing: border-box`; `display: block`; `max-width: 100%`; `min-width: 0` |
| `.label-row` | flex + wrap para chips “requerido” / “En foco” sin forzar ancho |
| `.seccion-body` | `min-width: 0`; `max-width: 100%` (contención del cuerpo colapsable) |

Sin cambios de tipografía, altura artificial, HTML, TS ni servicios.

---

### 4. Responsive

El fix es independiente del breakpoint: `border-box` + `min-width: 0` aplica en todos.

Breakpoints del detalle (ya existentes, no alterados):

| Rango | Comportamiento esperado tras D.0 |
|---|---|
| Mobile &lt; 768 | textareas al 100 % del ancho útil de la card, sin scroll horizontal por el campo |
| Tablet 768–1023 | igual; panel principal con `min-width: 0` |
| Laptop 1024–1279 | igual |
| Desktop ≥ 1280 | layout 2 columnas intacto; campos contenidos |

Padding, jerarquía, tipografía y botones de la card se conservan.

---

### 5. Validación

Cadena corregida:

```text
.panel / .seccion-body
  → .edit-panel (grid, min-width: 0)
    → .campo-edit (border-box, 100 %)
      → textarea (border-box, 100 %)
```

Comprobado estructuralmente:

- textarea de diagnóstico / problema / trabajo / observaciones;
- labels y tags;
- botones Cancelar / Guardar diagnóstico;
- mensajes `guia-hint` / `form-error`.

No se introduce `overflow: hidden` en el formulario.

---

### 6. Tests

```text
npx ng test --no-watch --browsers=ChromeHeadless --include=**/servicio-detail.spec.ts
→ 18 / 18 SUCCESS
```

No se añadió infraestructura de testing visual nueva (fuera de alcance D.0).

---

### 7. Build

```text
npx ng build
→ Application bundle generation complete (exit 0)
```

Warning preexistente de budget de bundle (1.99 MB vs 1.50 MB); no introducido por D.0.

---

### 8. Riesgos / regresiones revisadas

| Riesgo | Mitigación |
|---|---|
| Afectar listado Servicios | No tocado (`servicio-list` intacto) |
| Cambiar lógica de diagnóstico | Solo SCSS |
| `overflow: hidden` enmascarando bugs | No aplicado |
| Romper cards en modo lectura | Mismos contenedores; solo contención de caja |
| Material form-fields | Este formulario usa `textarea` nativo, no `mat-form-field` |

---

### Criterio de aceptación

- [x] Campos dentro de la card  
- [x] Sin overflow horizontal por el modelo de caja  
- [x] Responsive por contención CSS  
- [x] Desktop sin cambio de diseño general  
- [x] Sin lógica funcional tocada  
- [x] Tests `servicio-detail` OK  
- [x] `ng build` OK  
- [x] Documentación creada  

**D.0 cerrado.** No se inicia D.1.
