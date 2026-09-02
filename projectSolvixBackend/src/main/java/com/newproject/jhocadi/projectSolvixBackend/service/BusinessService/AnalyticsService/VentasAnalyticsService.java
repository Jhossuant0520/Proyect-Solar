package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.SerieTemporalDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.VentasSerieDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.DevolucionVentaAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.VentaAnalyticsRepository;

import lombok.RequiredArgsConstructor;

/**
 * KPIs de venta: ventas netas, costo de ventas, ganancia bruta, margen, pedidos,
 * ticket promedio y serie temporal.
 *
 * <p><b>Qué cuenta como venta.</b> El criterio es {@link EstadoVenta#esVentaRealizada()}:
 * COMPLETADA, PARCIALMENTE_DEVUELTA y DEVUELTA. Una devolución no borra la venta original
 * ni cuenta como pedido nuevo; se resta aparte como devolución.
 *
 * <p><b>Costo de ventas.</b> Sale del costo congelado en cada línea de venta, jamás de
 * {@code Producto.costoActual}. Lo devuelto revierte su costo con el mismo criterio
 * histórico, así que el costo del período es el costo de lo que efectivamente se quedó vendido.
 */
@Service
@RequiredArgsConstructor
public class VentasAnalyticsService {

    private static final List<EstadoVenta> ESTADOS_REALIZADOS = Arrays.stream(EstadoVenta.values())
        .filter(EstadoVenta::esVentaRealizada)
        .toList();

    private final VentaAnalyticsRepository ventaRepository;
    private final DevolucionVentaAnalyticsRepository devolucionRepository;

    /**
     * <pre>
     * ventasNetas   = ventasBrutas - devoluciones
     * costoVentas   = costoLíneasVendidas - costoLíneasDevueltas
     * gananciaBruta = ventasNetas - costoVentas
     * margenBruto   = gananciaBruta / ventasNetas × 100
     * ticket        = ventasNetas / pedidos
     * </pre>
     */
    @Transactional(readOnly = true)
    public TotalesVentas totales(PeriodoAnalitico periodo) {
        var resumen = ventaRepository.resumen(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta());
        var costos = ventaRepository.costoDeVentas(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta());
        var devoluciones = devolucionRepository.resumen(periodo.desde(), periodo.hasta());

        BigDecimal ventasBrutas = CalculoAnalytics.dinero(resumen.getVentasBrutas());
        BigDecimal montoDevuelto = CalculoAnalytics.dinero(devoluciones.getMonto());
        BigDecimal ventasNetas = CalculoAnalytics.dinero(ventasBrutas.subtract(montoDevuelto));

        BigDecimal costoVentas = CalculoAnalytics.dinero(
            CalculoAnalytics.nvl(costos.getCosto()).subtract(CalculoAnalytics.nvl(devoluciones.getCosto())));

        BigDecimal ganancia = CalculoAnalytics.dinero(ventasNetas.subtract(costoVentas));

        long pedidos = CalculoAnalytics.nvl(resumen.getPedidos());
        long lineasSinCosto = CalculoAnalytics.nvl(costos.getLineasSinCosto());
        long devolucionesSinCosto = CalculoAnalytics.nvl(devoluciones.getDocumentosSinCosto());
        long unidadesNetas = CalculoAnalytics.nvl(costos.getUnidades())
            - CalculoAnalytics.nvl(devolucionRepository.unidadesDevueltas(periodo.desde(), periodo.hasta()));

        return new TotalesVentas(
            ventasBrutas,
            montoDevuelto,
            ventasNetas,
            costoVentas,
            ganancia,
            CalculoAnalytics.porcentaje(ganancia, ventasNetas),
            pedidos,
            CalculoAnalytics.dividir(ventasNetas, BigDecimal.valueOf(pedidos), CalculoAnalytics.ESCALA_DINERO),
            unidadesNetas,
            lineasSinCosto,
            lineasSinCosto == 0 && devolucionesSinCosto == 0,
            pedidos > 0 || CalculoAnalytics.nvl(devoluciones.getDocumentos()) > 0);
    }

    /**
     * Serie temporal de ventas. La consulta agrega por día en base de datos y aquí se
     * reagrupa al bucket pedido: un año en curso son 366 filas como mucho, no las ventas.
     */
    @Transactional(readOnly = true)
    public SerieTemporalDTO serie(PeriodoAnalitico periodo) {
        Map<LocalDate, Acumulado> buckets = new LinkedHashMap<>();

        for (LocalDate fecha : bucketsDelPeriodo(periodo)) {
            buckets.put(fecha, new Acumulado());
        }

        for (var punto : ventaRepository.serieDiaria(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {
            Acumulado acumulado = bucketDe(buckets, periodo, punto.getAnio(), punto.getMes(), punto.getDia());
            acumulado.ventas = acumulado.ventas.add(CalculoAnalytics.nvl(punto.getTotal()));
            acumulado.pedidos += CalculoAnalytics.nvl(punto.getPedidos());
        }

        for (var punto : ventaRepository.costoDiario(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {
            Acumulado acumulado = bucketDe(buckets, periodo, punto.getAnio(), punto.getMes(), punto.getDia());
            acumulado.costo = acumulado.costo.add(CalculoAnalytics.nvl(punto.getCosto()));
        }

        for (var punto : devolucionRepository.serieDiaria(periodo.desde(), periodo.hasta())) {
            Acumulado acumulado = bucketDe(buckets, periodo, punto.getAnio(), punto.getMes(), punto.getDia());
            acumulado.devoluciones = acumulado.devoluciones.add(CalculoAnalytics.nvl(punto.getMonto()));
            acumulado.costoDevuelto = acumulado.costoDevuelto.add(CalculoAnalytics.nvl(punto.getCosto()));
        }

        List<VentasSerieDTO> puntos = new ArrayList<>();
        boolean hayDatos = false;

        for (var entrada : buckets.entrySet()) {
            Acumulado acumulado = entrada.getValue();
            BigDecimal netas = acumulado.ventas.subtract(acumulado.devoluciones);
            BigDecimal costo = acumulado.costo.subtract(acumulado.costoDevuelto);

            hayDatos = hayDatos || acumulado.pedidos > 0 || acumulado.devoluciones.signum() != 0;

            puntos.add(VentasSerieDTO.builder()
                .fecha(entrada.getKey())
                .etiqueta(etiqueta(entrada.getKey(), periodo.agrupacion()))
                .ventas(CalculoAnalytics.dinero(acumulado.ventas))
                .devoluciones(CalculoAnalytics.dinero(acumulado.devoluciones))
                .ventasNetas(CalculoAnalytics.dinero(netas))
                .ganancia(CalculoAnalytics.dinero(netas.subtract(costo)))
                .pedidos(acumulado.pedidos)
                .build());
        }

        return SerieTemporalDTO.builder()
            .periodo(periodo.aDTO())
            .puntos(puntos)
            .estado(hayDatos ? EstadoMetrica.OK : EstadoMetrica.SIN_DATOS)
            .build();
    }

    /** Buckets vacíos del período: un día sin ventas debe aparecer como cero, no faltar. */
    private List<LocalDate> bucketsDelPeriodo(PeriodoAnalitico periodo) {
        List<LocalDate> fechas = new ArrayList<>();
        LocalDate fin = periodo.hasta().toLocalDate();

        for (LocalDate dia = periodo.desde().toLocalDate(); !dia.isAfter(fin); dia = dia.plusDays(1)) {
            LocalDate bucket = periodo.bucketDe(dia);
            if (fechas.isEmpty() || !fechas.get(fechas.size() - 1).equals(bucket)) {
                fechas.add(bucket);
            }
        }
        return fechas;
    }

    private Acumulado bucketDe(
            Map<LocalDate, Acumulado> buckets, PeriodoAnalitico periodo, int anio, int mes, int dia) {
        return buckets.computeIfAbsent(
            periodo.bucketDe(LocalDate.of(anio, mes, dia)), fecha -> new Acumulado());
    }

    private String etiqueta(LocalDate fecha, Agrupacion agrupacion) {
        return switch (agrupacion) {
            case DIA -> fecha.toString();
            case SEMANA -> "Semana del " + fecha;
            case MES -> String.format("%04d-%02d", fecha.getYear(), fecha.getMonthValue());
            case ANIO -> String.valueOf(fecha.getYear());
        };
    }

    private static final class Acumulado {
        private BigDecimal ventas = BigDecimal.ZERO;
        private BigDecimal devoluciones = BigDecimal.ZERO;
        private BigDecimal costo = BigDecimal.ZERO;
        private BigDecimal costoDevuelto = BigDecimal.ZERO;
        private long pedidos;
    }
}
