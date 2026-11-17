# SOLVIX — FASE 3.15.13-B
## IMPLEMENTACIÓN BACKEND — CUENTAS POR PAGAR (CxP)

**Tipo:** IMPLEMENTACIÓN BACKEND  
**Base:** `FASE_3_15_13_A_AUDITORIA_CXP.md`  
**Fecha:** 2026-10-05  
**Frontend:** zero-touch  
**InventarioService:** zero-touch (sin imports CxP)

---

## 1. Entregables

| Artefacto | Rol |
|-----------|-----|
| `V19__cuentas_por_pagar.sql` | Tablas `cuentas_por_pagar`, `pagos_cxp` |
| `CuentaPorPagar`, `PagoCxP` | Entidades JPA |
| `EstadoCuentaPorPagar`, `MetodoPagoCxP` | Enums |
| `CuentaPorPagarRepository`, `PagoCxPRepository`, Specs | Persistencia |
| `CxPService` | Matemática de saldo + estados + pagos |
| `CxPController` | API `/api/v1/cxp` · `@PreAuthorize("hasRole('ADMIN')")` |
| DTOs request/response | Contratos API |
| Hooks en `CompraService` / `DevolucionCompraService` | Generación y ajuste automático |
| `CxPServiceTest` | Evidencia de reglas |

---

## 2. Hook en CompraService (fragmento)

```java
compra.setEstado(EstadoCompra.COMPLETADA);
compra.setFechaCompletada(LocalDateTime.now());

Compra guardada = compraRepository.save(compra);
// Misma transacción: si falla CxP, no se confirma el inventario.
cxpService.crearDesdeCompraCompletada(guardada, usuario);

return CompraResponseDTO.fromEntity(guardada);
```

- Solo crea CxP si `condicionPagoAplicada == CREDITO`.
- `CONTADO` → no-op.
- Misma `@Transactional` que el movimiento de inventario.

### Hook devolución

```java
DevolucionCompra guardada = devolucionRepository.save(devolucion);
cxpService.aplicarDevolucion(compra.getId(), guardada.getMontoTotalDevuelto());
```

---

## 3. Matemática y estados

```text
obligacion_neta = max(0, saldo_inicial - total_devoluciones)
saldo_pendiente = max(0, obligacion_neta - total_pagado)
```

| Condición | Estado |
|-----------|--------|
| `saldo_pendiente == 0` | `PAGADA` |
| `total_pagado == 0` y saldo > 0 | `PENDIENTE` |
| `total_pagado > 0` y saldo > 0 | `PARCIALMENTE_PAGADA` |

`vencida` = derivado en DTO (no persistido): saldo > 0, no PAGADA/ANULADA, `now > fecha_vencimiento`.

Pagos: `valor > 0` y `valor ≤ saldo_pendiente` (sobrepago rechazado).

---

## 4. API

| Método | Ruta |
|--------|------|
| `GET` | `/api/v1/cxp?proveedorId&estado&vencida&page&size` |
| `GET` | `/api/v1/cxp/{id}` |
| `GET` | `/api/v1/cxp/por-compra/{compraId}` |
| `GET` | `/api/v1/cxp/{id}/pagos` |
| `POST` | `/api/v1/cxp/{id}/pagos` |

---

## 5. Evidencia de tests — `CxPServiceTest`

```text
Tests run: 7, Failures: 0, Errors: 0
```

| Test | Demuestra |
|------|-----------|
| `compraCreditoCreaCxp` | Completar CREDITO → CxP con `saldo_inicial = total`, estado `PENDIENTE` |
| `compraContadoNoCreaCxp` | CONTADO no genera CxP |
| `pagoTotalDejaPagada` | Pagar exactamente `saldo_pendiente` → `PAGADA` |
| `pagoParcialYSobrepago` | Parcial → `PARCIALMENTE_PAGADA`; exceso → `BusinessException` |
| `devolucionReduceObligacionNeta` | Devolución ↑ `total_devoluciones` y ↓ `saldo_pendiente` |
| `devolucionTotalSinPagosDejaPagada` | Devolución total → saldo 0 → `PAGADA` |
| `listadoPaginado` | Filtro por proveedor + page |

---

## 6. `mvn clean test` (global)

```text
Command: mvn clean test
Surefire aggregate (TEST-*.xml):
  suites = 46
  tests  = 371
  failures = 0
  errors = 0
exit_code = 0
```

Incluye `CxPServiceTest`, `CompraServiceTest`, `DevolucionCompraServiceTest`, Reportes, Analytics, etc.

---

## 7. Zero-touch verificado

- `InventarioService`: sin referencias a CxP.
- Angular / frontend: no modificado.
- Sin backfill de compras históricas CREDITO (MVP, según 13-A).

---

## 8. Cierre

```text
FASE 3.15.13-B — BACKEND CxP
Estado: COMPLETADA
Siguiente: 3.15.13-C (FE + QA) opcional
```
