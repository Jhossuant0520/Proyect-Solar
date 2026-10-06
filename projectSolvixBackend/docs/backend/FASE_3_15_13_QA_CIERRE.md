# SOLVIX — FASE 3.15.13-QA
## VALIDACIÓN, REGRESIÓN Y CIERRE — CUENTAS POR PAGAR (CxP)

**Tipo:** QA / CIERRE  
**Fecha:** 2026-10-05  
**Frontend:** zero-touch  
**Estado:** **PASS**

---

## 1. Validación de dominio (antes del clamp)

Fragmento en `CxPService.recalcularSaldosYEstado`:

```java
if (totalDev.compareTo(saldoInicial) > 0) {
    throw new BusinessException(
        "Las devoluciones superan la obligación inicial.");
}

BigDecimal obligacionNetaSinClamp = saldoInicial.subtract(totalDev);
if (totalPagado.compareTo(obligacionNetaSinClamp) > 0) {
    throw new BusinessException(
        "Los pagos superan la obligación neta actual.");
}

// Defensa de bajo nivel (no debe enmascarar: el dominio ya validó arriba).
BigDecimal obligacionNeta = obligacionNetaSinClamp.max(BigDecimal.ZERO);
BigDecimal saldoPendiente = obligacionNeta.subtract(totalPagado).max(BigDecimal.ZERO);
```

Evidencia adicional:
- `dominioRechazaDevolucionesSobreObligacion`
- `dominioRechazaPagosSobreObligacionNeta`

---

## 2. Matriz de evidencia (10 casos)

| # | Caso | Test method | Estado |
|---|------|-------------|--------|
| 1 | Compra CONTADO → NO genera CxP | `compraContadoNoCreaCxp` | ✅ |
| 2 | Compra CREDITO → SÍ genera CxP | `compraCreditoCreaCxp` | ✅ |
| 3 | Completar CREDITO dos veces → sin duplicado (idempotencia + rechazo compra) | `completarCreditoDosVecesNoDuplicaCxp` | ✅ |
| 4 | Pago exacto → `PAGADA` | `pagoExactoDejaPagada` | ✅ |
| 5 | Pago menor → `PARCIALMENTE_PAGADA` | `pagoMenorDejaParcialmentePagada` | ✅ |
| 6 | Pago mayor → `BusinessException` | `pagoMayorRechazado` | ✅ |
| 7 | Devolución reduce obligación | `devolucionReduceObligacionNeta` | ✅ |
| 8 | Devolución parcial + pago resto → `PAGADA` | `devolucionParcialMasPagoRestoDejaPagada` | ✅ |
| 9 | Flag `vencida` derivado | `flagVencidaDerivado` | ✅ |
| 10 | Compra cancelada en `PENDIENTE` → no CxP | `compraCreditoCanceladaPendienteNoCreaCxp` | ✅ |

**Comportamiento documentado (caso 10):**  
La CxP solo nace en `completar` de compra `CREDITO`. Cancelar una compra aún `PENDIENTE` no crea (ni anula) CxP porque la obligación financiera nunca existió.

---

## 3. Documentación

Ajustes en `FASE_3_15_13_A_AUDITORIA_CXP.md`:
- Sustituidas alusiones a “Contabilidad ERP / módulo contable” por alcance técnico operativo.
- Clarificado: *la devolución reduce la obligación pendiente sin registrarse como pago, manteniendo separadas las operaciones físicas y financieras*.

---

## 4. `mvn clean test`

```text
CxPServiceTest: Tests run: 13, Failures: 0, Errors: 0
mvn clean test:
  exit_code = 0
  surefire aggregate: suites=46 tests=377 failures=0 errors=0
  (13 CxPServiceTest incluidos; +6 respecto a la suite previa 371)
```

---

## 5. Declaración

```text
FASE 3.15.13-QA — CIERRE CxP
Estado: PASS
Domain validation: ACTIVA (antes del clamp)
Matriz 10/10: CUBIERTA
```
