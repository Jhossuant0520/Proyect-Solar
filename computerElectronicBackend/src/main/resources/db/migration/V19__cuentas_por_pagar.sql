-- =====================================================================
-- FASE 3.15.13-B — Cuentas por Pagar (CxP)
-- Tablas: cuentas_por_pagar, pagos_cxp
-- Diseño: FASE_3_15_13_A_AUDITORIA_CXP.md
-- =====================================================================

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
    id                   BIGINT         NOT NULL AUTO_INCREMENT,
    compra_id            BIGINT         NOT NULL,
    proveedor_id         BIGINT         NOT NULL,
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

CREATE TABLE IF NOT EXISTS pagos_cxp (
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
