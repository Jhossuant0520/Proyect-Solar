package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;

/**
 * Consultas agregadas de venta. Todas reducen en base de datos: analytics nunca carga
 * las operaciones en memoria para sumarlas.
 *
 * <p><b>Prorrateo del descuento de cabecera.</b> El subtotal de una línea no incluye el
 * descuento aplicado al total de la venta. Para que la suma de los ingresos por producto
 * coincida exactamente con las ventas brutas, cada línea se lleva su parte proporcional:
 *
 * <pre>ingresoLinea = detalle.subtotal × venta.total / venta.subtotal</pre>
 *
 * <p><b>Costo desconocido.</b> {@code costoUnitario} es NULL cuando el costo se desconoce,
 * y SQL lo excluye de la suma. Nunca se sustituye por cero; en su lugar se cuentan las
 * líneas afectadas para que la métrica pueda declararse incompleta.
 *
 * <p><b>Agrupación temporal.</b> Se agrupa por año/mes/día con funciones estándar de JPQL
 * en lugar de formatear fechas con sintaxis propia del motor. El resultado son a lo sumo
 * 366 filas por año, que el servicio reagrupa a semana, mes o año.
 */
public interface VentaAnalyticsRepository extends Repository<Venta, Long> {

    interface ResumenVentas {
        BigDecimal getVentasBrutas();
        Long getPedidos();
    }

    interface CostoVentas {
        BigDecimal getCosto();
        Long getUnidades();
        Long getLineasSinCosto();
    }

    interface PuntoDiario {
        Integer getAnio();
        Integer getMes();
        Integer getDia();
        BigDecimal getTotal();
        Long getPedidos();
    }

    interface CostoDiario {
        Integer getAnio();
        Integer getMes();
        Integer getDia();
        BigDecimal getCosto();
    }

    interface VentaPorProducto {
        Long getProductoId();
        String getNombre();
        String getCategoriaCodigo();
        Long getUnidades();
        BigDecimal getIngresos();
        BigDecimal getCosto();
        Long getLineasSinCosto();
    }

    interface VentaPorCategoria {
        String getCodigo();
        Long getUnidades();
        BigDecimal getIngresos();
        BigDecimal getCosto();
        Long getLineasSinCosto();
        Long getPedidos();
    }

    interface UltimaVenta {
        Long getProductoId();
        LocalDateTime getFecha();
    }

    @Query("""
        SELECT COALESCE(SUM(v.total), 0) AS ventasBrutas,
               COUNT(v.id)               AS pedidos
        FROM Venta v
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        """)
    ResumenVentas resumen(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT COALESCE(SUM(d.costoUnitario * d.cantidad), 0)                  AS costo,
               COALESCE(SUM(d.cantidad), 0)                                    AS unidades,
               COALESCE(SUM(CASE WHEN d.costoConocido = false THEN 1 ELSE 0 END), 0) AS lineasSinCosto
        FROM DetalleVenta d
        JOIN d.venta v
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        """)
    CostoVentas costoDeVentas(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT YEAR(v.fecha)              AS anio,
               MONTH(v.fecha)             AS mes,
               DAY(v.fecha)               AS dia,
               COALESCE(SUM(v.total), 0)  AS total,
               COUNT(v.id)                AS pedidos
        FROM Venta v
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        GROUP BY YEAR(v.fecha), MONTH(v.fecha), DAY(v.fecha)
        ORDER BY YEAR(v.fecha), MONTH(v.fecha), DAY(v.fecha)
        """)
    List<PuntoDiario> serieDiaria(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT YEAR(v.fecha)  AS anio,
               MONTH(v.fecha) AS mes,
               DAY(v.fecha)   AS dia,
               COALESCE(SUM(d.costoUnitario * d.cantidad), 0) AS costo
        FROM DetalleVenta d
        JOIN d.venta v
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        GROUP BY YEAR(v.fecha), MONTH(v.fecha), DAY(v.fecha)
        """)
    List<CostoDiario> costoDiario(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT p.id                AS productoId,
               p.nombre            AS nombre,
               d.categoriaCodigo   AS categoriaCodigo,
               COALESCE(SUM(d.cantidad), 0) AS unidades,
               COALESCE(SUM(CASE WHEN v.subtotal > 0
                                 THEN d.subtotal * v.total / v.subtotal
                                 ELSE d.subtotal END), 0) AS ingresos,
               COALESCE(SUM(d.costoUnitario * d.cantidad), 0) AS costo,
               COALESCE(SUM(CASE WHEN d.costoConocido = false THEN 1 ELSE 0 END), 0) AS lineasSinCosto
        FROM DetalleVenta d
        JOIN d.venta v
        JOIN d.producto p
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        GROUP BY p.id, p.nombre, d.categoriaCodigo
        """)
    List<VentaPorProducto> ventasPorProducto(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT d.categoriaCodigo AS codigo,
               COALESCE(SUM(d.cantidad), 0) AS unidades,
               COALESCE(SUM(CASE WHEN v.subtotal > 0
                                 THEN d.subtotal * v.total / v.subtotal
                                 ELSE d.subtotal END), 0) AS ingresos,
               COALESCE(SUM(d.costoUnitario * d.cantidad), 0) AS costo,
               COALESCE(SUM(CASE WHEN d.costoConocido = false THEN 1 ELSE 0 END), 0) AS lineasSinCosto,
               COUNT(DISTINCT v.id) AS pedidos
        FROM DetalleVenta d
        JOIN d.venta v
        WHERE v.estado IN :estados
          AND v.fecha >= :desde
          AND v.fecha <= :hasta
        GROUP BY d.categoriaCodigo
        """)
    List<VentaPorCategoria> ventasPorCategoria(
        @Param("estados") Collection<EstadoVenta> estados,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);

    /** Última venta de cada producto en toda la historia, no solo en el período consultado. */
    @Query("""
        SELECT p.id AS productoId, MAX(v.fecha) AS fecha
        FROM DetalleVenta d
        JOIN d.venta v
        JOIN d.producto p
        WHERE v.estado IN :estados
        GROUP BY p.id
        """)
    List<UltimaVenta> ultimaVentaPorProducto(@Param("estados") Collection<EstadoVenta> estados);
}
