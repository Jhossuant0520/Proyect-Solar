# SOLVIX — FASE 3.15.13-C
## FRONTEND + QA — CUENTAS POR PAGAR (CxP)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Base:** 3.15.13-B (API `/api/v1/cxp`)  
**Fecha:** 2026-10-05  
**Backend:** zero-touch

---

## 1. Rutas Angular (adminGuard)

| Ruta | Componente | Guard |
|------|------------|-------|
| `/cxp` | `CxpListComponent` | `adminGuard` |
| `/cxp/:id` | `CxpDetailComponent` | `adminGuard` |

Menú lateral (`ADMIN_NAV`): **Cuentas por pagar** → `/cxp` (icono `account_balance_wallet`), junto a Compras (abastecimiento).

---

## 2. Archivos creados / tocados

| Archivo | Rol |
|---------|-----|
| `core/models/cxp.models.ts` | DTOs + `PageResponse` |
| `core/services/cxp.service.ts` | HTTP listar / detalle / por-compra / pagos |
| `features/panelAdmin/cxp/cxp-ui.ts` | Labels, badges, `pagoValorInvalido` |
| `features/panelAdmin/cxp/cxp-list/*` | Listado paginado + filtros estado/vencida |
| `features/panelAdmin/cxp/cxp-detail/*` | KPIs + historial + formulario pago |
| `layout/admin-layout/admin-nav.ts` | Ítem de menú |
| `app.routes.ts` | Rutas CxP |
| `compra/compra-detail/*` | Enlace dinámico “Ver Cuenta por Pagar” |

---

## 3. Validación anti-sobrepago (cliente)

```typescript
/** Impide submit si el valor supera el saldo pendiente (protección cliente). */
export function pagoValorInvalido(
  valor: number | null | undefined,
  saldoPendiente: number | null | undefined
): boolean {
  if (valor == null || !Number.isFinite(valor) || valor <= 0) {
    return true;
  }
  return pagoSuperaSaldo(valor, saldoPendiente);
}
```

En detalle: `get pagoFormInvalido()` → deshabilita el botón submit y muestra alerta UI.

Tras pago exitoso: `this.cuenta = actualizada` (KPIs y historial se refrescan con la respuesta del backend).

---

## 4. Hook detalle de compra

Visible solo si `condicionPagoAplicada === 'CREDITO'` **y** estado ∈ `{COMPLETADA, PARCIALMENTE_DEVUELTA, DEVUELTA}`.

Flujo: `CxpService.obtenerPorCompra(compraId)` → `navigate(['/cxp', cxp.id])`.

Confirmado por test: pendiente CREDITO **no** muestra el botón; completada **sí**.

---

## 5. Badges

| Condición | Tone |
|-----------|------|
| `vencida == true` | `error` (rojo) |
| `PAGADA` | `success` |
| `PENDIENTE` / `PARCIALMENTE_PAGADA` | `warning` |
| `ANULADA` | `neutral` |

---

## 6. Build

```text
npx ng build --configuration=production
→ Application bundle generation complete. [80.172 s]
→ exit code 0
→ Output: dist/projectSolarFishFrontend
(Warning preexistente: budget initial 1.50 MB exceeded — no bloquea)
```

---

## 7. Cierre

```text
FASE 3.15.13-C — FRONTEND CxP
Estado: COMPLETADA
Backend: sin cambios
```
