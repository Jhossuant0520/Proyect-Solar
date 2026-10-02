-- =====================================================================
-- FASE 3.15.10-B — Enriquecimiento maestro Proveedor + ContactoProveedor
-- + snapshot histórico en compras.
--
-- Compatible con datos FASE 1:
--   - No inventa NIT para proveedores sin documento.
--   - Conserva columna contacto (legacy) y migra valores a contactos_proveedor.
--   - Conserva columnas nombre/documento (razón social / número fiscal).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ETAPA 1 — Columnas nuevas en proveedores
-- ---------------------------------------------------------------------

ALTER TABLE proveedores
    ADD COLUMN tipo_documento VARCHAR(20) NULL AFTER documento,
    ADD COLUMN nombre_comercial VARCHAR(150) NULL AFTER nombre,
    ADD COLUMN direccion VARCHAR(255) NULL AFTER nombre_comercial,
    ADD COLUMN ciudad VARCHAR(100) NULL AFTER direccion,
    ADD COLUMN departamento VARCHAR(100) NULL AFTER ciudad,
    ADD COLUMN telefono_alternativo VARCHAR(40) NULL AFTER telefono,
    ADD COLUMN web VARCHAR(200) NULL AFTER email,
    ADD COLUMN condicion_pago VARCHAR(20) NULL AFTER web,
    ADD COLUMN dias_credito INT NULL AFTER condicion_pago,
    ADD COLUMN fecha_actualizacion DATETIME(6) NULL AFTER fecha_registro;

-- Históricos con documento: tipificar como NIT (regla funcional de esta fase).
UPDATE proveedores
SET tipo_documento = 'NIT'
WHERE documento IS NOT NULL
  AND TRIM(documento) <> ''
  AND (tipo_documento IS NULL OR tipo_documento = '');

-- ---------------------------------------------------------------------
-- ETAPA 2 — Contactos del proveedor
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contactos_proveedor (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    proveedor_id        BIGINT       NOT NULL,
    nombre              VARCHAR(150) NOT NULL,
    cargo               VARCHAR(100) NULL,
    telefono            VARCHAR(40)  NULL,
    celular             VARCHAR(40)  NULL,
    email               VARCHAR(150) NULL,
    tipo_contacto       VARCHAR(30)  NOT NULL,
    principal           BIT(1)       NOT NULL DEFAULT b'0',
    activo              BIT(1)       NOT NULL DEFAULT b'1',
    fecha_registro      DATETIME(6)  NOT NULL,
    fecha_actualizacion DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contactos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
    CONSTRAINT chk_contactos_tipo CHECK (
        tipo_contacto IN ('COMERCIAL', 'FACTURACION', 'LOGISTICA', 'SOPORTE', 'OTRO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_contactos_proveedor ON contactos_proveedor (proveedor_id);
CREATE INDEX idx_contactos_proveedor_activo ON contactos_proveedor (proveedor_id, activo);

-- Migración segura del string legacy `contacto` → ContactoProveedor COMERCIAL.
-- Solo nombre; no inventa cargo/teléfono/email.
INSERT INTO contactos_proveedor (
    proveedor_id, nombre, tipo_contacto, principal, activo, fecha_registro, fecha_actualizacion
)
SELECT
    p.id,
    TRIM(p.contacto),
    'COMERCIAL',
    b'1',
    b'1',
    COALESCE(p.fecha_registro, CURRENT_TIMESTAMP(6)),
    CURRENT_TIMESTAMP(6)
FROM proveedores p
WHERE p.contacto IS NOT NULL
  AND TRIM(p.contacto) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM contactos_proveedor c WHERE c.proveedor_id = p.id
  );

-- ---------------------------------------------------------------------
-- ETAPA 3 — Snapshot histórico en compras
-- ---------------------------------------------------------------------

ALTER TABLE compras
    ADD COLUMN proveedor_nombre_snapshot VARCHAR(150) NULL AFTER proveedor_id,
    ADD COLUMN proveedor_documento_snapshot VARCHAR(40) NULL AFTER proveedor_nombre_snapshot;

-- Backfill: captura el valor vigente al momento de la migración (mejor que NULL).
UPDATE compras c
INNER JOIN proveedores p ON p.id = c.proveedor_id
SET c.proveedor_nombre_snapshot = p.nombre,
    c.proveedor_documento_snapshot = p.documento
WHERE c.proveedor_nombre_snapshot IS NULL;

CREATE INDEX idx_proveedores_tipo_documento ON proveedores (tipo_documento);
CREATE INDEX idx_proveedores_ciudad ON proveedores (ciudad);
