# SOLVIX — FASE 3.15.13-A
## AUDITORÍA Y DISEÑO — CUENTAS POR PAGAR (CxP)

**Tipo:** AUDITORÍA / DISEÑO (sin implementación)  
**Fecha:** 2026-10-05  
**Predecesora:** 3.15.11 (Compras enriquecidas — condiciones de pago) · 3.15.12 (Reportes MVP cerrado)  
**Alcance:** Controlar *a quién se le debe, cuánto, cuándo vence y los abonos*.  
**Fuera de alcance:** Asientos contables, conciliación bancaria, CxC, Power BI. CxP solo gestiona obligaciones operativas y abonos.

---

## 0. Prohibiciones de esta fase (cumplidas)

| Prohibición | Estado |
|-------------|--------|
| Crear entidades JPA / controladores CxP | **No creado** |
| Crear migraciones Flyway | **No creado** (próxima candidata conceptual: **V19**) |
| Libro de asientos / módulo de contabilidad | **No diseñado** |
| Acoplar `InventarioService` / flujo físico de repuestos a CxP | **Prohibido** (zero-touch) |

---

## 1. Objetivo

Auditar el modelo actual de **Compra** y **DevolucionCompra**, y diseñar la arquitectura de **Cuentas por Pagar** para el flujo:

```text
Compra (CREDITO) → completar → Genera CuentaPorPagar
                              → Recibe Pagos (abonos)
                              → Devoluciones reducen obligación
                              → Actualiza saldo / estado
```

---

## 2. Hallazgos — estado actual

### 2.1 Compra (dominio operativo + términos comerciales)

**Entidad:** `Compra` · tabla `compras` (V1 + enriquecimiento V18).

| Campo | Tipo / notas | Rol hoy |
|-------|--------------|---------|
| `total` | `DECIMAL(14,2)` | Obligación económica de la compra. Post‑11: `total = subtotal − descuento + impuestoTotal` |
| `estado` | `EstadoCompra` | `PENDIENTE → COMPLETADA` / `CANCELADA`; post‑devolución `PARCIALMENTE_DEVUELTA` / `DEVUELTA` |
| `condicionPagoAplicada` | `CONTADO` \| `CREDITO` | Congelada al crear (request o default del proveedor) |
| `diasCreditoAplicados` | `Integer` | Obligatorio si `CREDITO`; `null` si `CONTADO` |
| `fechaVencimiento` | `LocalDateTime` | Calculada (`fecha + días`) o enviada; **solo semántica documental hoy** |
| `proveedor` + snapshots | FK + nombre/documento | A quién se le compró |
| `fechaCompletada` / `fechaAnulada` | timestamps | Ciclo operativo |

**Máquina operativa actual (`EstadoCompra`):**

```text
PENDIENTE ──completar──► COMPLETADA ──devolver parcial──► PARCIALMENTE_DEVUELTA ──devolver resto──► DEVUELTA
    │
    └──cancelar──► CANCELADA
```

- `completar`: mueve inventario (`InventarioService.registrarMovimiento` COMPRA) y costeo. **No crea obligación financiera.**
- `cancelar`: solo desde `PENDIENTE` (sin stock). **No hay CxP que anular.**
- La compra **nunca recalcula** `total` tras devoluciones (invariante histórico).

**Hueco CxP:** existen condiciones de crédito y vencimiento, pero **no hay entidad, saldo, abonos ni estados de pago**. `fechaVencimiento` es informativa.

### 2.2 DevolucionCompra (impacto económico vs inventario)

**Entidad:** `DevolucionCompra` · tabla `devoluciones_compra`.

| Campo | Rol |
|-------|-----|
| `montoTotalDevuelto` | Importe económico recuperable / restable a la compra bruta (prorrateo sobre `Compra.total`, incluye IVA) |
| `costoTotalDevuelto` | Costo de inventario revertido (sin prorrateo de descuento; distinto del monto económico) |
| `estado` | `REGISTRADA` \| `REEMBOLSADA` (mercancía ya salió; reembolso = compensación del proveedor) |
| `metodoReembolso` | `EFECTIVO`, `TRANSFERENCIA`, `TARJETA`, `NOTA_CREDITO`, `CAMBIO_PRODUCTO` |

**Efectos actuales al registrar:**

1. Stock ↓ vía `InventarioService` (`DEVOLUCION_COMPRA`) — **flujo físico**.
2. `DetalleCompra.cantidadDevuelta` ↑.
3. Documento económico con `montoTotalDevuelto`.
4. Analytics: compras netas = brutas − devoluciones.
5. **Ningún efecto sobre una “deuda por pagar”** (no existe).

**Implicación para CxP (ejemplo del brief):**  
Compra a crédito $100 → CxP saldo $100. Devolución mercancía $20 → la obligación neta debe quedar en **$80**, sin alterar `Compra.total` histórico ($100).

### 2.3 Proveedor

`condicionPago` / `diasCredito` son **defaults de maestro**. La compra congela `condicionPagoAplicada` / `diasCreditoAplicados`. CxP debe anclarse a la **compra**, no al maestro vivo.

### 2.4 Pagos existentes

- `MetodoPago` existe en **Ventas** (`EFECTIVO`, `TRANSFERENCIA`, `TARJETA`, `CREDITO`, `OTRO`).
- **No hay** tabla de pagos a proveedores ni CxC simétrica.

### 2.5 Zero-touch inventario / repuestos

| Componente | Relación con CxP propuesta |
|------------|----------------------------|
| `InventarioService` | **Cero toque.** Sigue solo movimientos de stock/costo. |
| `CompraService.completar` | Tras inventario exitoso, **orquesta** creación CxP (capa comercial/financiera). |
| `DevolucionCompraService.registrar` | Tras inventario, **notifica** a CxPService el abono por devolución. |
| OT / repuestos / entregas | **Ignorantes** de CxP. |

Patrón: *Inventario no conoce finanzas; finanzas reaccionan a hechos comerciales ya confirmados.*

---

## 3. Decisiones de diseño

### 3.1 ¿Cuándo nace la CuentaPorPagar?

| Evento | ¿Genera CxP? |
|--------|--------------|
| `Compra` creada `PENDIENTE` | **No** (aún no hay recepción / compromiso inventariado) |
| `completar` + `condicionPagoAplicada = CREDITO` | **Sí** — 1:1 con la compra |
| `completar` + `CONTADO` | **No** (pagado al momento; fuera del libro CxP MVP) |
| `cancelar` compra `PENDIENTE` | N/A (no había CxP) |
| Compra histórica CREDIT completada **antes** de 13-B | Backfill opcional en 13-B (script/job); fuera del diseño mínimo si se documenta riesgo |

**Justificación:** alinear el nacimiento de la deuda con el hecho que hoy ya es “compra realizada” (`esCompraRealizada()` tras `COMPLETADA`).

### 3.2 Cardinalidad

- **CuentaPorPagar 1:1 Compra** (`compra_id UNIQUE`).
- **PagoCxP N:1 CuentaPorPagar**.
- Devoluciones: **N documentos** por compra; CxP acumula `Σ montoTotalDevuelto` como reducción de obligación (no se modela 1 pago por devolución salvo que `metodoReembolso = NOTA_CREDITO` se quiera auditar — ver §4.3).

### 3.3 Máquina de estados — evaluación

Estados solicitados: `PENDIENTE`, `PARCIALMENTE_PAGADA`, `PAGADA`, `VENCIDA`, `ANULADA`.

| Estado | Definición propuesta | Observación |
|--------|----------------------|-------------|
| `PENDIENTE` | `saldo_pendiente > 0` y `total_pagado = 0` | Saldo “intacto” respecto de abonos en efectivo/transferencia |
| `PARCIALMENTE_PAGADA` | `0 < saldo_pendiente` y `total_pagado > 0` | |
| `PAGADA` | `saldo_pendiente = 0` | Incluye caso “todo cubierto por devoluciones” |
| `VENCIDA` | Ver abajo | **Ortogonal** a parcial/pendiente |
| `ANULADA` | CxP invalidada | En MVP casi no se usa (cancelación es pre‑completar) |

**Problema de `VENCIDA` como estado exclusivo:** una CxP puede estar *parcialmente pagada* **y** vencida a la vez. Si `VENCIDA` reemplaza `PARCIALMENTE_PAGADA`, se pierde el avance de pago.

**Resolución adoptada para 13-B:**

1. **Estado persistido (`estado`):**  
   `PENDIENTE` | `PARCIALMENTE_PAGADA` | `PAGADA` | `ANULADA`
2. **Indicador derivado / filtro `vencida`:**  
   `vencida = (estado ∉ {PAGADA, ANULADA}) ∧ (ahora > fecha_vencimiento) ∧ (saldo_pendiente > 0)`
3. En listados/API se expone `estado` + `vencida: boolean` (y opcionalmente `estadoEfectivo` de solo lectura = `VENCIDA` si aplica, para UI).

Así se cumple el espíritu del brief sin colisionar estados.

**`ANULADA`:** reservado. Triggers MVP: ninguno automático (compra cancelable solo en `PENDIENTE`). Uso futuro: anulación administrativa de CxP errónea o void de compra completada (fuera de alcance). Compra `DEVUELTA` total → CxP queda **`PAGADA`** (saldo 0), no `ANULADA`.

---

## 4. Reglas de negocio (saldo exacto)

### 4.1 Definiciones monetarias (escala 2, HALF_UP — mismo criterio comercial)

```text
saldo_inicial     = Compra.total          // congelado al crear CxP
total_devoluciones = Σ DevolucionCompra.montoTotalDevuelto  // de esa compra
obligacion_neta   = max(0, saldo_inicial − total_devoluciones)
total_pagado      = Σ PagoCxP.valor       // abonos registrados (no anulados)
saldo_pendiente   = max(0, obligacion_neta − total_pagado)
```

**Ejemplo:** compra $100, devolución $20, pago $30 →  
`obligacion_neta = 80`, `saldo_pendiente = 50`.

### 4.2 Transiciones de `estado` (persistido)

Tras cada pago, devolución o recálculo:

```text
si ANULADA → no recalcular
si saldo_pendiente == 0 → PAGADA
si total_pagado == 0 y saldo_pendiente > 0 → PENDIENTE
si total_pagado > 0 y saldo_pendiente > 0 → PARCIALMENTE_PAGADA
```

`vencida` se recalcula en lectura o al listar (no requiere job inmediato; job opcional 13-C).

### 4.3 Devoluciones y `MetodoReembolso`

| Situación | Efecto en CxP |
|-----------|---------------|
| Cualquier `DevolucionCompra` registrada sobre compra con CxP | Reduce `obligacion_neta` en `montoTotalDevuelto` |
| `NOTA_CREDITO` / sin reembolso cash | Equivale a abono mercadería contra deuda (ya cubierto por la fórmula) |
| `EFECTIVO` / `TRANSFERENCIA` tras deuda ya pagada | Puede generar `obligacion_neta < total_pagado` → `saldo_pendiente = 0` y **sobrante** (riesgo: “saldo a favor” no modelado en MVP) |

**Regla MVP ante sobrante:** clamp `saldo_pendiente ≥ 0`; no crear CxC automática; documentar alerta en 13-B si `total_pagado > obligacion_neta`.

**No** crear `PagoCxP` automático por devolución (evita doble conteo).
La devolución reduce la obligación pendiente sin registrarse como pago,
manteniendo separadas las operaciones físicas (inventario) y financieras (CxP).

### 4.4 Pagos (`PagoCxP`)

- `valor > 0`, escala 2.
- `valor ≤ saldo_pendiente` al momento del registro (rechazar sobrepago en MVP; o permitir y marcar sobrante — **recomendación: rechazar**).
- Métodos reutilizables sin `CREDITO`: `EFECTIVO`, `TRANSFERENCIA`, `TARJETA`, `OTRO` (enum `MetodoPagoCxP` o subset de `MetodoPago`).
- Soft-delete / anulación de pago: opcional 13-B (`anulado_at`); si se anula, recalcular saldo.

### 4.5 Invariantes

1. A lo sumo **una** CxP por `compra_id`.
2. CxP solo si compra `CREDITO` y estado de compra ∈ realizados (`COMPLETADA` | `PARCIALMENTE_DEVUELTA` | `DEVUELTA`).
3. `fecha_vencimiento` CxP = copia de `Compra.fechaVencimiento` al nacer (snapshot); no se reescribe si cambia el maestro proveedor.
4. `InventarioService` **no** importa ni llama a CxP.
5. Analytics de compras **no** se modifica en 13-A/B salvo consumo futuro de saldos (fuera de MVP CxP).

---

## 5. Modelo de datos propuesto (SQL conceptual — **no migrar aún**)

> Candidata Flyway futura: **`V19__cuentas_por_pagar.sql`** (no crear en 13-A).

### 5.1 `cuentas_por_pagar`

```sql
CREATE TABLE cuentas_por_pagar (
    id                   BIGINT         NOT NULL AUTO_INCREMENT,
    compra_id            BIGINT         NOT NULL,
    proveedor_id         BIGINT         NOT NULL,
    -- Snapshots de lectura rápida (auditoría / listados)
    compra_numero        VARCHAR(30)    NOT NULL,
    proveedor_nombre     VARCHAR(150)   NOT NULL,
    moneda               VARCHAR(3)     NOT NULL DEFAULT 'COP',
    saldo_inicial        DECIMAL(14,2)  NOT NULL,
    total_devoluciones   DECIMAL(14,2)  NOT NULL DEFAULT 0.00,
    total_pagado         DECIMAL(14,2)  NOT NULL DEFAULT 0.00,
    saldo_pendiente      DECIMAL(14,2)  NOT NULL,
    fecha_vencimiento    DATETIME(6)    NULL,
    estado               VARCHAR(30)    NOT NULL,
    created_at           DATETIME(6)    NOT NULL,
    updated_at           DATETIME(6)    NULL,
    created_by           VARCHAR(100)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_cxp_compra UNIQUE (compra_id),
    CONSTRAINT fk_cxp_compra FOREIGN KEY (compra_id) REFERENCES compras (id),
    CONSTRAINT fk_cxp_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
    CONSTRAINT chk_cxp_estado CHECK (
        estado IN ('PENDIENTE', 'PARCIALMENTE_PAGADA', 'PAGADA', 'ANULADA')),
    CONSTRAINT chk_cxp_montos CHECK (
        saldo_inicial >= 0
        AND total_devoluciones >= 0
        AND total_pagado >= 0
        AND saldo_pendiente >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_cxp_proveedor ON cuentas_por_pagar (proveedor_id);
CREATE INDEX idx_cxp_estado ON cuentas_por_pagar (estado);
CREATE INDEX idx_cxp_vencimiento ON cuentas_por_pagar (fecha_vencimiento);
CREATE INDEX idx_cxp_saldo ON cuentas_por_pagar (saldo_pendiente);
```

**Nota:** `total_devoluciones` / `total_pagado` / `saldo_pendiente` son **materializados** para listados; fuente de verdad recalculable desde devoluciones + `pagos_cxp`.

### 5.2 `pagos_cxp`

```sql
CREATE TABLE pagos_cxp (
    id                   BIGINT         NOT NULL AUTO_INCREMENT,
    cuenta_por_pagar_id  BIGINT         NOT NULL,
    valor                DECIMAL(14,2)  NOT NULL,
    fecha                DATETIME(6)    NOT NULL,
    metodo_pago          VARCHAR(30)    NOT NULL,
    referencia           VARCHAR(120)   NULL,
    observacion          VARCHAR(1000)  NULL,
    anulado_at           DATETIME(6)    NULL,
    created_at           DATETIME(6)    NOT NULL,
    updated_at           DATETIME(6)    NULL,
    created_by           VARCHAR(100)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_pago_cxp_cuenta FOREIGN KEY (cuenta_por_pagar_id)
        REFERENCES cuentas_por_pagar (id),
    CONSTRAINT chk_pago_cxp_valor CHECK (valor > 0),
    CONSTRAINT chk_pago_cxp_metodo CHECK (
        metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_pagos_cxp_cuenta ON pagos_cxp (cuenta_por_pagar_id);
CREATE INDEX idx_pagos_cxp_fecha ON pagos_cxp (fecha);
```

### 5.3 Entidades conceptuales (para 13-B — no implementar aquí)

```text
CuentaPorPagar
  - id, compra (1:1), proveedor
  - saldoInicial, totalDevoluciones, totalPagado, saldoPendiente
  - fechaVencimiento, estado, moneda, snapshots, audit

PagoCxP
  - id, cuentaPorPagar (N:1)
  - valor, fecha, metodoPago, referencia, observacion
  - anuladoAt?, audit
```

---

## 6. Arquitectura de servicios (13-B)

```text
                    ┌─────────────────────┐
  completar CREDITO │   CompraService     │── inventarios (sin cambio)
                    └──────────┬──────────┘
                               │ crea
                               ▼
                    ┌─────────────────────┐
                    │    CxPService       │◄── registrarPago
                    │  (única lógica CxP) │◄── aplicarDevolucion(monto)
                    └──────────▲──────────┘
                               │
  registrar devolución         │
                    ┌──────────┴──────────┐
                    │ DevolucionCompraSvc │── inventarios (sin cambio)
                    └─────────────────────┘
```

- **No** inyectar `CxPService` en `InventarioService`.
- Preferible: `CompraService` / `DevolucionCompraService` llaman a `CxPService` (orquestación delgada) **o** evento de dominio interno; evitar ciclo de dependencias.

---

## 7. Contratos de API propuestos (FASE 3.15.13-B)

Base: `/api/v1/cxp` · `@PreAuthorize("hasRole('ADMIN')")` · JWT.

### 7.1 Listado y detalle

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/cxp` | Listado. Query: `proveedorId`, `estado`, `vencida` (bool), `desde`, `hasta` (vencimiento o creación) |
| `GET` | `/api/v1/cxp/{id}` | Detalle + totales + lista de pagos |
| `GET` | `/api/v1/cxp/por-compra/{compraId}` | Lookup 1:1 (404 si CONTADO / inexistente) |

**`CuentaPorPagarResponseDTO` (campos mínimos):**

```json
{
  "id": 1,
  "compraId": 10,
  "compraNumero": "C-2026-00012",
  "proveedorId": 3,
  "proveedorNombre": "Prov XYZ",
  "moneda": "COP",
  "saldoInicial": 100.00,
  "totalDevoluciones": 20.00,
  "totalPagado": 30.00,
  "saldoPendiente": 50.00,
  "fechaVencimiento": "2026-11-01T00:00:00",
  "estado": "PARCIALMENTE_PAGADA",
  "vencida": false,
  "pagos": [ /* PagoCxPResponseDTO */ ]
}
```

### 7.2 Pagos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/cxp/{id}/pagos` | Registrar abono |
| `GET` | `/api/v1/cxp/{id}/pagos` | Historial |
| `POST` | `/api/v1/cxp/pagos/{pagoId}/anular` | Opcional MVP+ |

**`PagoCxPRequestDTO`:**

```json
{
  "valor": 30.00,
  "fecha": "2026-10-05T15:00:00",
  "metodoPago": "TRANSFERENCIA",
  "referencia": "TRX-9988",
  "observacion": "Abono factura proveedor"
}
```

### 7.3 Resumen operativo (opcional 13-B)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/cxp/resumen` | Totales: por pagar, vencido, pagado en período |

### 7.4 Integración implícita (sin endpoint CxP)

| Hook comercial | Comportamiento 13-B |
|----------------|---------------------|
| `POST /api/v1/compras/{id}/completar` | Si `CREDITO` → crear CxP (`saldo_inicial = total`, estado `PENDIENTE`) |
| `POST /api/v1/compras/{id}/devoluciones` | Si existe CxP → `aplicarDevolucion(montoTotalDevuelto)` y recalcular estado |

No se exponen endpoints de “crear CxP manual” en MVP (evita desalineación con compras).

---

## 8. Frontend (solo diseño — no implementar en 13-A)

- Menú admin: **Cuentas por pagar** (listado + filtros vencidas).
- Detalle: KPIs de saldo + tabla de pagos + CTA “Registrar pago”.
- En detalle de compra `CREDITO` completada: enlace “Ver CxP” si existe.
- Zero-touch UI de inventario / OT.

---

## 9. Plan de implementación sugerido

| Subfase | Contenido |
|---------|-----------|
| **3.15.13-B** | Flyway V19, entidades, `CxPService`, hooks en completar/devolver, API, tests de saldo/estados |
| **3.15.13-C** | FE listado/detalle/pago + validación QA (401/403, consistencia saldo) |
| Futuro | Backfill históricas, job nocturno `vencida`, saldo a favor, CxC simétrica |

---

## 10. Riesgos y supuestos

| ID | Riesgo | Mitigación |
|----|--------|------------|
| R1 | Compras `CREDITO` ya `COMPLETADA` sin CxP | Backfill opcional documentado en 13-B |
| R2 | `VENCIDA` vs parcial | Estado persistido + flag `vencida` |
| R3 | Sobrepago / devolución tras pago total | Rechazar sobrepago; clamp saldo; no CxC automática |
| R4 | `CONTADO` mal categorizado | No crea CxP; corrección es dato de compra, no CxP |
| R5 | Acoplar inventario por error | Code review: cero imports CxP en `InventarioService` |
| R6 | Doble conteo devolución como pago | Devolución = ajuste de obligación, nunca `PagoCxP` auto |

---

## 11. Declaración de cierre 13-A

```text
FASE 3.15.13-A — AUDITORÍA / DISEÑO CxP
Estado: COMPLETADA (documento únicamente)
Implementación JPA / Flyway / API: NO iniciada
Inventario / repuestos: ZERO-TOUCH preservado en el diseño
Siguiente: 3.15.13-B (implementación backend del diseño aquí aprobado)
```

**Documento:** `docs/backend/FASE_3_15_13_A_AUDITORIA_CXP.md`
