-- =====================================================================
-- SOLVIX — Costo histórico del inventario
-- Motor: MySQL 8.x
-- Requiere: V1__fase1_gestion_comercial.sql, V2__devoluciones_venta.sql
--           y V3__devoluciones_compra.sql
-- =====================================================================
-- OBJETIVO:
--   Permitir valorar el inventario en una fecha pasada con el costo que
--   regía en ese momento, en lugar del costo actual del producto.
--   Sin esto, el Inventory Turnover mezcla dos criterios: costo histórico
--   en el numerador (costo de ventas) y costo de reposición de hoy en el
--   denominador (inventario promedio).
--
--   La línea de tiempo del costo de cada producto queda formada por:
--     1. movimientos_inventario.costo_producto_resultante
--        -> costo vigente tras cada operación que movió unidades
--     2. ajustes_costo_producto
--        -> correcciones manuales, que no mueven unidades
--
--   El costo vigente en una fecha es el punto más reciente anterior a
--   esa fecha entre ambas fuentes.
--
-- NO destructivo: no borra ni recalcula ninguna fila existente. No toca
-- ventas, compras, devoluciones ni el costo congelado en los detalles.
-- =====================================================================

SET NAMES utf8mb4;

-- =====================================================================
-- ETAPA 1 — COSTO RESULTANTE EN EL LIBRO DE INVENTARIO
--
-- costo_unitario           = costo económico de ESTA operación.
--                            NULL en ajustes y mermas, donde no se conoce.
-- costo_producto_resultante = costo vigente del PRODUCTO después de aplicar
--                            el movimiento y la política de costeo.
--
-- Son magnitudes distintas y ninguna sustituye a la otra. En un ajuste
-- manual el primero queda NULL y el segundo conserva el costo vigente.
--
-- La columna es NULL para los movimientos ya existentes. NO se rellenan:
-- reconstruirlos con el costo de hoy sería inventar historia. Analytics
-- los reconoce como valuación no disponible.
-- =====================================================================

ALTER TABLE movimientos_inventario
    ADD COLUMN costo_producto_resultante DECIMAL(14,2) NULL AFTER costo_unitario;

-- Sirve a la subconsulta que busca, por producto, el último movimiento
-- con costo conocido anterior a una fecha.
CREATE INDEX idx_movimientos_costo_resultante
    ON movimientos_inventario (producto_id, fecha, costo_producto_resultante);

-- =====================================================================
-- ETAPA 2 — HISTORIAL DE CORRECCIONES MANUALES DE COSTO
--
-- costo_actual deja de ser editable desde el PUT de producto. Cuando hay
-- que intervenirlo a mano, la corrección se registra aquí con su motivo,
-- su usuario y su fecha.
--
-- stock_al_ajustar se guarda para dejar constancia de que un ajuste de
-- costo NO mueve unidades: el stock antes y después es el mismo, y por
-- eso esta operación no genera movimiento de inventario.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ajustes_costo_producto (
    id                        BIGINT        NOT NULL AUTO_INCREMENT,
    producto_id               BIGINT        NOT NULL,
    costo_anterior            DECIMAL(14,2) NULL,
    costo_nuevo               DECIMAL(14,2) NOT NULL,
    costo_producto_resultante DECIMAL(14,2) NULL,
    stock_al_ajustar          INT           NOT NULL,
    motivo                    VARCHAR(30)   NOT NULL,
    observaciones             VARCHAR(500)  NULL,
    usuario_registro          VARCHAR(100)  NULL,
    fecha                     DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ajustes_costo_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT chk_ajustes_costo_motivo CHECK (motivo IN (
        'CORRECCION_ERROR', 'ACTUALIZACION_PROVEEDOR', 'CARGA_DE_COSTO_INICIAL',
        'REVALUACION', 'OTRO')),
    CONSTRAINT chk_ajustes_costo_valores CHECK (
        costo_nuevo >= 0
        AND (costo_anterior IS NULL OR costo_anterior >= 0)
        AND stock_al_ajustar >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_ajustes_costo_producto_fecha ON ajustes_costo_producto (producto_id, fecha);
CREATE INDEX idx_ajustes_costo_fecha          ON ajustes_costo_producto (fecha);
CREATE INDEX idx_ajustes_costo_motivo         ON ajustes_costo_producto (motivo);

-- =====================================================================
-- ETAPA 3 — FECHA DESDE LA QUE LA ROTACIÓN ES HISTÓRICAMENTE PRECISA
--
-- Todo movimiento registrado A PARTIR de la ejecución de esta migración
-- lleva costo_producto_resultante. Los anteriores quedan en NULL.
--
-- En consecuencia:
--
--   * Períodos cuyos dos extremos caen después de esta migración, y cuyos
--     productos con existencias tengan al menos un punto de costo previo:
--     Inventory Turnover exacto, estado OK.
--
--   * Períodos que abarquen datos anteriores:
--     valorInventarioInicial, valorInventarioFinal, inventarioPromedio e
--     inventoryTurnover viajan en NULL con estado COSTO_INCOMPLETO.
--
-- Para conocer la fecha exacta de corte en una instalación concreta:
--
--   SELECT MIN(fecha) AS inicio_valuacion_historica
--   FROM movimientos_inventario
--   WHERE costo_producto_resultante IS NOT NULL;
--
-- Los productos que ya existen y no volverán a tener movimiento pueden
-- incorporarse a la línea de tiempo registrando un ajuste de costo
-- explícito (motivo CARGA_DE_COSTO_INICIAL) mediante
-- POST /api/v1/inventario/ajustes/costo. Es una decisión del negocio,
-- no algo que esta migración haga por su cuenta.
-- =====================================================================

-- =====================================================================
-- ETAPA 4 — VERIFICACIÓN
-- =====================================================================
-- 4.a La columna nueva no alteró ningún movimiento existente.
--     El conteo debe ser idéntico al previo a la migración.
--
--   SELECT COUNT(*) FROM movimientos_inventario;
--
-- 4.b Movimientos con costo resultante, por tipo. Los ajustes y mermas
--     pueden traer costo_unitario NULL y aun así costo_producto_resultante
--     conocido: son magnitudes distintas.
--
--   SELECT tipo,
--          COUNT(*)                                                        AS movimientos,
--          SUM(costo_unitario IS NULL)                                     AS sin_costo_operacion,
--          SUM(costo_producto_resultante IS NULL)                          AS sin_costo_resultante
--   FROM movimientos_inventario
--   GROUP BY tipo;
--
-- 4.c Un ajuste de costo nunca debe haber movido stock. Debe devolver 0 filas.
--     (El stock solo cambia por movimientos_inventario; esta consulta
--     confirma que no se creó un movimiento asociado al ajuste.)
--
--   SELECT a.id, a.fecha
--   FROM ajustes_costo_producto a
--   JOIN movimientos_inventario m
--     ON m.producto_id = a.producto_id AND m.fecha = a.fecha
--   WHERE m.stock_anterior <> m.stock_nuevo;
--
-- 4.d Costo vigente de un producto en una fecha dada, uniendo ambas
--     fuentes. Es la consulta que reproduce la valuación de analytics.
--
--   SELECT costo, fecha FROM (
--       SELECT costo_producto_resultante AS costo, fecha
--       FROM movimientos_inventario
--       WHERE producto_id = :productoId
--         AND costo_producto_resultante IS NOT NULL
--         AND fecha <= :fecha
--       UNION ALL
--       SELECT costo_producto_resultante AS costo, fecha
--       FROM ajustes_costo_producto
--       WHERE producto_id = :productoId
--         AND costo_producto_resultante IS NOT NULL
--         AND fecha <= :fecha
--   ) linea_de_tiempo
--   ORDER BY fecha DESC
--   LIMIT 1;
-- =====================================================================
