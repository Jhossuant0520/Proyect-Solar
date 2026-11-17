-- =====================================================================
-- SOLVIX — FASE 3.15.6 Repuestos en Órdenes de Servicio
-- Motor: MySQL 8.x
-- Requiere: V1..V6 aplicadas
-- =====================================================================
-- Planificar ≠ NO mueve inventario.
-- Consumir / devolver → InventarioService (CONSUMO_SERVICIO / DEVOLUCION_SERVICIO).
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- ETAPA 1 — Ampliar enums de movimientos
-- =====================================================================

ALTER TABLE movimientos_inventario DROP CHECK chk_movimientos_tipo;
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT chk_movimientos_tipo
        CHECK (tipo IN (
            'COMPRA', 'VENTA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA',
            'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'MERMA', 'CARGA_INICIAL',
            'CONSUMO_SERVICIO', 'DEVOLUCION_SERVICIO'));

ALTER TABLE movimientos_inventario DROP CHECK chk_movimientos_referencia;
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT chk_movimientos_referencia
        CHECK (referencia_tipo IN (
            'VENTA', 'COMPRA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA',
            'AJUSTE_MANUAL', 'CARGA_INICIAL', 'ORDEN_SERVICIO'));

-- =====================================================================
-- ETAPA 2 — Líneas de repuesto
-- =====================================================================

CREATE TABLE IF NOT EXISTS orden_servicio_repuestos (
    id                       BIGINT        NOT NULL AUTO_INCREMENT,
    orden_servicio_id        BIGINT        NOT NULL,
    producto_id              BIGINT        NOT NULL,
    producto_nombre          VARCHAR(150)  NOT NULL,
    cantidad_planificada     INT           NOT NULL,
    cantidad_consumida       INT           NOT NULL DEFAULT 0,
    cantidad_devuelta        INT           NOT NULL DEFAULT 0,
    costo_unitario           DECIMAL(14,2) NULL,
    costo_conocido           BIT(1)        NOT NULL DEFAULT b'0',
    anulado                  BIT(1)        NOT NULL DEFAULT b'0',
    fecha_registro           DATETIME(6)   NOT NULL,
    fecha_ultimo_consumo     DATETIME(6)   NULL,
    fecha_ultima_devolucion  DATETIME(6)   NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_os_repuestos_orden FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id),
    CONSTRAINT fk_os_repuestos_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_os_repuestos_planificada CHECK (cantidad_planificada > 0),
    CONSTRAINT chk_os_repuestos_consumida CHECK (cantidad_consumida >= 0),
    CONSTRAINT chk_os_repuestos_devuelta CHECK (cantidad_devuelta >= 0),
    CONSTRAINT chk_os_repuestos_consumo_vs_plan CHECK (cantidad_consumida <= cantidad_planificada),
    CONSTRAINT chk_os_repuestos_dev_vs_cons CHECK (cantidad_devuelta <= cantidad_consumida)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_os_repuestos_orden ON orden_servicio_repuestos (orden_servicio_id);
CREATE INDEX idx_os_repuestos_producto ON orden_servicio_repuestos (producto_id);
