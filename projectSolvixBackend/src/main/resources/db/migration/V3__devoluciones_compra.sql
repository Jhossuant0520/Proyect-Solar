-- =====================================================================
-- SOLVIX — Devoluciones de compra como documento económico propio
-- Motor: MySQL 8.x
-- Requiere: V1__fase1_gestion_comercial.sql y V2__devoluciones_venta.sql
-- =====================================================================
-- OBJETIVO:
--   La compra original conserva su importe histórico. La devolución al
--   proveedor se registra aparte con su propio monto, para que analytics
--   obtenga:
--       compras netas = compras brutas - devoluciones de compra
--
-- NO destructivo: no altera ni recalcula ninguna fila de `compras`,
-- `detalle_compra`, `ventas` ni `devoluciones_venta`.
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- ETAPA 1 — AMPLIAR CATÁLOGOS EXISTENTES
-- La devolución de compra necesita su propia serie de numeración
-- (DC-{yyyy}-{seq}) y su propio tipo de referencia en el libro de inventario.
-- Hasta ahora el movimiento DEVOLUCION_COMPRA apuntaba a la compra; desde
-- V3 apunta al documento de devolución, que es su origen real.
-- =====================================================================

ALTER TABLE secuencias_documento DROP CHECK chk_secuencias_tipo;
ALTER TABLE secuencias_documento
    ADD CONSTRAINT chk_secuencias_tipo
        CHECK (tipo IN ('VENTA', 'COMPRA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA'));

ALTER TABLE movimientos_inventario DROP CHECK chk_movimientos_referencia;
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT chk_movimientos_referencia
        CHECK (referencia_tipo IN (
            'VENTA', 'COMPRA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA',
            'AJUSTE_MANUAL', 'CARGA_INICIAL'));

-- =====================================================================
-- ETAPA 2 — CABECERA DE DEVOLUCIÓN DE COMPRA
-- monto_total_devuelto: importe recuperado, ya con el descuento de
--   cabecera prorrateado. Es el valor que se resta a la compra bruta.
-- costo_total_devuelto: costo de inventario revertido (costo histórico
--   por unidades). Difiere del anterior cuando hubo descuento de cabecera.
-- =====================================================================

CREATE TABLE IF NOT EXISTS devoluciones_compra (
    id                      BIGINT        NOT NULL AUTO_INCREMENT,
    numero                  VARCHAR(30)   NOT NULL,
    compra_id               BIGINT        NOT NULL,
    fecha                   DATETIME(6)   NOT NULL,
    motivo                  VARCHAR(40)   NOT NULL,
    estado                  VARCHAR(30)   NOT NULL,
    metodo_reembolso        VARCHAR(30)   NULL,
    fecha_reembolso         DATETIME(6)   NULL,
    monto_total_devuelto    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    costo_total_devuelto    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    costo_completo_conocido BIT(1)        NOT NULL DEFAULT b'1',
    observaciones           VARCHAR(1000) NULL,
    created_at              DATETIME(6)   NOT NULL,
    updated_at              DATETIME(6)   NULL,
    created_by              VARCHAR(100)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_devoluciones_compra_numero UNIQUE (numero),
    CONSTRAINT fk_devoluciones_compra_compra FOREIGN KEY (compra_id) REFERENCES compras (id),
    CONSTRAINT chk_devoluciones_compra_estado CHECK (estado IN ('REGISTRADA', 'REEMBOLSADA')),
    CONSTRAINT chk_devoluciones_compra_motivo CHECK (motivo IN (
        'PRODUCTO_DEFECTUOSO', 'PRODUCTO_INCORRECTO', 'EXCESO_DE_PEDIDO',
        'PRODUCTO_VENCIDO', 'ERROR_EN_COMPRA', 'GARANTIA', 'OTRO')),
    CONSTRAINT chk_devoluciones_compra_reembolso CHECK (metodo_reembolso IS NULL OR metodo_reembolso IN (
        'EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'NOTA_CREDITO', 'CAMBIO_PRODUCTO')),
    CONSTRAINT chk_devoluciones_compra_montos CHECK (
        monto_total_devuelto >= 0 AND costo_total_devuelto >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_devoluciones_compra_compra ON devoluciones_compra (compra_id);
CREATE INDEX idx_devoluciones_compra_fecha  ON devoluciones_compra (fecha);
CREATE INDEX idx_devoluciones_compra_motivo ON devoluciones_compra (motivo);
CREATE INDEX idx_devoluciones_compra_estado ON devoluciones_compra (estado);

-- =====================================================================
-- ETAPA 3 — DETALLE DE DEVOLUCIÓN DE COMPRA
-- No repite nombre ni categoría del producto: ya viven congelados en
-- detalle_compra, al que esta tabla apunta directamente.
-- costo_unitario proviene siempre de detalle_compra, nunca de
-- productos.costo_actual.
-- =====================================================================

CREATE TABLE IF NOT EXISTS detalle_devolucion_compra (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    devolucion_id     BIGINT        NOT NULL,
    detalle_compra_id BIGINT        NOT NULL,
    producto_id       BIGINT        NOT NULL,
    cantidad          INT           NOT NULL,
    monto_devuelto    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    costo_unitario    DECIMAL(14,2) NULL,
    costo_conocido    BIT(1)        NOT NULL DEFAULT b'0',
    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_devolucion_compra_devolucion FOREIGN KEY (devolucion_id)
        REFERENCES devoluciones_compra (id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_devolucion_compra_detalle FOREIGN KEY (detalle_compra_id)
        REFERENCES detalle_compra (id),
    CONSTRAINT fk_detalle_devolucion_compra_producto FOREIGN KEY (producto_id)
        REFERENCES productos (id),
    CONSTRAINT chk_detalle_devolucion_compra_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_devolucion_compra_monto    CHECK (monto_devuelto >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalle_devolucion_compra_devolucion ON detalle_devolucion_compra (devolucion_id);
CREATE INDEX idx_detalle_devolucion_compra_detalle    ON detalle_devolucion_compra (detalle_compra_id);
CREATE INDEX idx_detalle_devolucion_compra_producto   ON detalle_devolucion_compra (producto_id);

-- =====================================================================
-- ETAPA 4 — VERIFICACIÓN
-- =====================================================================
-- 4.a La suma de devoluciones nunca puede superar el total de su compra.
--     Debe devolver 0 filas.
--
--   SELECT c.numero, c.total, SUM(d.monto_total_devuelto) AS devuelto
--   FROM compras c
--   JOIN devoluciones_compra d ON d.compra_id = c.id
--   GROUP BY c.id, c.numero, c.total
--   HAVING SUM(d.monto_total_devuelto) > c.total + 0.01;
--
-- 4.b Las unidades devueltas registradas deben cuadrar con cantidad_devuelta.
--     Debe devolver 0 filas.
--
--   SELECT dc.id, dc.cantidad_devuelta, COALESCE(SUM(ddc.cantidad), 0) AS registrado
--   FROM detalle_compra dc
--   LEFT JOIN detalle_devolucion_compra ddc ON ddc.detalle_compra_id = dc.id
--   GROUP BY dc.id, dc.cantidad_devuelta
--   HAVING dc.cantidad_devuelta <> COALESCE(SUM(ddc.cantidad), 0);
--
-- 4.c Todo movimiento DEVOLUCION_COMPRA posterior a V3 debe apuntar a un
--     documento de devolución existente. Debe devolver 0 filas.
--
--   SELECT m.id, m.referencia_id
--   FROM movimientos_inventario m
--   LEFT JOIN devoluciones_compra d ON d.id = m.referencia_id
--   WHERE m.referencia_tipo = 'DEVOLUCION_COMPRA' AND d.id IS NULL;
--
-- 4.d Consulta base de FASE 2 (compras netas por período):
--
--   SELECT
--       DATE_FORMAT(c.fecha, '%Y-%m')                          AS periodo,
--       SUM(c.total)                                           AS compras_brutas,
--       COALESCE(SUM(dev.devuelto), 0)                         AS devoluciones,
--       SUM(c.total) - COALESCE(SUM(dev.devuelto), 0)          AS compras_netas
--   FROM compras c
--   LEFT JOIN (
--       SELECT compra_id, SUM(monto_total_devuelto) AS devuelto
--       FROM devoluciones_compra GROUP BY compra_id
--   ) dev ON dev.compra_id = c.id
--   WHERE c.estado IN ('COMPLETADA', 'PARCIALMENTE_DEVUELTA', 'DEVUELTA')
--   GROUP BY periodo
--   ORDER BY periodo;
-- =====================================================================
