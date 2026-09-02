package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionVenta;

/**
 * Consultas agregadas de devolución de venta.
 *
 * <p>Las devoluciones se imputan por su <b>propia fecha</b>, no por la de la venta original.
 * Una devolución de marzo sobre una venta de enero reduce las ventas netas de marzo: es
 * cuando el dinero volvió. La venta de enero conserva intacto su importe histórico.
 */
public interface DevolucionVentaAnalyticsRepository extends Repository<DevolucionVenta, Long> {

    interface ResumenDevoluciones {
        BigDecimal getMonto();
        BigDecimal getCosto();
        Long getDocumentos();
        Long getDocumentosSinCosto();
    }

    interface PuntoDiario {
        Integer getAnio();
        Integer getMes();
        Integer getDia();
        BigDecimal getMonto();
        BigDecimal getCosto();
    }

    interface DevolucionPorProducto {
        Long getProductoId();
        Long getUnidades();
        BigDecimal getMonto();
        BigDecimal getCosto();
    }

    interface DevolucionPorCategoria {
        String getCodigo();
        Long getUnidades();
        BigDecimal getMonto();
        BigDecimal getCosto();
    }

    @Query("""
        SELECT COALESCE(SUM(dv.montoTotalDevuelto), 0) AS monto,
               COALESCE(SUM(dv.costoTotalDevuelto), 0) AS costo,
               COUNT(dv.id)                            AS documentos,
               COALESCE(SUM(CASE WHEN dv.costoCompletoConocido = false THEN 1 ELSE 0 END), 0)
                                                       AS documentosSinCosto
        FROM DevolucionVenta dv
        WHERE dv.fecha >= :desde AND dv.fecha <= :hasta
        """)
    ResumenDevoluciones resumen(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    /** Unidades físicas que volvieron, para descontarlas de la rotación y la velocidad de venta. */
    @Query("""
        SELECT COALESCE(SUM(dd.cantidad), 0)
        FROM DetalleDevolucionVenta dd
        JOIN dd.devolucion dv
        WHERE dv.fecha >= :desde AND dv.fecha <= :hasta
        """)
    Long unidadesDevueltas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT YEAR(dv.fecha)  AS anio,
               MONTH(dv.fecha) AS mes,
               DAY(dv.fecha)   AS dia,
               COALESCE(SUM(dv.montoTotalDevuelto), 0) AS monto,
               COALESCE(SUM(dv.costoTotalDevuelto), 0) AS costo
        FROM DevolucionVenta dv
        WHERE dv.fecha >= :desde AND dv.fecha <= :hasta
        GROUP BY YEAR(dv.fecha), MONTH(dv.fecha), DAY(dv.fecha)
        """)
    List<PuntoDiario> serieDiaria(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT p.id AS productoId,
               COALESCE(SUM(dd.cantidad), 0)      AS unidades,
               COALESCE(SUM(dd.montoDevuelto), 0) AS monto,
               COALESCE(SUM(dd.costoUnitario * dd.cantidad), 0) AS costo
        FROM DetalleDevolucionVenta dd
        JOIN dd.devolucion dv
        JOIN dd.producto p
        WHERE dv.fecha >= :desde AND dv.fecha <= :hasta
        GROUP BY p.id
        """)
    List<DevolucionPorProducto> devolucionesPorProducto(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT det.categoriaCodigo AS codigo,
               COALESCE(SUM(dd.cantidad), 0)      AS unidades,
               COALESCE(SUM(dd.montoDevuelto), 0) AS monto,
               COALESCE(SUM(dd.costoUnitario * dd.cantidad), 0) AS costo
        FROM DetalleDevolucionVenta dd
        JOIN dd.devolucion dv
        JOIN dd.detalleVenta det
        WHERE dv.fecha >= :desde AND dv.fecha <= :hasta
        GROUP BY det.categoriaCodigo
        """)
    List<DevolucionPorCategoria> devolucionesPorCategoria(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
