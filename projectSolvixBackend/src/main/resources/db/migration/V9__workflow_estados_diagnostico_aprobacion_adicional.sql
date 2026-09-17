-- =====================================================================
-- SOLVIX — FASE 3.15.5.2 Rediseño workflow OT
-- Motor: MySQL 8.x
-- Requiere: V1..V8 aplicadas
-- =====================================================================
-- Amplía CHECK de estado con:
--   DIAGNOSTICADO
--   REQUIERE_APROBACION_ADICIONAL
-- Sin backfill de datos históricos.
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE ordenes_servicio
    DROP CHECK chk_ordenes_servicio_estado;

ALTER TABLE ordenes_servicio
    ADD CONSTRAINT chk_ordenes_servicio_estado CHECK (estado IN (
        'RECEPCIONADO',
        'EN_DIAGNOSTICO',
        'DIAGNOSTICADO',
        'COTIZADO',
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
        'APROBADO',
        'EN_REPARACION',
        'ESPERA_REPUESTO',
        'REQUIERE_APROBACION_ADICIONAL',
        'LISTO',
        'ENTREGADO',
        'CERRADO',
        'CANCELADO'
    ));
