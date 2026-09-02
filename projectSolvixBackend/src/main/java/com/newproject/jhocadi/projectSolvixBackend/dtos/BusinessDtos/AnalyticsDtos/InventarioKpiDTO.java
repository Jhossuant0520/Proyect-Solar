package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * KPIs de inventario del período. Las fórmulas oficiales de SOLVIX son:
 *
 * <pre>
 * inventarioDisponible = stockInicial + unidadesIngresadas - unidadesDevueltasProveedor
 * sellThrough          = unidadesVendidas / inventarioDisponible × 100
 * velocidadVenta       = unidadesVendidas / díasDelPeríodo
 * diasInventario       = stockActual / velocidadVenta
 * inventarioPromedio   = (valorInventarioInicial + valorInventarioFinal) / 2
 * inventoryTurnover    = costoVentas / inventarioPromedio
 * </pre>
 *
 * Las unidades vendidas son netas de devolución de cliente.
 *
 * <p>Numerador y denominador de la rotación están ambos en costo histórico: el costo de ventas
 * sale de las líneas de venta y el inventario se valora con el costo que regía en cada fecha.
 * Si algún producto con existencias no tiene costo conocido en esas fechas,
 * {@code valorInventarioInicial}, {@code valorInventarioFinal}, {@code inventarioPromedio} e
 * {@code inventoryTurnover} viajan en {@code null} con estado {@code COSTO_INCOMPLETO}.
 *
 * <p>{@code valorInventario} es aparte: vale la bodega de hoy a costo de reposición actual.
 */
@Data
@Builder
public class InventarioKpiDTO {

    private PeriodoDTO periodo;

    private long stockTotal;
    private BigDecimal valorInventario;

    private long stockInicial;
    private BigDecimal valorInventarioInicial;
    private long stockFinal;
    private BigDecimal valorInventarioFinal;
    private BigDecimal inventarioPromedio;

    /**
     * Productos con existencias cuyo costo histórico no se conoce en alguno de los dos extremos
     * del período. Mientras sea mayor que cero, la rotación no se puede calcular.
     */
    private int productosSinValuacionHistorica;

    /** Unidades que entraron y quedaron disponibles para vender (compras, carga inicial, ajustes). */
    private long unidadesIngresadas;
    private long unidadesDevueltasProveedor;
    private long inventarioDisponible;

    private long unidadesVendidas;
    private BigDecimal costoVentas;

    private BigDecimal inventoryTurnover;
    private BigDecimal sellThrough;
    private BigDecimal velocidadVenta;
    private BigDecimal diasInventario;

    private long productosStockCritico;
    private long umbralStockCritico;

    /** Productos activos con stock cuyo costo se desconoce: el valor del inventario queda corto. */
    private long productosSinCosto;

    private EstadoMetrica estadoValorInventario;
    private EstadoMetrica estadoTurnover;
    private EstadoMetrica estadoSellThrough;
    private EstadoMetrica estadoDiasInventario;
}
