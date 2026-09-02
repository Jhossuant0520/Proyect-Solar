package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.DashboardResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.SerieTemporalDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * KPIs 1 a 7: ventas netas, comparación entre períodos, ganancia, margen, pedidos,
 * ticket promedio y serie temporal.
 */
class DashboardAnalyticsServiceTest extends AnalyticsTestSupport {

    @Autowired
    private DashboardAnalyticsService dashboardAnalyticsService;

    @Autowired
    private VentasAnalyticsService ventasAnalyticsService;

    @Test
    @DisplayName("Ventas 1.000.000 y costo 600.000 dan ganancia 400.000 y margen 40%")
    void gananciaYMargenConValoresConocidos() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), new BigDecimal("600.00"), 1000);
        vender(producto, 1000);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasBrutas()).isEqualByComparingTo("1000000.00");
        assertThat(resumen.getDevoluciones()).isEqualByComparingTo("0.00");
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("1000000.00");
        assertThat(resumen.getCostoVentas()).isEqualByComparingTo("600000.00");
        assertThat(resumen.getGananciaBruta()).isEqualByComparingTo("400000.00");
        assertThat(resumen.getMargenBruto()).isEqualByComparingTo("40.00");
        assertThat(resumen.getPedidos()).isEqualTo(1);
        assertThat(resumen.getTicketPromedio()).isEqualByComparingTo("1000000.00");
        assertThat(resumen.getEstadoVentas()).isEqualTo(EstadoMetrica.OK);
        assertThat(resumen.getEstadoGanancia()).isEqualTo(EstadoMetrica.OK);
        assertThat(resumen.getLineasSinCosto()).isZero();
    }

    @Test
    @DisplayName("La devolución reduce las ventas netas y revierte su costo, sin tocar la venta original")
    void devolucionReduceVentasNetas() {
        Producto producto = crearProducto("Producto B", new BigDecimal("1000.00"), new BigDecimal("600.00"), 1000);
        VentaResponseDTO venta = vender(producto, 1000);

        devolverVenta(venta, 0, 200);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasBrutas()).isEqualByComparingTo("1000000.00");
        assertThat(resumen.getDevoluciones()).isEqualByComparingTo("200000.00");
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("800000.00");
        assertThat(resumen.getCostoVentas()).isEqualByComparingTo("480000.00");
        assertThat(resumen.getGananciaBruta()).isEqualByComparingTo("320000.00");
        assertThat(resumen.getMargenBruto()).isEqualByComparingTo("40.00");

        // La devolución no es un pedido nuevo ni borra la venta original.
        assertThat(resumen.getPedidos()).isEqualTo(1);
        assertThat(ventaService.obtenerPorId(venta.getId()).getTotal()).isEqualByComparingTo("1000000.00");
        assertThat(ventaService.obtenerPorId(venta.getId()).getEstado())
            .isEqualTo(EstadoVenta.PARCIALMENTE_DEVUELTA);
    }

    @Test
    @DisplayName("Varias devoluciones se acumulan sin diferencia de redondeo")
    void multiplesDevolucionesAcumulan() {
        Producto producto = crearProducto("Producto C", new BigDecimal("100.00"), new BigDecimal("60.00"), 30);
        VentaResponseDTO venta = vender(producto, 30);

        devolverVenta(venta, 0, 10);
        devolverVenta(venta, 0, 20);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasBrutas()).isEqualByComparingTo("3000.00");
        assertThat(resumen.getDevoluciones()).isEqualByComparingTo("3000.00");
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("0.00");
        assertThat(resumen.getCostoVentas()).isEqualByComparingTo("0.00");
        assertThat(resumen.getGananciaBruta()).isEqualByComparingTo("0.00");
        // Sin ventas netas no hay margen que calcular: no se divide entre cero.
        assertThat(resumen.getMargenBruto()).isNull();
        assertThat(resumen.getEstadoMargen()).isEqualTo(EstadoMetrica.SIN_DATOS);
    }

    @Test
    @DisplayName("Un costo desconocido no produce margen falso: la métrica queda marcada como incompleta")
    void costoDesconocidoMarcaMetricaIncompleta() {
        Producto conCosto = crearProducto("Con costo", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);
        Producto sinCosto = crearProducto("Sin costo", new BigDecimal("100.00"), null, 10);

        vender(conCosto, 10);
        vender(sinCosto, 10);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("2000.00");
        assertThat(resumen.getCostoVentas()).isEqualByComparingTo("600.00");
        assertThat(resumen.getLineasSinCosto()).isEqualTo(1);
        assertThat(resumen.getEstadoGanancia()).isEqualTo(EstadoMetrica.COSTO_INCOMPLETO);
        assertThat(resumen.getEstadoMargen()).isEqualTo(EstadoMetrica.COSTO_INCOMPLETO);
    }

    @Test
    @DisplayName("Un período sin operaciones responde SIN_DATOS, no cero")
    void periodoSinDatos() {
        crearProducto("Producto D", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(periodoVacio());

        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("0.00");
        assertThat(resumen.getPedidos()).isZero();
        assertThat(resumen.getMargenBruto()).isNull();
        assertThat(resumen.getTicketPromedio()).isNull();
        assertThat(resumen.getEstadoVentas()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(resumen.getEstadoMargen()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(resumen.getEstadoTicket()).isEqualTo(EstadoMetrica.SIN_DATOS);
    }

    @Test
    @DisplayName("Con período anterior en cero no se devuelve infinito sino SIN_BASE_DE_COMPARACION")
    void periodoAnteriorEnCero() {
        Producto producto = crearProducto("Producto E", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);
        vender(producto, 5);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getComparativa().getVentasNetas().getAnterior()).isEqualByComparingTo("0.00");
        assertThat(resumen.getComparativa().getVentasNetas().getVariacionPorcentual()).isNull();
        assertThat(resumen.getComparativa().getVentasNetas().getEstado())
            .isEqualTo(EstadoMetrica.SIN_BASE_DE_COMPARACION);
    }

    @Test
    @DisplayName("La comparación entre períodos aplica ((actual - anterior) / anterior) × 100")
    void comparacionEntrePeriodos() {
        Producto producto = crearProducto("Producto F", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);

        VentaResponseDTO ayer = vender(producto, 5);
        moverFechaDeVenta(ayer, LocalDate.now().minusDays(1).atTime(10, 0));

        vender(producto, 10);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("1000.00");
        assertThat(resumen.getComparativa().getVentasNetas().getAnterior()).isEqualByComparingTo("500.00");
        assertThat(resumen.getComparativa().getVentasNetas().getVariacionPorcentual())
            .isEqualByComparingTo("100.00");
        assertThat(resumen.getComparativa().getVentasNetas().getEstado()).isEqualTo(EstadoMetrica.OK);
    }

    @Test
    @DisplayName("Los pedidos no cuentan ventas pendientes ni canceladas")
    void pedidosSoloCuentanOperacionesRealizadas() {
        Producto producto = crearProducto("Producto G", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);

        vender(producto, 2);
        venderSinCompletar(producto, 3);
        ventaService.cancelar(venderSinCompletar(producto, 4).getId());

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getPedidos()).isEqualTo(1);
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("200.00");
    }

    @Test
    @DisplayName("El ticket promedio divide ventas netas entre pedidos válidos")
    void ticketPromedioSobrePedidosValidos() {
        Producto producto = crearProducto("Producto H", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);

        vender(producto, 3);
        vender(producto, 7);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getPedidos()).isEqualTo(2);
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("1000.00");
        assertThat(resumen.getTicketPromedio()).isEqualByComparingTo("500.00");
    }

    @Test
    @DisplayName("El ticket promedio neto usa ventas netas sobre pedidos, sin descontar el pedido devuelto")
    void ticketPromedioNetoConDevolucion() {
        Producto producto = crearProducto("Producto K", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);

        VentaResponseDTO primera = vender(producto, 10);
        vender(producto, 5);

        devolverVenta(primera, 0, 3);

        DashboardResumenDTO resumen = dashboardAnalyticsService.resumen(hoy());

        assertThat(resumen.getVentasBrutas()).isEqualByComparingTo("1500.00");
        assertThat(resumen.getDevoluciones()).isEqualByComparingTo("300.00");
        assertThat(resumen.getVentasNetas()).isEqualByComparingTo("1200.00");
        // La devolución reduce el numerador pero el pedido devuelto sigue contando: 1200 / 2.
        assertThat(resumen.getPedidos()).isEqualTo(2);
        assertThat(resumen.getTicketPromedio()).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("La serie diaria incluye los días sin ventas como cero")
    void serieDiariaRellenaDiasVacios() {
        Producto producto = crearProducto("Producto I", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);

        VentaResponseDTO ayer = vender(producto, 2);
        moverFechaDeVenta(ayer, LocalDate.now().minusDays(1).atTime(9, 0));

        vender(producto, 3);

        LocalDateTime inicio = LocalDate.now().minusDays(2).atStartOfDay();
        SerieTemporalDTO serie = ventasAnalyticsService.serie(
            new PeriodoAnalitico(inicio, LocalDate.now().plusDays(1).atStartOfDay().minusNanos(1),
                Agrupacion.DIA));

        assertThat(serie.getPuntos()).hasSize(3);
        assertThat(serie.getEstado()).isEqualTo(EstadoMetrica.OK);

        assertThat(serie.getPuntos().get(0).getVentas()).isEqualByComparingTo("0.00");
        assertThat(serie.getPuntos().get(0).getPedidos()).isZero();

        assertThat(serie.getPuntos().get(1).getVentas()).isEqualByComparingTo("200.00");
        assertThat(serie.getPuntos().get(1).getGanancia()).isEqualByComparingTo("80.00");
        assertThat(serie.getPuntos().get(1).getPedidos()).isEqualTo(1);

        assertThat(serie.getPuntos().get(2).getVentas()).isEqualByComparingTo("300.00");
        assertThat(serie.getPuntos().get(2).getGanancia()).isEqualByComparingTo("120.00");
    }

    @Test
    @DisplayName("La serie mensual agrupa el período completo en un punto")
    void serieMensualAgrupa() {
        Producto producto = crearProducto("Producto J", new BigDecimal("100.00"), new BigDecimal("60.00"), 100);
        vender(producto, 4);

        SerieTemporalDTO serie = ventasAnalyticsService.serie(hoy(Agrupacion.MES));

        assertThat(serie.getPuntos()).hasSize(1);
        assertThat(serie.getPuntos().get(0).getVentasNetas()).isEqualByComparingTo("400.00");
        assertThat(serie.getPuntos().get(0).getEtiqueta())
            .isEqualTo(String.format("%04d-%02d", LocalDate.now().getYear(), LocalDate.now().getMonthValue()));
    }

    @Test
    @DisplayName("La serie de un período sin operaciones queda en SIN_DATOS")
    void serieSinDatos() {
        SerieTemporalDTO serie = ventasAnalyticsService.serie(periodoVacio());

        assertThat(serie.getEstado()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(serie.getPuntos()).isNotEmpty();
        assertThat(serie.getPuntos()).allSatisfy(
            punto -> assertThat(punto.getVentasNetas()).isEqualByComparingTo("0.00"));
    }

    /** Reubica una venta en el tiempo para poder comparar períodos en una sola ejecución. */
    private void moverFechaDeVenta(VentaResponseDTO venta, LocalDateTime fecha) {
        var entidad = ventaRepository.findById(venta.getId()).orElseThrow();
        entidad.setFecha(fecha);
        ventaRepository.save(entidad);
    }
}
