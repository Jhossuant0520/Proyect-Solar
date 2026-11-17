-- =====================================================================
-- SOLVIX — FASE 3.15.1 Núcleo de Servicios Técnicos
-- Motor: MySQL 8.x
-- Requiere: V1..V5 aplicados
-- =====================================================================
-- OBJETIVO:
--   Equipo (activo del cliente) + OrdenServicio (documento de taller).
--   Independiente de Producto, Inventario y Venta.
--
-- Numeración: OS-{yyyy}-{seq} vía TipoSecuencia.ORDEN_SERVICIO
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- ETAPA 1 — Serie documental OS
-- =====================================================================

ALTER TABLE secuencias_documento DROP CHECK chk_secuencias_tipo;
ALTER TABLE secuencias_documento
    ADD CONSTRAINT chk_secuencias_tipo
        CHECK (tipo IN (
            'VENTA', 'COMPRA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA', 'ORDEN_SERVICIO'));

-- =====================================================================
-- ETAPA 2 — EQUIPOS
-- =====================================================================

CREATE TABLE IF NOT EXISTS equipos (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    cliente_id       BIGINT        NOT NULL,
    tipo_equipo      VARCHAR(30)   NOT NULL,
    marca            VARCHAR(80)   NULL,
    modelo           VARCHAR(80)   NULL,
    numero_serie     VARCHAR(100)  NULL,
    nombre           VARCHAR(120)  NULL,
    observaciones    VARCHAR(1000) NULL,
    activo           BIT(1)        NOT NULL DEFAULT b'1',
    fecha_registro   DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_equipos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT chk_equipos_tipo CHECK (tipo_equipo IN (
        'COMPUTADOR', 'PORTATIL', 'IMPRESORA', 'MONITOR', 'SERVIDOR', 'CELULAR', 'OTRO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_equipos_cliente ON equipos (cliente_id);
CREATE INDEX idx_equipos_activo ON equipos (activo);
CREATE INDEX idx_equipos_numero_serie ON equipos (numero_serie);

-- =====================================================================
-- ETAPA 3 — ÓRDENES DE SERVICIO
-- =====================================================================

CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    numero               VARCHAR(30)   NOT NULL,
    cliente_id           BIGINT        NOT NULL,
    equipo_id            BIGINT        NOT NULL,
    estado               VARCHAR(30)   NOT NULL,
    problema_reportado   VARCHAR(2000) NULL,
    diagnostico          VARCHAR(2000) NULL,
    trabajo_realizado    VARCHAR(2000) NULL,
    observaciones        VARCHAR(1000) NULL,
    fecha_recepcion      DATETIME(6)   NOT NULL,
    fecha_actualizacion  DATETIME(6)   NOT NULL,
    fecha_cierre         DATETIME(6)   NULL,
    created_by           VARCHAR(100)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_ordenes_servicio_numero UNIQUE (numero),
    CONSTRAINT fk_ordenes_servicio_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT fk_ordenes_servicio_equipo FOREIGN KEY (equipo_id) REFERENCES equipos (id),
    CONSTRAINT chk_ordenes_servicio_estado CHECK (estado IN (
        'RECEPCIONADO', 'EN_DIAGNOSTICO', 'COTIZADO', 'APROBADO', 'EN_REPARACION',
        'ESPERA_REPUESTO', 'LISTO', 'ENTREGADO', 'CERRADO', 'CANCELADO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_ordenes_servicio_cliente ON ordenes_servicio (cliente_id);
CREATE INDEX idx_ordenes_servicio_equipo ON ordenes_servicio (equipo_id);
CREATE INDEX idx_ordenes_servicio_estado ON ordenes_servicio (estado);
CREATE INDEX idx_ordenes_servicio_fecha ON ordenes_servicio (fecha_recepcion);
