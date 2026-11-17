-- =====================================================================
-- SOLVIX — FASE 3.15.5.3 Entrega digital de orden de servicio
-- Motor: MySQL 8.x
-- Requiere: V1..V9 aplicadas
-- =====================================================================
-- Una entrega por OT (UNIQUE orden_servicio_id).
-- firma_url: ruta relativa pública administrada por EntregaFirmaService.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS entregas_orden_servicio (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    orden_servicio_id       BIGINT         NOT NULL,
    fecha_entrega           DATETIME(6)    NOT NULL,
    usuario_responsable     VARCHAR(100)   NOT NULL,
    cliente_confirmo        BIT(1)         NOT NULL,
    nombre_cliente          VARCHAR(150)   NULL,
    documento_cliente       VARCHAR(50)    NULL,
    firma_url               VARCHAR(500)   NULL,
    observaciones           VARCHAR(1000)  NULL,
    created_at              DATETIME(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_entregas_ot_orden UNIQUE (orden_servicio_id),
    CONSTRAINT fk_entregas_ot_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_entregas_ot_orden ON entregas_orden_servicio (orden_servicio_id);
