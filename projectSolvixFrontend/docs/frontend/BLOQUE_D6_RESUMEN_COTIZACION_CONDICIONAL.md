# SOLVIX Frontend — BLOQUE D.6
## Resumen de cotización conceptualmente condicional

**Fecha:** 2026-09-29  
**Alcance:** Cotización Comercial (formulario + detalle).  
**Sin cambios:** backend, fórmulas de total, detalle de líneas, D.1, D.3, listado Servicios, reglas de negocio (máx. 1 MANO_OBRA, duplicados, etc.).

---

### 1. Problema UX

El resumen mostraba siempre las tres categorías aunque su importe fuera `$0`, generando ruido:

```text
Productos        $250.000
Mano de obra          $0
Otros conceptos       $0
Total            $250.000
```

---

### 2. Regla

Mostrar una categoría **solo si** su importe numérico es **estrictamente mayor que 0**.

```ts
participaEnResumenCotizacion(importe) → Number.isFinite(n) && n > 0
```

- `0`, negativo, `null`, `undefined`, `NaN` → no mostrar  
- **Total** → siempre visible  
- No se evalúa con strings formateados  

---

### 3. Casos

| Caso | Visible |
|------|---------|
| Solo productos | Productos, Total |
| Productos + mano de obra | Productos, Mano de obra, Total |
| Productos + otros | Productos, Otros conceptos, Total |
| Los tres | Productos, Mano de obra, Otros conceptos, Total |
| Solo mano de obra | Mano de obra, Total |
| Solo otros | Otros conceptos, Total |
| Categoría con importe 0 | No aparece |

---

### 4. Implementación

- Helper: `participaEnResumenCotizacion` en `cotizacion-comercial-ui.ts`
- Form: `@if (participaEnResumen(subtotalProductos|ManoObra|Otros))` sobre totales ya calculados
- Detail: misma regla sobre `cotizacion.subtotal*`
- Sin recalcular el total en el template
- Etiqueta de resumen alineada a **Otros conceptos** (antes “Otros”)

---

### 5. Tests

- `cotizacion-comercial-ui.spec.ts` — regla numérica + casos
- `cotizacion-comercial-form.spec.ts` — 6 escenarios de resumen en DOM
- `cotizacion-comercial-detail.spec.ts` — 3 escenarios de resumen

---

### 6. Responsive

Las filas omitidas no dejan nodos en el DOM → sin huecos, bordes ni dividers huérfanos. El bloque `.facts` se compacta solo.

---

### 7. Impacto

| Área | Impacto |
|------|---------|
| Presentación resumen | Condicional |
| Cálculo / redondeo / COP | Ninguno |
| Detalle de líneas | Ninguno |
| Backend | Ninguno |
| Feedback D.1 | Ninguno |

---

### 8. Build

```bash
npx ng test --include=**/cotizacion-comercial-ui.spec.ts --include=**/cotizacion-comercial-form.spec.ts --include=**/cotizacion-comercial-detail.spec.ts --browsers=ChromeHeadless --watch=false
npx ng build
```
