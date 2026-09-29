-- =====================================================================
-- SOLVIX — BLOQUE D.2 Firma digital de recepción de orden de servicio
-- Motor: MySQL 8.x
-- Requiere: V1..V13 aplicadas
-- =====================================================================
-- Una recepción firmada por OT (UNIQUE orden_servicio_id).
-- Independiente de entregas_orden_servicio (firma de devolución al cliente).
-- firma_url: ruta relativa pública administrada por EntregaFirmaService
--            con prefijo /recepciones/firmas/ (distinto de /entregas/firmas/).
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS recepciones_orden_servicio (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    orden_servicio_id       BIGINT         NOT NULL,
    fecha_recepcion         DATETIME(6)    NOT NULL,
    usuario_responsable     VARCHAR(100)   NOT NULL,
    cliente_confirmo        BIT(1)         NOT NULL,
    nombre_cliente          VARCHAR(150)   NULL,
    documento_cliente       VARCHAR(50)    NULL,
    firma_url               VARCHAR(500)   NULL,
    observaciones           VARCHAR(1000)  NULL,
    created_at              DATETIME(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_recepciones_ot_orden UNIQUE (orden_servicio_id),
    CONSTRAINT fk_recepciones_ot_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_recepciones_ot_orden ON recepciones_orden_servicio (orden_servicio_id);
