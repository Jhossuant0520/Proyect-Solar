-- =====================================================================
-- SOLVIX — FASE 3.15.7 Cotizaciones formales de orden de servicio
-- Motor: MySQL 8.x
-- Requiere: V1..V10 aplicadas
-- =====================================================================
-- - Estado OT: PENDIENTE_APROBACION
-- - Secuencia: COTIZACION_SERVICIO (COT-yyyy-######)
-- - Tablas: cotizaciones_servicio, detalles_cotizacion_servicio
-- Cotizar NO modifica inventario ni Producto.precio/costo.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Estado OT + historial: PENDIENTE_APROBACION
-- ---------------------------------------------------------------------
ALTER TABLE ordenes_servicio
    DROP CHECK chk_ordenes_servicio_estado;

ALTER TABLE ordenes_servicio
    ADD CONSTRAINT chk_ordenes_servicio_estado CHECK (estado IN (
        'RECEPCIONADO',
        'EN_DIAGNOSTICO',
        'DIAGNOSTICADO',
        'COTIZADO',
        'PENDIENTE_APROBACION',
        'APROBADO',
        'EN_REPARACION',
        'ESPERA_REPUESTO',
        'REQUIERE_APROBACION_ADICIONAL',
        'LISTO',
        'ENTREGADO',
        'CERRADO',
        'CANCELADO'
    ));

ALTER TABLE historial_estado_orden_servicio
    DROP CHECK chk_historial_ot_estado_anterior;

ALTER TABLE historial_estado_orden_servicio
    ADD CONSTRAINT chk_historial_ot_estado_anterior CHECK (estado_anterior IN (
        'RECEPCIONADO',
        'EN_DIAGNOSTICO',
        'DIAGNOSTICADO',
        'COTIZADO',
        'PENDIENTE_APROBACION',
        'APROBADO',
        'EN_REPARACION',
        'ESPERA_REPUESTO',
        'REQUIERE_APROBACION_ADICIONAL',
        'LISTO',
        'ENTREGADO',
        'CERRADO',
        'CANCELADO'
    ));

ALTER TABLE historial_estado_orden_servicio
    DROP CHECK chk_historial_ot_estado_nuevo;

ALTER TABLE historial_estado_orden_servicio
    ADD CONSTRAINT chk_historial_ot_estado_nuevo CHECK (estado_nuevo IN (
        'RECEPCIONADO',
        'EN_DIAGNOSTICO',
        'DIAGNOSTICADO',
        'COTIZADO',
        'PENDIENTE_APROBACION',
        'APROBADO',
        'EN_REPARACION',
        'ESPERA_REPUESTO',
        'REQUIERE_APROBACION_ADICIONAL',
        'LISTO',
        'ENTREGADO',
        'CERRADO',
        'CANCELADO'
    ));

-- ---------------------------------------------------------------------
-- Secuencia de documentos: COTIZACION_SERVICIO
-- ---------------------------------------------------------------------
ALTER TABLE secuencias_documento DROP CHECK chk_secuencias_tipo;

ALTER TABLE secuencias_documento
    ADD CONSTRAINT chk_secuencias_tipo CHECK (tipo IN (
        'VENTA',
        'COMPRA',
        'DEVOLUCION_VENTA',
        'DEVOLUCION_COMPRA',
        'ORDEN_SERVICIO',
        'COTIZACION_SERVICIO'
    ));

-- ---------------------------------------------------------------------
-- Cotizaciones de servicio
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizaciones_servicio (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    orden_servicio_id       BIGINT         NOT NULL,
    numero                  VARCHAR(30)    NOT NULL,
    tipo                    VARCHAR(20)    NOT NULL,
    estado                  VARCHAR(30)    NOT NULL,
    fecha_creacion          DATETIME(6)    NOT NULL,
    fecha_presentacion      DATETIME(6)    NULL,
    fecha_aprobacion        DATETIME(6)    NULL,
    fecha_rechazo           DATETIME(6)    NULL,
    usuario_creacion        VARCHAR(100)   NOT NULL,
    usuario_presentacion    VARCHAR(100)   NULL,
    usuario_aprobacion      VARCHAR(100)   NULL,
    usuario_rechazo         VARCHAR(100)   NULL,
    subtotal                DECIMAL(14,2)  NOT NULL,
    total                   DECIMAL(14,2)  NOT NULL,
    observaciones           VARCHAR(1000)  NULL,
    motivo_ampliacion       VARCHAR(500)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_cotizaciones_servicio_numero UNIQUE (numero),
    CONSTRAINT fk_cotizaciones_servicio_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id),
    CONSTRAINT chk_cotizaciones_servicio_tipo CHECK (tipo IN ('INICIAL', 'ADICIONAL')),
    CONSTRAINT chk_cotizaciones_servicio_estado CHECK (estado IN (
        'BORRADOR',
        'PENDIENTE_APROBACION',
        'APROBADA',
        'RECHAZADA',
        'ANULADA'
    ))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_cotizaciones_servicio_orden ON cotizaciones_servicio (orden_servicio_id);
CREATE INDEX idx_cotizaciones_servicio_estado ON cotizaciones_servicio (estado);
CREATE INDEX idx_cotizaciones_servicio_tipo ON cotizaciones_servicio (tipo);

-- ---------------------------------------------------------------------
-- Detalles de cotización (snapshot comercial)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalles_cotizacion_servicio (
    id                          BIGINT         NOT NULL AUTO_INCREMENT,
    cotizacion_id               BIGINT         NOT NULL,
    tipo                        VARCHAR(20)    NOT NULL,
    descripcion                 VARCHAR(255)   NOT NULL,
    cantidad                    DECIMAL(14,2)  NOT NULL,
    precio_unitario             DECIMAL(14,2)  NOT NULL,
    subtotal                    DECIMAL(14,2)  NOT NULL,
    producto_id                 BIGINT         NULL,
    producto_nombre_snapshot    VARCHAR(150)   NULL,
    orden_servicio_repuesto_id  BIGINT         NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_detalles_cotizacion_cotizacion
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_servicio (id),
    CONSTRAINT fk_detalles_cotizacion_producto
        FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT fk_detalles_cotizacion_repuesto
        FOREIGN KEY (orden_servicio_repuesto_id) REFERENCES orden_servicio_repuestos (id),
    CONSTRAINT chk_detalles_cotizacion_tipo CHECK (tipo IN ('REPUESTO', 'MANO_OBRA', 'OTRO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalles_cotizacion_cotizacion ON detalles_cotizacion_servicio (cotizacion_id);
CREATE INDEX idx_detalles_cotizacion_producto ON detalles_cotizacion_servicio (producto_id);
CREATE INDEX idx_detalles_cotizacion_repuesto ON detalles_cotizacion_servicio (orden_servicio_repuesto_id);
