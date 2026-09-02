package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionCompra;

/**
 * Consultas agregadas de devolución de compra, imputadas por su propia fecha.
 * Reducen las compras netas sin tocar el histórico de la compra original.
 */
public interface DevolucionCompraAnalyticsRepository extends Repository<DevolucionCompra, Long> {

    interface ResumenDevoluciones {
        BigDecimal getMonto();
        BigDecimal getCosto();
        Long getDocumentos();
    }

    interface PuntoDiario {
        Integer getAnio();
        Integer getMes();
        Integer getDia();
        BigDecimal getMonto();
    }

    interface DevolucionPorProveedor {
        Long getProveedorId();
        BigDecimal getMonto();
    }

    interface DevolucionPorProducto {
        Long getProductoId();
        Long getUnidades();
        BigDecimal getMonto();
        BigDecimal getCosto();
    }

    @Query("""
        SELECT COALESCE(SUM(dc.montoTotalDevuelto), 0) AS monto,
               COALESCE(SUM(dc.costoTotalDevuelto), 0) AS costo,
               COUNT(dc.id)                            AS documentos
        FROM DevolucionCompra dc
        WHERE dc.fecha >= :desde AND dc.fecha <= :hasta
        """)
    ResumenDevoluciones resumen(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT YEAR(dc.fecha)  AS anio,
               MONTH(dc.fecha) AS mes,
               DAY(dc.fecha)   AS dia,
               COALESCE(SUM(dc.montoTotalDevuelto), 0) AS monto
        FROM DevolucionCompra dc
        WHERE dc.fecha >= :desde AND dc.fecha <= :hasta
        GROUP BY YEAR(dc.fecha), MONTH(dc.fecha), DAY(dc.fecha)
        """)
    List<PuntoDiario> serieDiaria(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT pr.id AS proveedorId,
               COALESCE(SUM(dc.montoTotalDevuelto), 0) AS monto
        FROM DevolucionCompra dc
        JOIN dc.compra c
        JOIN c.proveedor pr
        WHERE dc.fecha >= :desde AND dc.fecha <= :hasta
        GROUP BY pr.id
        """)
    List<DevolucionPorProveedor> devolucionesPorProveedor(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT p.id AS productoId,
               COALESCE(SUM(dd.cantidad), 0)      AS unidades,
               COALESCE(SUM(dd.montoDevuelto), 0) AS monto,
               COALESCE(SUM(dd.costoUnitario * dd.cantidad), 0) AS costo
        FROM DetalleDevolucionCompra dd
        JOIN dd.devolucion dc
        JOIN dd.producto p
        WHERE dc.fecha >= :desde AND dc.fecha <= :hasta
        GROUP BY p.id
        """)
    List<DevolucionPorProducto> devolucionesPorProducto(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
