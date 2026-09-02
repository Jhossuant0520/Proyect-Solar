package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DireccionMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * Consultas agregadas de inventario.
 *
 * <p><b>Reconstrucción del stock de un momento pasado.</b> No se guarda una foto diaria del
 * inventario; se reconstruye desde el stock vigente descontando el movimiento neto posterior:
 *
 * <pre>
 * stockFinal   = stockActual - movimientoNeto(después de hasta)
 * stockInicial = stockFinal  - movimientoNeto(dentro del período)
 * </pre>
 *
 * Es exacto porque {@code MovimientoInventario} registra toda variación de stock sin excepción.
 */
public interface InventarioAnalyticsRepository extends Repository<Producto, Long> {

    interface StockGlobal {
        Long getStockTotal();
        BigDecimal getValor();
        Long getProductosSinCosto();
    }

    interface StockProducto {
        Long getProductoId();
        Integer getStock();
        BigDecimal getCosto();
    }

    interface MovimientoNeto {
        Long getProductoId();
        Long getNeto();
    }

    @Query("""
        SELECT COALESCE(SUM(p.stockActual), 0) AS stockTotal,
               COALESCE(SUM(p.stockActual * p.costoActual), 0) AS valor,
               COALESCE(SUM(CASE WHEN p.costoActual IS NULL AND p.stockActual > 0
                                 THEN 1 ELSE 0 END), 0) AS productosSinCosto
        FROM Producto p
        WHERE p.activo = true
        """)
    StockGlobal stockGlobal();

    @Query("""
        SELECT p.id AS productoId, p.stockActual AS stock, p.costoActual AS costo
        FROM Producto p
        WHERE p.activo = true
        """)
    List<StockProducto> stockPorProducto();

    @Query("SELECT COUNT(p.id) FROM Producto p WHERE p.activo = true AND p.stockActual <= :umbral")
    long contarStockCritico(@Param("umbral") int umbral);

    /**
     * Movimiento neto por producto dentro de una ventana. La entrada suma y la salida resta,
     * usando la dirección declarada en el movimiento, nunca el signo de la cantidad.
     */
    @Query("""
        SELECT p.id AS productoId,
               COALESCE(SUM(CASE WHEN m.direccion = :entrada
                                 THEN m.cantidad ELSE -m.cantidad END), 0) AS neto
        FROM MovimientoInventario m
        JOIN m.producto p
        WHERE m.fecha >= :desde AND m.fecha <= :hasta
        GROUP BY p.id
        """)
    List<MovimientoNeto> movimientoNetoEntre(
        @Param("entrada") DireccionMovimiento entrada,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT p.id AS productoId,
               COALESCE(SUM(CASE WHEN m.direccion = :entrada
                                 THEN m.cantidad ELSE -m.cantidad END), 0) AS neto
        FROM MovimientoInventario m
        JOIN m.producto p
        WHERE m.fecha > :desde
        GROUP BY p.id
        """)
    List<MovimientoNeto> movimientoNetoDespuesDe(
        @Param("entrada") DireccionMovimiento entrada,
        @Param("desde") LocalDateTime desde);

    /**
     * Unidades que entraron al inventario y quedaron disponibles para vender: compras,
     * carga inicial y ajustes de entrada.
     *
     * <p>Excluye {@code DEVOLUCION_VENTA} a propósito. Las unidades que un cliente devuelve
     * ya estaban contadas en el inventario del que salieron; volver a sumarlas las contaría
     * dos veces. Su efecto se refleja restándolas de las unidades vendidas netas.
     */
    @Query("""
        SELECT COALESCE(SUM(m.cantidad), 0)
        FROM MovimientoInventario m
        WHERE m.direccion = :entrada
          AND m.tipo <> :devolucionVenta
          AND m.fecha >= :desde AND m.fecha <= :hasta
        """)
    Long unidadesIngresadas(
        @Param("entrada") DireccionMovimiento entrada,
        @Param("devolucionVenta") TipoMovimientoInventario devolucionVenta,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    /** Un punto de la línea de tiempo del costo de un producto. */
    interface CostoVigente {
        Long getProductoId();
        LocalDateTime getFecha();
        BigDecimal getCosto();
    }

    /**
     * Último costo que quedó vigente por movimiento de inventario en o antes de una fecha.
     *
     * <p>La subconsulta correlacionada busca, por producto, el movimiento más reciente que dejó
     * costo registrado. Los movimientos anteriores a la migración V4 tienen
     * {@code costoProductoResultante} nulo y quedan fuera a propósito: no se inventan valores,
     * el período se declara sin valuación histórica disponible.
     */
    @Query("""
        SELECT p.id AS productoId,
               m.fecha AS fecha,
               m.costoProductoResultante AS costo
        FROM MovimientoInventario m
        JOIN m.producto p
        WHERE m.costoProductoResultante IS NOT NULL
          AND m.fecha <= :hasta
          AND m.fecha = (SELECT MAX(m2.fecha)
                         FROM MovimientoInventario m2
                         WHERE m2.producto = m.producto
                           AND m2.costoProductoResultante IS NOT NULL
                           AND m2.fecha <= :hasta)
        """)
    List<CostoVigente> costosVigentesEnMovimientos(@Param("hasta") LocalDateTime hasta);

    /** Última corrección manual de costo en o antes de una fecha. La otra mitad de la línea de tiempo. */
    @Query("""
        SELECT p.id AS productoId,
               a.fecha AS fecha,
               a.costoProductoResultante AS costo
        FROM AjusteCostoProducto a
        JOIN a.producto p
        WHERE a.costoProductoResultante IS NOT NULL
          AND a.fecha <= :hasta
          AND a.fecha = (SELECT MAX(a2.fecha)
                         FROM AjusteCostoProducto a2
                         WHERE a2.producto = a.producto
                           AND a2.costoProductoResultante IS NOT NULL
                           AND a2.fecha <= :hasta)
        """)
    List<CostoVigente> costosVigentesEnAjustes(@Param("hasta") LocalDateTime hasta);

    /** Unidades devueltas al proveedor: salieron del inventario sin haberse vendido. */
    @Query("""
        SELECT COALESCE(SUM(m.cantidad), 0)
        FROM MovimientoInventario m
        WHERE m.tipo = :devolucionCompra
          AND m.fecha >= :desde AND m.fecha <= :hasta
        """)
    Long unidadesDevueltasAProveedor(
        @Param("devolucionCompra") TipoMovimientoInventario devolucionCompra,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
