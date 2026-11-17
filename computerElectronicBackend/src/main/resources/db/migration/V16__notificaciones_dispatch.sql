-- =====================================================================
-- SOLVIX — FASE 3.15.9.2 Adaptadores / dispatcher de notificaciones
-- Motor: MySQL 8.x
-- Requiere: V15__notificaciones.sql
-- =====================================================================
-- Trazabilidad mínima del envío (adapter + id externo). Sin proveedores reales.
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE notificaciones
    ADD COLUMN adapter_codigo VARCHAR(80) NULL AFTER error_resumen,
    ADD COLUMN proveedor_mensaje_id VARCHAR(120) NULL AFTER adapter_codigo;
