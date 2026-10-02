# SOLVIX — FASE 3.15.11-C
## Validación, migración, regresión y cierre — Compras enriquecidas

**Tipo:** VALIDACIÓN / CIERRE  
**Base:** `docs/backend/FASE_3_15_11_B_COMPRAS_ENRIQUECIDAS.md`  
**Fecha:** 2026-10-02

---

## 1. Objetivo

Auditar, validar y cerrar la implementación de compras enriquecidas (3.15.11-B) sin agregar funcionalidades nuevas, corrigiendo únicamente defectos reales detectados frente a los criterios de esta fase.

---

## 2. Alcance validado

- Modelo `Compra` / `DetalleCompra` enriquecido
- Documento externo, OC, cotización proveedor
- Condiciones de pago aplicadas (snapshot)
- Fechas documentales / entrega / vencimiento
- IVA mínimo (tasa + cálculo backend)
- Snapshots proveedor y contacto
- Inventario / costos / devoluciones / analytics
- Migración `V18__compras_enriquecidas.sql` en MySQL real
- Frontend compra-form / compra-detail
- Tests y builds de regresión

---

## 3. Auditoría realizada

### Hallazgos confirmados (código + BD)

| Área | Resultado |
|------|-----------|
| Campos 11-B en entidad/DTO/servicio | Presentes y cableados |
| `Compra.numero` | Intacta (`C-{yyyy}-{seq}`) |
| Stock al crear/cancelar | No mueve |
| Completar | Mueve stock + costeo último costo |
| Devoluciones | Prorratean sobre `Compra.total`; costo = `costoUnitario` |
| Analytics | Sin rediseño; usa `total` / estado / fecha |
| V18 en MySQL | Columnas presentes; índice `idx_compras_num_doc_ext` |

### Defectos reales encontrados (justifican corrección)

1. **Doble fuente de verdad del IVA:** `CompraService` aceptaba `valorImpuesto` e `impuestoTotal` del request, permitiendo inconsistencias (ej. %19 + valor=1).
2. **UX IVA:** el formulario defaultaba `porcentajeImpuesto = 0` y usaba input numérico libre; el criterio oficial exige **19% predeterminado** y selección de tasa, no valor monetario manual.

### No defectos (sin cambio)

- Fórmula `total = subtotal − descuento + impuesto` (impuesto sobre subtotal de línea, descuento de cabecera después) — coherente con 11-B.
- CONTADO → días 0, vencimiento `null`.
- CREDITO → días > 0, vencimiento = `fecha + días` salvo override.
- Snapshots proveedor/contacto/costo.
- Inventario centralizado en `InventarioService`.

---

## 4. Migración V18

### Archivo

`src/main/resources/db/migration/V18__compras_enriquecidas.sql`

### Cómo aplicarla (Flyway NO cableado)

```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p solarfishdb < src\main\resources\db\migration\V18__compras_enriquecidas.sql
```

Alternativa operativa: `spring.jpa.hibernate.ddl-auto=update` puede crear columnas; V18 sigue siendo el script documentado e idempotente.

### Evidencia MySQL (`solarfishdb`) — 2026-10-02

Columnas cabecera verificadas:

- `tipo_documento_externo` (enum Hibernate: `FACTURA|OTRO|PEDIDO`, nullable)
- `numero_documento_externo` varchar(80) + índice `idx_compras_num_doc_ext`
- `numero_orden_compra`, `numero_cotizacion_proveedor`
- `fecha_documento_proveedor`, `fecha_entrega`, `fecha_vencimiento`
- `condicion_pago_aplicada`, `dias_credito_aplicados`
- `moneda` varchar(3) NOT NULL
- `contacto_proveedor_id`, `contacto_nombre_snapshot`
- `impuesto_total` decimal(14,2) NOT NULL

Columnas detalle:

- `referencia_proveedor` varchar(80) NULL
- `porcentaje_impuesto` decimal(7,2) NOT NULL
- `valor_impuesto` decimal(14,2) NOT NULL

Datos existentes al validar: **0 compras / 0 detalles / 0 devoluciones** → no hay históricos productivos que alterar. V18 no reescribe totales ni costos.

Nota: Hibernate ya había materializado parte del esquema (ENUM vs VARCHAR del script). V18 idempotente → no-op seguro cuando la columna existe.

---

## 5. Validación IVA

### Regla oficial confirmada tras corrección 11-C

| Concepto | Comportamiento |
|----------|----------------|
| Predeterminado UI | **19%** |
| Alternativa UI | **0%** (select) |
| Dato de negocio | `porcentajeImpuesto` |
| Valor monetario | calculado por backend: `subtotalLínea × % / 100` |
| `impuestoTotal` | `Σ valorImpuesto` de líneas |
| Total | `subtotal − descuento + impuestoTotal` |
| Request `valorImpuesto` / `impuestoTotal` | **ignorados** (compat deserialización) |
| Históricos | no se recalculan; sin IVA → 0 |

### Evidencia matemática (test)

`10 × 100000`, IVA 19%, descuento 0:

- subtotal = 1_000_000
- IVA = 190_000
- total = 1_190_000

Manipulación `valorImpuesto=1` + `impuestoTotal=999` → backend persiste 190_000 / 1_190_000.

IVA 0% + descuento 20 sobre subtotal 200 → total 180, impuesto 0.

---

## 6. Condiciones de pago

Validado por tests:

- CONTADO → `diasCreditoAplicados = 0`, `fechaVencimiento = null`
- CREDITO → días > 0, vencimiento = fecha + días
- Snapshot no cambia si el proveedor vivo cambia condición/nombre

---

## 7. Fechas

- `fecha` = negocio interna
- `fechaDocumentoProveedor` / `fechaEntrega` opcionales
- `fechaVencimiento` calculada o override explícito (regla 11-B intacta)

---

## 8. Snapshots

- `proveedorNombreSnapshot` / `proveedorDocumentoSnapshot` conservados
- `contactoNombreSnapshot` congelado al crear
- `costoUnitario` histórico inmutable (segunda compra actualiza `costoActual` sin alterar la primera)

---

## 9. Inventario

| Acción | Stock |
|--------|-------|
| Crear | no mueve |
| Completar | entra + movimiento COMPRA |
| Cancelar PENDIENTE | no mueve |
| Devolución | revierte vía `InventarioService` |

`InventarioService` sigue siendo el único mutador de stock.

---

## 10. Devoluciones

Sin cambio de regla en 11-C:

- Costo físico = `DetalleCompra.costoUnitario` (sin IVA)
- Monto económico prorratea sobre `Compra.total` (incluye IVA en compras nuevas)
- Compra original no se recalcula

Regresión `DevolucionCompraServiceTest`: **16/16 PASS**.

---

## 11. Analytics

`InventarioComprasAnalyticsServiceTest`: **17/17 PASS**.  
Sin columnas nuevas en queries que fallen. Semántica: métricas usan `Compra.total` (con IVA en compras nuevas). Documentado como riesgo residual consciente, no bug.

---

## 12. Backend/API

Contratos extendidos se mantienen. Campos request de impuesto monetario marcados `@Deprecated` e ignorados en servicio. Response sigue exponiendo `impuestoTotal`, `valorImpuesto`, etc.

No hay endpoint de edición de compra económica en el flujo validado (crear / completar / cancelar / consultar / listar / devoluciones).

---

## 13. Frontend

Tras corrección:

- Select IVA: `19%` | `0%` (default 19)
- Valor monetario mostrado como estimado (no editable)
- Request envía solo `porcentajeImpuesto`
- Detail muestra documento, fechas, condiciones, impuesto
- Compatibilidad visual con compras legacy (impuesto 0 / campos null)

---

## 14. Tests

### Backend (tras `mvn clean`)

| Suite | Run | Fail | Error | Skip |
|-------|-----|------|-------|------|
| CompraServiceTest | 11 | 0 | 0 | 0 |
| DevolucionCompraServiceTest | 16 | 0 | 0 | 0 |
| InventarioComprasAnalyticsServiceTest | 17 | 0 | 0 | 0 |
| AjusteCostoInventarioTest | 8 | 0 | 0 | 0 |
| ProveedorServiceTest | 9 | 0 | 0 | 0 |
| **Total** | **61** | **0** | **0** | **0** |

Comando:

```bat
mvn clean "-Dtest=CompraServiceTest,DevolucionCompraServiceTest,InventarioComprasAnalyticsServiceTest,AjusteCostoInventarioTest,ProveedorServiceTest" test
```

Resultado: **BUILD SUCCESS**.

### Frontend

```bat
npx ng test --no-watch --browsers=ChromeHeadless --include=**/compra-form.spec.ts --include=**/compra-detail.spec.ts --include=**/proveedor-list.spec.ts --include=**/proveedor-ui.spec.ts
```

**16/16 SUCCESS** (incluye defaults IVA 19% y no envío de `valorImpuesto`).

---

## 15. Builds

### Backend

```bat
mvn -DskipTests package
```

**BUILD SUCCESS**

### Frontend

```bat
npx ng build --configuration=production
```

**SUCCESS**  
Warning preexistente: budget inicial 1.50 MB no cumplido (~2.04 MB). No bloqueante.

---

## 16. Problemas encontrados

1. Request aceptaba `valorImpuesto` / `impuestoTotal` arbitrarios.
2. UI default IVA 0% y campo libre de porcentaje.
3. BD local sin compras históricas reales (0 filas) → validación histórica vía tests H2 + esquema MySQL.
4. Fallo temporal de tests por clases test stale (`Unresolved compilation problems` sin `clean`) — no es defecto de dominio; resuelto con `mvn clean test`.

---

## 17. Correcciones realizadas

Cambios mínimos justificados por criterios §3 y §6:

1. `CompraService`: siempre calcula `valorImpuesto` e `impuestoTotal` desde tasas/líneas; ignora valores monetarios del request.
2. DTOs request: `valorImpuesto` e `impuestoTotal` documentados como `@Deprecated` (compat JSON).
3. Frontend: select IVA 19/0, default 19; no envía valor monetario.
4. Tests backend/frontend añadidos/actualizados para manipulación, 0%, CONTADO/CRÉDITO y default UI.

No se refactorizó inventario, costeo, analytics ni estados.

---

## 18. Riesgos residuales

| Riesgo | Nivel | Nota |
|--------|-------|------|
| Analytics interpreta `total` con IVA en compras nuevas | Medio consciente | Sin rediseño en 11-C |
| Flyway no cableado | Operativo | Aplicar V18 manualmente o confiar en Hibernate + script |
| BD sin datos históricos productivos al validar | Bajo | Esquema OK; históricos reales pendientes de entorno con data |
| Tipos ENUM Hibernate vs VARCHAR V18 | Bajo | Idempotencia evita conflicto |

---

## 19. Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| V18 validada en MySQL real | OK |
| Sin pérdida/reescritura de históricos | OK (0 filas; script no destructivo) |
| Costos históricos intactos | OK |
| IVA 19% predeterminado UI | OK |
| Usuario no introduce valor IVA monetario | OK |
| Backend calcula/valida impuesto | OK |
| Sin contradicción % / valor | OK |
| IVA 0% funciona | OK |
| Históricos no recalculados | OK |
| Refs externas / condiciones / fechas / snapshots / COP | OK |
| Inventario: crear/completar/cancelar/devolver | OK |
| Regresión compras/devoluciones/analytics/API/FE | OK |
| Tests y builds documentados | OK |

---

## 20. Estado final de la fase

**PASS WITH RISKS**

3.15.11 (A auditoría + B implementación + C validación) queda **formalmente cerrada** para Compras enriquecidas.

No se inicia 3.15.12 en esta entrega.

---

## 3.15.11-C — RESULTADO

**Estado:** PASS WITH RISKS

**Implementado (validado):** dominio Compra enriquecido, V18 MySQL, IVA backend-authority, UI tasa 19/0, snapshots, inventario, devoluciones, analytics.

**Evidencia:** 61 tests backend PASS; 16 frontend PASS; builds PASS; columnas V18 verificadas en `solarfishdb`.

**Correcciones:** autoridad de cálculo IVA + UX tasa predeterminada 19%.

**Riesgos residuales:** analytics con IVA en totales nuevos; Flyway manual; entorno sin compras históricas productivas al momento de la validación.

**Recomendación de cierre:** cerrar 3.15.11. No continuar automáticamente a 3.15.12.

FIN DE FASE 3.15.11-C
