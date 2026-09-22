-- =====================================================================
-- SOLVIX — FASE 3.15.8 Documentos PDF / QR de orden de servicio
-- Motor: MySQL 8.x
-- Requiere: V1..V11 aplicadas
-- =====================================================================
-- - token_consulta en OT (QR seguro, no secuencial)
-- - documentos_orden_servicio (metadatos + storageKey + hash)
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE ordenes_servicio
    ADD COLUMN token_consulta VARCHAR(64) NULL AFTER created_by;

UPDATE ordenes_servicio
SET token_consulta = REPLACE(UUID(), '-', '')
WHERE token_consulta IS NULL OR token_consulta = '';

ALTER TABLE ordenes_servicio
    MODIFY COLUMN token_consulta VARCHAR(64) NOT NULL;

ALTER TABLE ordenes_servicio
    ADD CONSTRAINT uk_ordenes_servicio_token UNIQUE (token_consulta);

CREATE TABLE IF NOT EXISTS documentos_orden_servicio (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    orden_servicio_id       BIGINT         NOT NULL,
    tipo_documento          VARCHAR(40)    NOT NULL,
    cotizacion_id           BIGINT         NULL,
    version                 INT            NOT NULL,
    nombre_archivo          VARCHAR(180)   NOT NULL,
    storage_key             VARCHAR(120)   NOT NULL,
    hash_sha256             VARCHAR(64)    NULL,
    fecha_generacion        DATETIME(6)    NOT NULL,
    usuario_generacion      VARCHAR(100)   NOT NULL,
    token_documento         VARCHAR(64)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_documentos_ot_storage UNIQUE (storage_key),
    CONSTRAINT uk_documentos_ot_token UNIQUE (token_documento),
    CONSTRAINT fk_documentos_ot_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id),
    CONSTRAINT fk_documentos_ot_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_servicio (id),
    CONSTRAINT chk_documentos_ot_tipo CHECK (tipo_documento IN (
        'COMPROBANTE_RECEPCION',
        'COTIZACION',
        'ACTA_ENTREGA'
    ))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_documentos_ot_orden ON documentos_orden_servicio (orden_servicio_id);
CREATE INDEX idx_documentos_ot_tipo ON documentos_orden_servicio (tipo_documento);
CREATE INDEX idx_documentos_ot_cotizacion ON documentos_orden_servicio (cotizacion_id);
