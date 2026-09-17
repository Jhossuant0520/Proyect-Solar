-- =====================================================================
-- SOLVIX — FASE 3.15.5.1 Workflow / historial de estados OT
-- Motor: MySQL 8.x
-- Requiere: V1..V7 aplicados
-- =====================================================================
-- Historial inmutable de transiciones de OrdenServicio.
-- usuario se almacena como texto (username JWT), igual que created_by.
-- Sin backfill de OT existentes.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS historial_estado_orden_servicio (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    orden_servicio_id   BIGINT        NOT NULL,
    estado_anterior     VARCHAR(30)   NOT NULL,
    estado_nuevo        VARCHAR(30)   NOT NULL,
    motivo              VARCHAR(500)  NOT NULL,
    observacion         VARCHAR(1000) NULL,
    usuario             VARCHAR(100)  NOT NULL,
    fecha_cambio        DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_historial_ot_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id),
    CONSTRAINT chk_historial_ot_estado_anterior CHECK (estado_anterior IN (
        'RECEPCIONADO', 'EN_DIAGNOSTICO', 'COTIZADO', 'APROBADO', 'EN_REPARACION',
        'ESPERA_REPUESTO', 'LISTO', 'ENTREGADO', 'CERRADO', 'CANCELADO')),
    CONSTRAINT chk_historial_ot_estado_nuevo CHECK (estado_nuevo IN (
        'RECEPCIONADO', 'EN_DIAGNOSTICO', 'COTIZADO', 'APROBADO', 'EN_REPARACION',
        'ESPERA_REPUESTO', 'LISTO', 'ENTREGADO', 'CERRADO', 'CANCELADO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_historial_ot_orden ON historial_estado_orden_servicio (orden_servicio_id);
CREATE INDEX idx_historial_ot_fecha ON historial_estado_orden_servicio (fecha_cambio);
