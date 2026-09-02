package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;

/**
 * Consultas agregadas de compra. Usa el mismo prorrateo del descuento de cabecera que
 * ventas, para que el gasto por proveedor y por producto sume exactamente las compras brutas.
 */
public interface CompraAnalyticsRepository extends Repository<Compra, Long> {

    interface ResumenCompras {
        BigDecimal getComprasBrutas();
        Long getOrdenes();
    }

    interface PuntoDiario {
        Integer getAnio();
        Integer getMes();
        Integer getDia();
        BigDecimal getTotal();
        Long getOrdenes();
    }

    interface CompraPorProveedor {
        Long getProveedorId();
        String getNombre();
        BigDecimal getComprasBrutas();
        Long getOrdenes();
    }

    interface CompraPorProducto {
        Long getProductoId();
        String getNombre();
        Long getUnidades();
        BigDecimal getCosto();
    }

    @Query("""
        SELECT COALESCE(SUM(c.total), 0) AS comprasBrutas,
               COUNT(c.id)               AS ordenes
        FROM Compra c
        WHERE c.estado IN :estados
          AND c.fecha >= :desde
          AND c.fecha <= :hasta
        """)
    ResumenCompras resumen(
        @Param("estados") Collection<EstadoCompra> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT YEAR(c.fecha)             AS anio,
               MONTH(c.fecha)            AS mes,
               DAY(c.fecha)              AS dia,
               COALESCE(SUM(c.total), 0) AS total,
               COUNT(c.id)               AS ordenes
        FROM Compra c
        WHERE c.estado IN :estados
          AND c.fecha >= :desde
          AND c.fecha <= :hasta
        GROUP BY YEAR(c.fecha), MONTH(c.fecha), DAY(c.fecha)
        ORDER BY YEAR(c.fecha), MONTH(c.fecha), DAY(c.fecha)
        """)
    List<PuntoDiario> serieDiaria(
        @Param("estados") Collection<EstadoCompra> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT pr.id     AS proveedorId,
               pr.nombre AS nombre,
               COALESCE(SUM(c.total), 0) AS comprasBrutas,
               COUNT(c.id)               AS ordenes
        FROM Compra c
        JOIN c.proveedor pr
        WHERE c.estado IN :estados
          AND c.fecha >= :desde
          AND c.fecha <= :hasta
        GROUP BY pr.id, pr.nombre
        """)
    List<CompraPorProveedor> comprasPorProveedor(
        @Param("estados") Collection<EstadoCompra> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT p.id     AS productoId,
               p.nombre AS nombre,
               COALESCE(SUM(d.cantidad), 0) AS unidades,
               COALESCE(SUM(CASE WHEN c.subtotal > 0
                                 THEN d.subtotal * c.total / c.subtotal
                                 ELSE d.subtotal END), 0) AS costo
        FROM DetalleCompra d
        JOIN d.compra c
        JOIN d.producto p
        WHERE c.estado IN :estados
          AND c.fecha >= :desde
          AND c.fecha <= :hasta
        GROUP BY p.id, p.nombre
        """)
    List<CompraPorProducto> comprasPorProducto(
        @Param("estados") Collection<EstadoCompra> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
