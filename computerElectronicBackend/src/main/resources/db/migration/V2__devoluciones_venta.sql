-- =====================================================================
-- SOLVIX — Devoluciones de venta como documento económico propio
-- Motor: MySQL 8.x
-- Requiere: V1__fase1_gestion_comercial.sql ya aplicado
-- =====================================================================
-- OBJETIVO:
--   La venta original conserva su importe histórico. La devolución se registra
--   aparte con su propio monto, para que analytics obtenga:
--       ventas netas = ventas brutas - devoluciones
--
-- NO destructivo: no altera ni recalcula ninguna fila de `ventas`.
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- ETAPA 1 — AMPLIAR CATÁLOGOS EXISTENTES
-- La devolución necesita su propia serie de numeración (D-{yyyy}-{seq})
-- y su propio tipo de referencia en el libro de inventario.
-- =====================================================================

ALTER TABLE secuencias_documento DROP CHECK chk_secuencias_tipo;
ALTER TABLE secuencias_documento
    ADD CONSTRAINT chk_secuencias_tipo
        CHECK (tipo IN ('VENTA', 'COMPRA', 'DEVOLUCION_VENTA'));

ALTER TABLE movimientos_inventario DROP CHECK chk_movimientos_referencia;
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT chk_movimientos_referencia
        CHECK (referencia_tipo IN (
            'VENTA', 'COMPRA', 'DEVOLUCION_VENTA', 'AJUSTE_MANUAL', 'CARGA_INICIAL'));

-- =====================================================================
-- ETAPA 2 — CABECERA DE DEVOLUCIÓN
-- =====================================================================

CREATE TABLE IF NOT EXISTS devoluciones_venta (
    id                      BIGINT        NOT NULL AUTO_INCREMENT,
    numero                  VARCHAR(30)   NOT NULL,
    venta_id                BIGINT        NOT NULL,
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
    created_by              VARCHAR(100)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_devoluciones_venta_numero UNIQUE (numero),
    CONSTRAINT fk_devoluciones_venta_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
    CONSTRAINT chk_devoluciones_venta_estado CHECK (estado IN ('REGISTRADA', 'REEMBOLSADA')),
    CONSTRAINT chk_devoluciones_venta_motivo CHECK (motivo IN (
        'PRODUCTO_DEFECTUOSO', 'PRODUCTO_INCORRECTO', 'INSATISFACCION_CLIENTE',
        'ERROR_EN_VENTA', 'GARANTIA', 'OTRO')),
    CONSTRAINT chk_devoluciones_venta_reembolso CHECK (metodo_reembolso IS NULL OR metodo_reembolso IN (
        'EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'NOTA_CREDITO', 'CAMBIO_PRODUCTO')),
    CONSTRAINT chk_devoluciones_venta_montos CHECK (
        monto_total_devuelto >= 0 AND costo_total_devuelto >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_devoluciones_venta_venta  ON devoluciones_venta (venta_id);
CREATE INDEX idx_devoluciones_venta_fecha  ON devoluciones_venta (fecha);
CREATE INDEX idx_devoluciones_venta_motivo ON devoluciones_venta (motivo);
CREATE INDEX idx_devoluciones_venta_estado ON devoluciones_venta (estado);

-- =====================================================================
-- ETAPA 3 — DETALLE DE DEVOLUCIÓN
-- No repite nombre ni categoría del producto: ya viven congelados en
-- detalle_venta, al que esta tabla apunta directamente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS detalle_devolucion_venta (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    devolucion_id    BIGINT        NOT NULL,
    detalle_venta_id BIGINT        NOT NULL,
    producto_id      BIGINT        NOT NULL,
    cantidad         INT           NOT NULL,
    monto_devuelto   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    costo_unitario   DECIMAL(14,2) NULL,
    costo_conocido   BIT(1)        NOT NULL DEFAULT b'0',
    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_devolucion_devolucion FOREIGN KEY (devolucion_id)
        REFERENCES devoluciones_venta (id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_devolucion_detalle_venta FOREIGN KEY (detalle_venta_id)
        REFERENCES detalle_venta (id),
    CONSTRAINT fk_detalle_devolucion_producto FOREIGN KEY (producto_id)
        REFERENCES productos (id),
    CONSTRAINT chk_detalle_devolucion_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_devolucion_monto    CHECK (monto_devuelto >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalle_devolucion_devolucion ON detalle_devolucion_venta (devolucion_id);
CREATE INDEX idx_detalle_devolucion_detalle    ON detalle_devolucion_venta (detalle_venta_id);
CREATE INDEX idx_detalle_devolucion_producto   ON detalle_devolucion_venta (producto_id);

-- =====================================================================
-- ETAPA 4 — VERIFICACIÓN
-- =====================================================================
-- 4.a La suma de devoluciones nunca puede superar el total de su venta.
--     Debe devolver 0 filas.
--
--   SELECT v.numero, v.total, SUM(d.monto_total_devuelto) AS devuelto
--   FROM ventas v
--   JOIN devoluciones_venta d ON d.venta_id = v.id
--   GROUP BY v.id, v.numero, v.total
--   HAVING SUM(d.monto_total_devuelto) > v.total + 0.01;
--
-- 4.b Las unidades devueltas registradas deben cuadrar con cantidad_devuelta.
--     Debe devolver 0 filas.
--
--   SELECT dv.id, dv.cantidad_devuelta, COALESCE(SUM(ddv.cantidad), 0) AS registrado
--   FROM detalle_venta dv
--   LEFT JOIN detalle_devolucion_venta ddv ON ddv.detalle_venta_id = dv.id
--   GROUP BY dv.id, dv.cantidad_devuelta
--   HAVING dv.cantidad_devuelta <> COALESCE(SUM(ddv.cantidad), 0);
--
-- 4.c Consulta base de FASE 2 (ventas netas por período):
--
--   SELECT
--       DATE_FORMAT(v.fecha, '%Y-%m')                          AS periodo,
--       SUM(v.total)                                           AS ventas_brutas,
--       COALESCE(SUM(dev.devuelto), 0)                         AS devoluciones,
--       SUM(v.total) - COALESCE(SUM(dev.devuelto), 0)          AS ventas_netas
--   FROM ventas v
--   LEFT JOIN (
--       SELECT venta_id, SUM(monto_total_devuelto) AS devuelto
--       FROM devoluciones_venta GROUP BY venta_id
--   ) dev ON dev.venta_id = v.id
--   WHERE v.estado IN ('COMPLETADA', 'PARCIALMENTE_DEVUELTA', 'DEVUELTA')
--   GROUP BY periodo
--   ORDER BY periodo;
-- =====================================================================
