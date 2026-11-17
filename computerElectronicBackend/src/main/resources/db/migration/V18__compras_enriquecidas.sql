-- =====================================================================
-- FASE 3.15.11-B — Compras enriquecidas
--
-- Seguro para:
--   A) esquema FASE 1 + snapshots 10-B sin columnas 11-B
--   B) reejecución parcial: columnas ya creadas por Hibernate
--
-- No inventa históricos. Impuesto/porcentaje default 0.
-- No modifica V1/V3/V17.
-- =====================================================================

-- ---------------------------------------------------------------------
-- COMPRAS — columnas de cabecera
-- ---------------------------------------------------------------------

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='tipo_documento_externo')=0,
    'ALTER TABLE compras ADD COLUMN tipo_documento_externo VARCHAR(20) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='numero_documento_externo')=0,
    'ALTER TABLE compras ADD COLUMN numero_documento_externo VARCHAR(80) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='numero_orden_compra')=0,
    'ALTER TABLE compras ADD COLUMN numero_orden_compra VARCHAR(80) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='numero_cotizacion_proveedor')=0,
    'ALTER TABLE compras ADD COLUMN numero_cotizacion_proveedor VARCHAR(80) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='fecha_documento_proveedor')=0,
    'ALTER TABLE compras ADD COLUMN fecha_documento_proveedor DATETIME(6) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='fecha_entrega')=0,
    'ALTER TABLE compras ADD COLUMN fecha_entrega DATETIME(6) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='fecha_vencimiento')=0,
    'ALTER TABLE compras ADD COLUMN fecha_vencimiento DATETIME(6) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='condicion_pago_aplicada')=0,
    'ALTER TABLE compras ADD COLUMN condicion_pago_aplicada VARCHAR(20) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='dias_credito_aplicados')=0,
    'ALTER TABLE compras ADD COLUMN dias_credito_aplicados INT NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='moneda')=0,
    'ALTER TABLE compras ADD COLUMN moneda VARCHAR(3) NOT NULL DEFAULT ''COP''',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='contacto_proveedor_id')=0,
    'ALTER TABLE compras ADD COLUMN contacto_proveedor_id BIGINT NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='contacto_nombre_snapshot')=0,
    'ALTER TABLE compras ADD COLUMN contacto_nombre_snapshot VARCHAR(150) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND COLUMN_NAME='impuesto_total')=0,
    'ALTER TABLE compras ADD COLUMN impuesto_total DECIMAL(14,2) NOT NULL DEFAULT 0.00',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE compras SET moneda = 'COP' WHERE moneda IS NULL OR TRIM(moneda) = '';
UPDATE compras SET impuesto_total = 0.00 WHERE impuesto_total IS NULL;

-- ---------------------------------------------------------------------
-- DETALLE_COMPRA
-- ---------------------------------------------------------------------

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='detalle_compra' AND COLUMN_NAME='referencia_proveedor')=0,
    'ALTER TABLE detalle_compra ADD COLUMN referencia_proveedor VARCHAR(80) NULL',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='detalle_compra' AND COLUMN_NAME='porcentaje_impuesto')=0,
    'ALTER TABLE detalle_compra ADD COLUMN porcentaje_impuesto DECIMAL(7,2) NOT NULL DEFAULT 0.00',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='detalle_compra' AND COLUMN_NAME='valor_impuesto')=0,
    'ALTER TABLE detalle_compra ADD COLUMN valor_impuesto DECIMAL(14,2) NOT NULL DEFAULT 0.00',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE detalle_compra SET porcentaje_impuesto = 0.00 WHERE porcentaje_impuesto IS NULL;
UPDATE detalle_compra SET valor_impuesto = 0.00 WHERE valor_impuesto IS NULL;

-- Índices de búsqueda documental (opcionales, seguros)
SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='compras' AND INDEX_NAME='idx_compras_num_doc_ext')=0,
    'CREATE INDEX idx_compras_num_doc_ext ON compras (numero_documento_externo)',
    'SELECT 1'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
