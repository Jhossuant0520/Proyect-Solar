# SOLVIX — FASE 3.15.14
## ENRIQUECIMIENTO UX/UI — TOOLTIPS Y REACTIVIDAD (PROVEEDORES Y COMPRAS)

**Tipo:** FRONTEND UX  
**Fecha:** 2026-10-06  
**Backend:** ZERO-TOUCH (sin cambios en DTOs, entidades ni BD)

---

## 1. Superficie impactada

| Área | Archivos |
|------|----------|
| Proveedores | `proveedor-form.ts`, `proveedor-form.html`, `proveedor-form.scss` |
| Compras | `compra-form.ts`, `compra-form.html`, `compra-form.scss` |
| Docs | `docs/frontend/FASE_3_15_14_UX_TOOLTIPS_REACTIVIDAD.md` |

---

## 2. Misión 1 — Tooltips Proveedores

Íconos `solvix-field-help` (Design System SOLVIX) junto a:

| Campo | Texto |
|-------|--------|
| Razón social | Nombre legal exacto registrado en el RUT para fines de facturación. |
| Nombre comercial | Nombre de la marca o letrero del establecimiento comercial. |
| Departamento | Requerido para cálculos futuros de impuestos territoriales o logística. |
| Condiciones comerciales habituales | Preferencias por defecto. Se cargarán automáticamente al hacer una compra a este proveedor, pero podrán modificarse. |

### Fragmento HTML — Tooltip Razón social

```html
<label class="full">
  <span class="label-row">
    Razón social
    <span class="req">Obligatorio</span>
    <solvix-field-help [text]="helpRazonSocial" ariaLabel="Ayuda: razón social" />
  </span>
  <input type="text" formControlName="razonSocial" maxlength="150" />
</label>
```

```typescript
readonly helpRazonSocial =
  'Nombre legal exacto registrado en el RUT para fines de facturación.';
```

---

## 3. Misión 2 — Tooltips Compras

**Hotfix UX:** mapeo 1:1 (sin variables compartidas en Documento de compra).

| Campo | Variable | Texto |
|-------|----------|--------|
| Tipo documento externo | `helpTipoDocumento` | ¿Qué tipo de soporte físico o digital te entregó el proveedor? (Ej: Factura Electrónica, Cuenta de Cobro, Remisión). |
| Número documento externo | `helpNumeroDocumento` | El número o consecutivo impreso en la factura del proveedor. Vital para hacer valer garantías y cruzar pagos. |
| Número orden de compra | `helpOrdenCompra` | Si en tu taller generaste una Orden de Compra interna previa para solicitar esta mercancía, anota aquí tu número de control. |
| Número cotización proveedor | `helpCotizacion` | Si el proveedor te entregó una cotización formal con validez de precios antes de hacer esta compra, ingresa ese código aquí. |
| Fecha documento proveedor | `helpFechaDocumentoProveedor` | Fecha de emisión impresa en la factura del proveedor. |
| Fecha entrega | `helpFechaEntrega` | Fecha real en la que la mercancía fue recibida físicamente en el inventario. |

### Fragmento HTML — Documento (1:1)

```html
<solvix-field-help [text]="helpTipoDocumento" ariaLabel="Ayuda: tipo de documento" />
<solvix-field-help [text]="helpNumeroDocumento" ariaLabel="Ayuda: número de documento" />
<solvix-field-help [text]="helpOrdenCompra" ariaLabel="Ayuda: orden de compra" />
<solvix-field-help [text]="helpCotizacion" ariaLabel="Ayuda: cotización" />
```

---

## 4. Misión 3 — Reactividad CONTADO / CRÉDITO

- `esCredito` enlaza `condicionPagoAplicada` (y, si está vacío, el default del proveedor).
- `@if (esCredito)` saca del DOM `diasCreditoAplicados` y `fechaVencimiento` cuando es CONTADO.
- Aparición con animación CSS (`credito-reveal`) para evitar salto brusco, sin cargar `@angular/animations` en el bundle inicial (presupuesto de producción).

### Fragmento TS — lógica reactiva

```typescript
get esCredito(): boolean {
  const seleccion = this.form.get('condicionPagoAplicada')?.value as '' | CondicionPagoProveedor;
  if (seleccion === 'CREDITO') {
    return true;
  }
  if (seleccion === 'CONTADO') {
    return false;
  }
  const id = this.form.get('proveedorId')?.value;
  const proveedor = this.proveedores.find(item => item.id === id);
  return proveedor?.condicionPago === 'CREDITO';
}

onCondicionChange(): void {
  if (!this.esCredito) {
    this.form.patchValue({ diasCreditoAplicados: 0, fechaVencimiento: '' });
  } else if (!this.form.get('diasCreditoAplicados')?.value) {
    const id = this.form.get('proveedorId')?.value;
    const proveedor = this.proveedores.find(item => item.id === id);
    this.form.patchValue({ diasCreditoAplicados: proveedor?.diasCredito ?? 30 });
  }
}
```

### Fragmento HTML — ocultar / mostrar crédito

```html
@if (esCredito) {
  <div class="credito-fields form-grid" role="group" aria-label="Campos de crédito">
    <label>
      Días de crédito
      <input type="number" formControlName="diasCreditoAplicados" min="0" step="1" />
    </label>
    <label>
      Fecha vencimiento
      <input type="date" formControlName="fechaVencimiento" />
      <span class="hint">Si la dejas vacía el sistema calcula fecha + días.</span>
    </label>
  </div>
}
```

### Fragmento SCSS — transición

```scss
.credito-fields {
  margin-top: 1rem;
  grid-column: 1 / -1;
  overflow: hidden;
  animation: credito-reveal 180ms ease;
}

@keyframes credito-reveal {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-0.35rem);
  }
  to {
    opacity: 1;
    max-height: 12rem;
    transform: translateY(0);
  }
}
```

---

## 5. Verificación de compilación

```text
npx ng build --configuration=production
→ exit code 0
→ Application bundle generation complete. [61.570 seconds]
→ Initial total: 2.07 MB (warning budget 1.50 MB; error budget 2.10 MB no violado)
→ Output: dist/projectSolarFishFrontend
```

**Nota:** Se descartó `provideAnimations()` + DSL `@angular/animations` porque empujaba el bundle inicial a 2.13 MB (error de budget). La reactividad y la animación se cumplen con `@if` + CSS keyframes, sin relajar Backend ni estructura de datos.

---

## 6. Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| Tooltips Proveedores (4 campos) | Cumple |
| Tooltips Compras (documento + fechas) | Cumple |
| CONTADO oculta días/vencimiento del DOM | Cumple |
| CRÉDITO muestra campos | Cumple |
| Animación suave de aparición | Cumple (CSS) |
| Backend ZERO-TOUCH | Cumple |
| `ng build --configuration=production` OK | Cumple (exit 0) |
