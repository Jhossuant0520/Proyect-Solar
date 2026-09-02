-- =====================================================================
-- SOLVIX — FASE 1: Reconstrucción del módulo de Gestión Comercial
-- Motor: MySQL 8.x
-- =====================================================================
-- CARACTERÍSTICAS:
--   * NO destructivo: no hace DROP de `productos` ni de sus datos.
--   * Las columnas antiguas (precio, cantidad_stock, categoria) se CONSERVAN
--     y solo se vuelven NULLABLE para permitir la convivencia durante la
--     transición. Su retiro está en la ETAPA 9, comentada a propósito.
--   * Idempotente en lo posible: usa CREATE TABLE IF NOT EXISTS e INSERT ... SELECT
--     con control de duplicados.
--
-- EJECUTAR SOBRE LA BASE: solarfishdb
-- RECOMENDACIÓN: hacer respaldo antes (ver instrucciones de migración).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- ETAPA 1 — CATEGORÍAS DE PRODUCTO
-- La categoría deja de ser un enum embebido y pasa a ser una entidad.
-- =====================================================================

CREATE TABLE IF NOT EXISTS categorias_producto (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    codigo         VARCHAR(40)  NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    activo         BIT(1)       NOT NULL DEFAULT b'1',
    fecha_creacion DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categorias_producto_codigo UNIQUE (codigo)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Semilla: catálogo genérico de FASE 1.
INSERT INTO categorias_producto (codigo, nombre, activo, fecha_creacion)
SELECT * FROM (
    SELECT 'GENERAL'     AS codigo, 'General'     AS nombre, b'1' AS activo, NOW(6) AS fecha_creacion UNION ALL
    SELECT 'ELECTRONICA',        'Electrónica',        b'1', NOW(6) UNION ALL
    SELECT 'HERRAMIENTA',        'Herramienta',        b'1', NOW(6) UNION ALL
    SELECT 'SOFTWARE',           'Software',           b'1', NOW(6) UNION ALL
    SELECT 'SERVICIO',           'Servicio',           b'1', NOW(6) UNION ALL
    SELECT 'ACCESORIO',          'Accesorio',          b'1', NOW(6) UNION ALL
    SELECT 'OTRO',               'Otro',               b'1', NOW(6)
) AS semilla
WHERE NOT EXISTS (
    SELECT 1 FROM categorias_producto c WHERE c.codigo = semilla.codigo
);

-- Rescata cualquier categoría histórica presente en `productos` que no esté
-- en la semilla (por ejemplo PANEL, INVERSOR de versiones anteriores).
-- No inventa datos: solo preserva los códigos realmente usados.
INSERT INTO categorias_producto (codigo, nombre, activo, fecha_creacion)
SELECT DISTINCT p.categoria, p.categoria, b'1', NOW(6)
FROM productos p
WHERE p.categoria IS NOT NULL
  AND p.categoria <> ''
  AND NOT EXISTS (
      SELECT 1 FROM categorias_producto c WHERE c.codigo = p.categoria
  );

-- =====================================================================
-- ETAPA 2 — PRODUCTO: nuevas variables y migración de datos
--   precio         -> precio_venta_actual   (REEMPLAZO)
--   cantidad_stock -> stock_actual          (REEMPLAZO)
--   (nuevo)        -> costo_actual          (NULL = COSTO DESCONOCIDO)
--   categoria      -> categoria_id (FK)     (REEMPLAZO)
-- =====================================================================

-- 2.1 Añadir columnas nuevas (aún nullables para poder migrar).
ALTER TABLE productos
    ADD COLUMN precio_venta_actual DECIMAL(14,2) NULL AFTER marca,
    ADD COLUMN costo_actual        DECIMAL(14,2) NULL AFTER precio_venta_actual,
    ADD COLUMN stock_actual        INT           NULL AFTER costo_actual,
    ADD COLUMN categoria_id        BIGINT        NULL AFTER marca;

-- 2.2 Trasladar los datos existentes al nuevo significado.
UPDATE productos
SET precio_venta_actual = precio
WHERE precio_venta_actual IS NULL;

UPDATE productos
SET stock_actual = COALESCE(cantidad_stock, 0)
WHERE stock_actual IS NULL;

UPDATE productos p
JOIN categorias_producto c ON c.codigo = p.categoria
SET p.categoria_id = c.id
WHERE p.categoria_id IS NULL;

-- Productos sin categoría reconocible quedan en GENERAL (no se pierde el registro).
UPDATE productos p
JOIN categorias_producto c ON c.codigo = 'GENERAL'
SET p.categoria_id = c.id
WHERE p.categoria_id IS NULL;

-- 2.3 costo_actual permanece NULL a propósito: COSTO DESCONOCIDO.
--     No se asume 0 para no generar márgenes falsos del 100% en analytics.
--     Se poblará con la primera compra completada de cada producto.

-- 2.4 Endurecer las columnas nuevas y relajar las antiguas.
ALTER TABLE productos
    MODIFY COLUMN precio_venta_actual DECIMAL(14,2) NOT NULL,
    MODIFY COLUMN stock_actual        INT          NOT NULL DEFAULT 0,
    MODIFY COLUMN categoria_id        BIGINT       NOT NULL;

-- Las columnas antiguas se conservan pero dejan de ser obligatorias,
-- para que las inserciones nuevas de JPA no fallen.
ALTER TABLE productos
    MODIFY COLUMN precio         DECIMAL(14,2) NULL,
    MODIFY COLUMN cantidad_stock INT           NULL,
    MODIFY COLUMN categoria      VARCHAR(40)   NULL;

ALTER TABLE productos
    ADD CONSTRAINT fk_productos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias_producto (id);

CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_productos_activo    ON productos (activo);
CREATE INDEX idx_productos_marca     ON productos (marca);

-- =====================================================================
-- ETAPA 3 — CLIENTES
-- El "Consumidor final" se identifica por tipo_cliente, nunca por un id fijo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS clientes (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    tipo_cliente     VARCHAR(30)  NOT NULL,
    tipo_documento   VARCHAR(20)  NULL,
    numero_documento VARCHAR(40)  NULL,
    nombre           VARCHAR(150) NOT NULL,
    email            VARCHAR(150) NULL,
    telefono         VARCHAR(40)  NULL,
    notas            VARCHAR(500) NULL,
    activo           BIT(1)       NOT NULL DEFAULT b'1',
    fecha_registro   DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_clientes_documento UNIQUE (tipo_documento, numero_documento),
    CONSTRAINT chk_clientes_tipo CHECK (tipo_cliente IN ('CONSUMIDOR_FINAL', 'PERSONA', 'EMPRESA'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Registro estructural del sistema (no es un dato de negocio ficticio).
INSERT INTO clientes (tipo_cliente, nombre, activo, fecha_registro)
SELECT 'CONSUMIDOR_FINAL', 'Consumidor final', b'1', NOW(6)
WHERE NOT EXISTS (
    SELECT 1 FROM clientes c WHERE c.tipo_cliente = 'CONSUMIDOR_FINAL'
);

CREATE INDEX idx_clientes_activo ON clientes (activo);
CREATE INDEX idx_clientes_tipo   ON clientes (tipo_cliente);

-- =====================================================================
-- ETAPA 4 — PROVEEDORES
-- =====================================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(150) NOT NULL,
    documento      VARCHAR(40)  NULL,
    contacto       VARCHAR(150) NULL,
    email          VARCHAR(150) NULL,
    telefono       VARCHAR(40)  NULL,
    notas          VARCHAR(500) NULL,
    activo         BIT(1)       NOT NULL DEFAULT b'1',
    fecha_registro DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_proveedores_documento UNIQUE (documento)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_proveedores_activo ON proveedores (activo);

-- =====================================================================
-- ETAPA 5 — NUMERACIÓN DE DOCUMENTOS (V-{yyyy}-{seq}, C-{yyyy}-{seq})
-- =====================================================================

CREATE TABLE IF NOT EXISTS secuencias_documento (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    tipo         VARCHAR(20) NOT NULL,
    anio         INT         NOT NULL,
    ultimo_valor BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_secuencias_tipo_anio UNIQUE (tipo, anio),
    CONSTRAINT chk_secuencias_tipo CHECK (tipo IN ('VENTA', 'COMPRA'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =====================================================================
-- ETAPA 6 — COMPRAS
-- El costo aplicado queda congelado en cada línea.
-- =====================================================================

CREATE TABLE IF NOT EXISTS compras (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    numero           VARCHAR(30)   NOT NULL,
    fecha            DATETIME(6)   NOT NULL,
    proveedor_id     BIGINT        NOT NULL,
    subtotal         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    descuento        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total            DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    estado           VARCHAR(30)   NOT NULL,
    observaciones    VARCHAR(1000) NULL,
    fecha_completada DATETIME(6)   NULL,
    fecha_anulada    DATETIME(6)   NULL,
    created_at       DATETIME(6)   NOT NULL,
    updated_at       DATETIME(6)   NULL,
    created_by       VARCHAR(100)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_compras_numero UNIQUE (numero),
    CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
    CONSTRAINT chk_compras_estado CHECK (
        estado IN ('PENDIENTE', 'COMPLETADA', 'CANCELADA', 'DEVUELTA', 'PARCIALMENTE_DEVUELTA')),
    CONSTRAINT chk_compras_montos CHECK (subtotal >= 0 AND descuento >= 0 AND total >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_compras_fecha     ON compras (fecha);
CREATE INDEX idx_compras_estado    ON compras (estado);
CREATE INDEX idx_compras_proveedor ON compras (proveedor_id);

CREATE TABLE IF NOT EXISTS detalle_compra (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    compra_id         BIGINT        NOT NULL,
    producto_id       BIGINT        NOT NULL,
    producto_nombre   VARCHAR(150)  NOT NULL,
    categoria_codigo  VARCHAR(40)   NULL,
    cantidad          INT           NOT NULL,
    costo_unitario    DECIMAL(14,2) NOT NULL,
    subtotal          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    cantidad_devuelta INT           NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_compra_compra   FOREIGN KEY (compra_id)   REFERENCES compras (id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_detalle_compra_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_compra_costo    CHECK (costo_unitario >= 0),
    CONSTRAINT chk_detalle_compra_dev      CHECK (cantidad_devuelta >= 0 AND cantidad_devuelta <= cantidad)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalle_compra_compra   ON detalle_compra (compra_id);
CREATE INDEX idx_detalle_compra_producto ON detalle_compra (producto_id);

-- =====================================================================
-- ETAPA 7 — VENTAS
-- Precio y costo aplicados quedan congelados en cada línea.
-- costo_conocido distingue costo real de costo desconocido.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ventas (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    numero           VARCHAR(30)   NOT NULL,
    fecha            DATETIME(6)   NOT NULL,
    cliente_id       BIGINT        NOT NULL,
    subtotal         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    descuento        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total            DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    estado           VARCHAR(30)   NOT NULL,
    metodo_pago      VARCHAR(30)   NOT NULL,
    observaciones    VARCHAR(1000) NULL,
    fecha_completada DATETIME(6)   NULL,
    fecha_anulada    DATETIME(6)   NULL,
    created_at       DATETIME(6)   NOT NULL,
    updated_at       DATETIME(6)   NULL,
    created_by       VARCHAR(100)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_ventas_numero UNIQUE (numero),
    CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT chk_ventas_estado CHECK (
        estado IN ('PENDIENTE', 'COMPLETADA', 'CANCELADA', 'DEVUELTA', 'PARCIALMENTE_DEVUELTA')),
    CONSTRAINT chk_ventas_metodo_pago CHECK (
        metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CREDITO', 'OTRO')),
    CONSTRAINT chk_ventas_montos CHECK (subtotal >= 0 AND descuento >= 0 AND total >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_ventas_fecha   ON ventas (fecha);
CREATE INDEX idx_ventas_estado  ON ventas (estado);
CREATE INDEX idx_ventas_cliente ON ventas (cliente_id);
-- Índice compuesto orientado a analytics por período y estado.
CREATE INDEX idx_ventas_estado_fecha ON ventas (estado, fecha);

CREATE TABLE IF NOT EXISTS detalle_venta (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    venta_id          BIGINT        NOT NULL,
    producto_id       BIGINT        NOT NULL,
    producto_nombre   VARCHAR(150)  NOT NULL,
    categoria_codigo  VARCHAR(40)   NULL,
    cantidad          INT           NOT NULL,
    precio_unitario   DECIMAL(14,2) NOT NULL,
    costo_unitario    DECIMAL(14,2) NULL,
    costo_conocido    BIT(1)        NOT NULL DEFAULT b'0',
    descuento_linea   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    subtotal          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    cantidad_devuelta INT           NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_venta_venta    FOREIGN KEY (venta_id)    REFERENCES ventas (id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_venta_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_detalle_venta_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_venta_precio   CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_venta_dev      CHECK (cantidad_devuelta >= 0 AND cantidad_devuelta <= cantidad)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_detalle_venta_venta     ON detalle_venta (venta_id);
CREATE INDEX idx_detalle_venta_producto  ON detalle_venta (producto_id);
CREATE INDEX idx_detalle_venta_categoria ON detalle_venta (categoria_codigo);

-- =====================================================================
-- ETAPA 8 — MOVIMIENTOS DE INVENTARIO
-- Libro mayor del stock: toda variación deja rastro con stock anterior y nuevo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    producto_id      BIGINT        NOT NULL,
    tipo             VARCHAR(30)   NOT NULL,
    direccion        VARCHAR(10)   NOT NULL,
    cantidad         INT           NOT NULL,
    stock_anterior   INT           NOT NULL,
    stock_nuevo      INT           NOT NULL,
    costo_unitario   DECIMAL(14,2) NULL,
    fecha            DATETIME(6)   NOT NULL,
    referencia_tipo  VARCHAR(30)   NOT NULL,
    referencia_id    BIGINT        NULL,
    usuario_registro VARCHAR(100)  NULL,
    observaciones    VARCHAR(500)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_movimientos_tipo CHECK (tipo IN (
        'COMPRA', 'VENTA', 'DEVOLUCION_VENTA', 'DEVOLUCION_COMPRA',
        'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'MERMA', 'CARGA_INICIAL')),
    CONSTRAINT chk_movimientos_direccion CHECK (direccion IN ('ENTRADA', 'SALIDA')),
    CONSTRAINT chk_movimientos_referencia CHECK (referencia_tipo IN (
        'VENTA', 'COMPRA', 'AJUSTE_MANUAL', 'CARGA_INICIAL')),
    CONSTRAINT chk_movimientos_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_movimientos_stock    CHECK (stock_anterior >= 0 AND stock_nuevo >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_movimientos_producto_fecha ON movimientos_inventario (producto_id, fecha);
CREATE INDEX idx_movimientos_tipo           ON movimientos_inventario (tipo);
CREATE INDEX idx_movimientos_referencia     ON movimientos_inventario (referencia_tipo, referencia_id);
CREATE INDEX idx_movimientos_fecha          ON movimientos_inventario (fecha);

-- Traza del stock preexistente: cada producto migrado con stock > 0 recibe
-- un único movimiento CARGA_INICIAL que explica de dónde viene su stock.
-- No inventa historial: documenta el punto de partida real de la migración.
INSERT INTO movimientos_inventario (
    producto_id, tipo, direccion, cantidad, stock_anterior, stock_nuevo,
    costo_unitario, fecha, referencia_tipo, referencia_id, usuario_registro, observaciones)
SELECT
    p.id, 'CARGA_INICIAL', 'ENTRADA', p.stock_actual, 0, p.stock_actual,
    NULL, NOW(6), 'CARGA_INICIAL', p.id, 'migracion-fase1',
    'Stock existente al momento de la migración a Gestión Comercial (FASE 1).'
FROM productos p
WHERE p.stock_actual > 0
  AND NOT EXISTS (
      SELECT 1 FROM movimientos_inventario m
      WHERE m.producto_id = p.id AND m.tipo = 'CARGA_INICIAL'
  );

-- =====================================================================
-- ETAPA 9 — RETIRO DE VARIABLES ANTIGUAS  (NO EJECUTAR TODAVÍA)
-- =====================================================================
-- Ejecutar SOLO cuando se cumpla TODO lo siguiente:
--   1. La aplicación lleva al menos un ciclo estable con las columnas nuevas.
--   2. El frontend ya no consume precio / cantidadStock / categoria (enum).
--   3. Las pruebas pasan y se validó el catálogo público.
--   4. Existe respaldo verificado de la base de datos.
--
-- Verificación previa recomendada (debe devolver 0 filas):
--   SELECT id, precio, precio_venta_actual, cantidad_stock, stock_actual
--   FROM productos
--   WHERE (precio IS NOT NULL AND precio <> precio_venta_actual)
--      OR (cantidad_stock IS NOT NULL AND cantidad_stock <> stock_actual);
--
-- ALTER TABLE productos DROP COLUMN precio;
-- ALTER TABLE productos DROP COLUMN cantidad_stock;
-- ALTER TABLE productos DROP COLUMN categoria;
-- =====================================================================
