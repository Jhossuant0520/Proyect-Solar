-- =====================================================================
-- SOLVIX — FASE B Cotización comercial independiente
-- Motor: MySQL 8.x
-- Requiere: V1..V12 aplicadas
-- =====================================================================
-- Propuesta comercial a un cliente, sin Orden de Servicio.
-- No mueve inventario: las líneas guardan snapshot de producto y precio.
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE secuencias_documento DROP CHECK chk_secuencias_tipo;

ALTER TABLE secuencias_documento
    ADD CONSTRAINT chk_secuencias_tipo CHECK (tipo IN (
        'VENTA',
        'COMPRA',
        'DEVOLUCION_VENTA',
        'DEVOLUCION_COMPRA',
        'ORDEN_SERVICIO',
        'COTIZACION_SERVICIO',
        'COTIZACION_COMERCIAL'
    ));

CREATE TABLE IF NOT EXISTS cotizaciones_comerciales (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    numero                  VARCHAR(30)    NOT NULL,
    cliente_id              BIGINT         NOT NULL,
    cliente_nombre_snapshot VARCHAR(150)   NOT NULL,
    estado                  VARCHAR(30)    NOT NULL,
    fecha                   DATETIME(6)    NOT NULL,
    fecha_presentacion      DATETIME(6)    NULL,
    fecha_aprobacion        DATETIME(6)    NULL,
    fecha_rechazo           DATETIME(6)    NULL,
    fecha_anulacion         DATETIME(6)    NULL,
    usuario_creacion        VARCHAR(100)   NOT NULL,
    usuario_presentacion    VARCHAR(100)   NULL,
    usuario_aprobacion      VARCHAR(100)   NULL,
    usuario_rechazo         VARCHAR(100)   NULL,
    usuario_anulacion       VARCHAR(100)   NULL,
    subtotal                DECIMAL(14,2)  NOT NULL,
    total                   DECIMAL(14,2)  NOT NULL,
    observaciones           VARCHAR(1000)  NULL,
    motivo_rechazo          VARCHAR(1000)  NULL,
    token_consulta          VARCHAR(64)    NOT NULL,
    fecha_actualizacion     DATETIME(6)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_cotizaciones_comerciales_numero UNIQUE (numero),
    CONSTRAINT uk_cotizaciones_comerciales_token UNIQUE (token_consulta),
    CONSTRAINT fk_cotizaciones_comerciales_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT chk_cotizaciones_comerciales_estado CHECK (estado IN (
        'BORRADOR',
        'PENDIENTE_APROBACION',
        'APROBADA',
        'RECHAZADA',
        'ANULADA'
    )),
    CONSTRAINT chk_cotizaciones_comerciales_montos CHECK (subtotal >= 0 AND total >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_cotizaciones_comerciales_cliente ON cotizaciones_comerciales (cliente_id);
CREATE INDEX idx_cotizaciones_comerciales_estado ON cotizaciones_comerciales (estado);
CREATE INDEX idx_cotizaciones_comerciales_fecha ON cotizaciones_comerciales (fecha);

CREATE TABLE IF NOT EXISTS detalles_cotizacion_comercial (
    id                          BIGINT         NOT NULL AUTO_INCREMENT,
    cotizacion_id               BIGINT         NOT NULL,
    tipo                        VARCHAR(20)    NOT NULL,
    descripcion                 VARCHAR(255)   NOT NULL,
    cantidad                    DECIMAL(14,2)  NOT NULL,
    precio_unitario             DECIMAL(14,2)  NOT NULL,
    subtotal                    DECIMAL(14,2)  NOT NULL,
    producto_id                 BIGINT         NULL,
    producto_nombre_snapshot    VARCHAR(150)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_detalles_cot_comercial_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_comerciales (id),
    CONSTRAINT fk_detalles_cot_comercial_producto
        FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_detalles_cot_comercial_tipo CHECK (tipo IN ('PRODUCTO', 'MANO_OBRA', 'OTRO')),
    CONSTRAINT chk_detalles_cot_comercial_valores CHECK (
        cantidad > 0 AND precio_unitario >= 0 AND subtotal >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalles_cot_comercial_cotizacion ON detalles_cotizacion_comercial (cotizacion_id);
CREATE INDEX idx_detalles_cot_comercial_producto ON detalles_cotizacion_comercial (producto_id);

CREATE TABLE IF NOT EXISTS documentos_cotizacion_comercial (
    id                  BIGINT         NOT NULL AUTO_INCREMENT,
    cotizacion_id       BIGINT         NOT NULL,
    version             INT            NOT NULL,
    nombre_archivo      VARCHAR(180)   NOT NULL,
    storage_key         VARCHAR(120)   NOT NULL,
    hash_sha256         VARCHAR(64)    NULL,
    fecha_generacion    DATETIME(6)    NOT NULL,
    usuario_generacion  VARCHAR(100)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_documentos_cot_comercial_storage UNIQUE (storage_key),
    CONSTRAINT uk_documentos_cot_comercial_version UNIQUE (cotizacion_id, version),
    CONSTRAINT fk_documentos_cot_comercial_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_comerciales (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
