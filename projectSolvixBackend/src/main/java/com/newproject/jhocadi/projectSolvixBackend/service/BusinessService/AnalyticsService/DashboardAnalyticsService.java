package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ComparativaResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.DashboardResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;

import lombok.RequiredArgsConstructor;

/**
 * Resumen ejecutivo del período y su comparación contra el período anterior equivalente.
 *
 * <p>No calcula nada por su cuenta: compone los totales de {@link VentasAnalyticsService}
 * para el período pedido y para el anterior, y deriva las variaciones.
 */
@Service
@RequiredArgsConstructor
public class DashboardAnalyticsService {

    private final VentasAnalyticsService ventasAnalyticsService;

    @Transactional(readOnly = true)
    public DashboardResumenDTO resumen(PeriodoAnalitico periodo) {
        PeriodoAnalitico anterior = periodo.anterior();

        TotalesVentas actual = ventasAnalyticsService.totales(periodo);
        TotalesVentas previo = ventasAnalyticsService.totales(anterior);

        return DashboardResumenDTO.builder()
            .periodo(periodo.aDTO())
            .ventasBrutas(actual.ventasBrutas())
            .devoluciones(actual.devoluciones())
            .ventasNetas(actual.ventasNetas())
            .costoVentas(actual.costoVentas())
            .gananciaBruta(actual.gananciaBruta())
            .margenBruto(actual.margenBruto())
            .pedidos(actual.pedidos())
            .ticketPromedio(actual.ticketPromedio())
            .estadoVentas(estadoVentas(actual))
            .estadoGanancia(CalculoAnalytics.estado(
                actual.hayOperaciones(), actual.costoCompleto(), actual.gananciaBruta()))
            .estadoMargen(estadoDerivado(actual.margenBruto(), actual.costoCompleto()))
            .estadoTicket(estadoDerivado(actual.ticketPromedio(), true))
            .lineasSinCosto(actual.lineasSinCosto())
            .comparativa(ComparativaResumenDTO.builder()
                .periodoAnterior(anterior.aDTO())
                .ventasBrutas(CalculoAnalytics.variacion(actual.ventasBrutas(), previo.ventasBrutas()))
                .devoluciones(CalculoAnalytics.variacion(actual.devoluciones(), previo.devoluciones()))
                .ventasNetas(CalculoAnalytics.variacion(actual.ventasNetas(), previo.ventasNetas()))
                .gananciaBruta(CalculoAnalytics.variacion(actual.gananciaBruta(), previo.gananciaBruta()))
                .margenBruto(CalculoAnalytics.variacion(actual.margenBruto(), previo.margenBruto()))
                .pedidos(CalculoAnalytics.variacion(
                    BigDecimal.valueOf(actual.pedidos()), BigDecimal.valueOf(previo.pedidos())))
                .ticketPromedio(CalculoAnalytics.variacion(actual.ticketPromedio(), previo.ticketPromedio()))
                .build())
            .build();
    }

    private EstadoMetrica estadoVentas(TotalesVentas totales) {
        if (!totales.hayOperaciones()) {
            return EstadoMetrica.SIN_DATOS;
        }
        return totales.ventasNetas().signum() == 0 ? EstadoMetrica.VALOR_CERO : EstadoMetrica.OK;
    }

    /** Margen y ticket son {@code null} cuando su denominador es cero: eso es SIN_DATOS, no 0%. */
    private EstadoMetrica estadoDerivado(BigDecimal valor, boolean costoCompleto) {
        if (valor == null) {
            return EstadoMetrica.SIN_DATOS;
        }
        if (!costoCompleto) {
            return EstadoMetrica.COSTO_INCOMPLETO;
        }
        return valor.signum() == 0 ? EstadoMetrica.VALOR_CERO : EstadoMetrica.OK;
    }
}
