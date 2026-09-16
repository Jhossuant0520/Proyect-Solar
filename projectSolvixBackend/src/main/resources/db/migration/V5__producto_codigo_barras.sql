-- =====================================================================
-- SOLVIX — Producto: código de barras opcional
-- Motor: MySQL 8.x
-- Requiere: V1__fase1_gestion_comercial.sql (tabla productos)
-- =====================================================================
-- * NULLABLE: varios productos pueden no tener código.
-- * UNIQUE: dos productos no pueden compartir el mismo código real.
-- * En MySQL, UNIQUE permite múltiples NULL.
-- Ejecutar manualmente sobre solarfishdb.
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE productos
    ADD COLUMN codigo_barras VARCHAR(50) NULL;

CREATE UNIQUE INDEX uk_productos_codigo_barras ON productos (codigo_barras);
