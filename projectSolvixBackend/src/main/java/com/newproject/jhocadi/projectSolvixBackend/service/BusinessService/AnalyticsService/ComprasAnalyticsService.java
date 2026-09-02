package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoCompradoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProveedorGastoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.VentasSerieDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.CompraAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.DevolucionCompraAnalyticsRepository;

import lombok.RequiredArgsConstructor;

/**
 * KPI 18: analytics de abastecimiento.
 *
 * <pre>comprasNetas = comprasBrutas - devolucionesDeCompra</pre>
 *
 * <p>Mismo principio que en ventas: la compra original conserva su importe histórico y la
 * devolución al proveedor se resta aparte. El criterio de compra realizada es
 * {@link EstadoCompra#esCompraRealizada()}: una compra devuelta sigue siendo una compra,
 * una cancelada nunca ocurrió.
 */
@Service
@RequiredArgsConstructor
public class ComprasAnalyticsService {

    private static final List<EstadoCompra> ESTADOS_REALIZADOS = Arrays.stream(EstadoCompra.values())
        .filter(EstadoCompra::esCompraRealizada)
        .toList();

    private final CompraAnalyticsRepository compraRepository;
    private final DevolucionCompraAnalyticsRepository devolucionRepository;

    @Transactional(readOnly = true)
    public CompraAnalyticsDTO analytics(PeriodoAnalitico periodo, Long proveedorId) {
        var resumen = compraRepository.resumen(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta());
        var devoluciones = devolucionRepository.resumen(periodo.desde(), periodo.hasta());

        BigDecimal brutas = CalculoAnalytics.dinero(resumen.getComprasBrutas());
        BigDecimal devuelto = CalculoAnalytics.dinero(devoluciones.getMonto());
        long ordenes = CalculoAnalytics.nvl(resumen.getOrdenes());

        List<ProveedorGastoDTO> porProveedor = gastoPorProveedor(periodo, brutas).stream()
            .filter(p -> proveedorId == null || proveedorId.equals(p.getProveedorId()))
            .toList();

        return CompraAnalyticsDTO.builder()
            .periodo(periodo.aDTO())
            .comprasBrutas(brutas)
            .devolucionesCompra(devuelto)
            .comprasNetas(CalculoAnalytics.dinero(brutas.subtract(devuelto)))
            .ordenes(ordenes)
            .gastoPorProveedor(porProveedor)
            .productosComprados(productosComprados(periodo))
            .serie(serie(periodo))
            .estado(ordenes > 0 || CalculoAnalytics.nvl(devoluciones.getDocumentos()) > 0
                ? EstadoMetrica.OK
                : EstadoMetrica.SIN_DATOS)
            .build();
    }

    private List<ProveedorGastoDTO> gastoPorProveedor(PeriodoAnalitico periodo, BigDecimal totalBrutas) {
        Map<Long, BigDecimal> devoluciones =
            devolucionRepository.devolucionesPorProveedor(periodo.desde(), periodo.hasta()).stream()
                .collect(Collectors.toMap(
                    DevolucionCompraAnalyticsRepository.DevolucionPorProveedor::getProveedorId,
                    d -> CalculoAnalytics.nvl(d.getMonto())));

        List<ProveedorGastoDTO> resultado = new ArrayList<>();

        for (var compra : compraRepository.comprasPorProveedor(
                ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {

            BigDecimal brutas = CalculoAnalytics.dinero(compra.getComprasBrutas());
            BigDecimal devuelto = CalculoAnalytics.dinero(
                devoluciones.getOrDefault(compra.getProveedorId(), BigDecimal.ZERO));

            resultado.add(ProveedorGastoDTO.builder()
                .proveedorId(compra.getProveedorId())
                .nombre(compra.getNombre())
                .comprasBrutas(brutas)
                .devoluciones(devuelto)
                .comprasNetas(CalculoAnalytics.dinero(brutas.subtract(devuelto)))
                .ordenes(CalculoAnalytics.nvl(compra.getOrdenes()))
                .participacion(CalculoAnalytics.porcentaje(brutas, totalBrutas))
                .build());
        }

        return resultado.stream()
            .sorted(Comparator.comparing(ProveedorGastoDTO::getComprasNetas).reversed())
            .toList();
    }

    private List<ProductoCompradoDTO> productosComprados(PeriodoAnalitico periodo) {
        Map<Long, DevolucionCompraAnalyticsRepository.DevolucionPorProducto> devoluciones =
            devolucionRepository.devolucionesPorProducto(periodo.desde(), periodo.hasta()).stream()
                .collect(Collectors.toMap(
                    DevolucionCompraAnalyticsRepository.DevolucionPorProducto::getProductoId,
                    Function.identity()));

        List<ProductoCompradoDTO> resultado = new ArrayList<>();

        for (var compra : compraRepository.comprasPorProducto(
                ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {

            var devolucion = devoluciones.get(compra.getProductoId());
            BigDecimal costo = CalculoAnalytics.dinero(compra.getCosto());
            BigDecimal devuelto = devolucion != null
                ? CalculoAnalytics.dinero(devolucion.getMonto())
                : CalculoAnalytics.cero();

            resultado.add(ProductoCompradoDTO.builder()
                .productoId(compra.getProductoId())
                .nombre(compra.getNombre())
                .unidades(CalculoAnalytics.nvl(compra.getUnidades()))
                .unidadesDevueltas(devolucion != null ? CalculoAnalytics.nvl(devolucion.getUnidades()) : 0L)
                .costoCompras(costo)
                .costoDevuelto(devuelto)
                .costoNeto(CalculoAnalytics.dinero(costo.subtract(devuelto)))
                .build());
        }

        return resultado.stream()
            .sorted(Comparator.comparing(ProductoCompradoDTO::getCostoNeto).reversed())
            .toList();
    }

    /** Serie de compras con la misma forma que la de ventas, para poder superponerlas. */
    private List<VentasSerieDTO> serie(PeriodoAnalitico periodo) {
        Map<LocalDate, Acumulado> buckets = new LinkedHashMap<>();

        for (var punto : compraRepository.serieDiaria(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {
            Acumulado acumulado = bucketDe(buckets, periodo, punto.getAnio(), punto.getMes(), punto.getDia());
            acumulado.compras = acumulado.compras.add(CalculoAnalytics.nvl(punto.getTotal()));
            acumulado.ordenes += CalculoAnalytics.nvl(punto.getOrdenes());
        }

        for (var punto : devolucionRepository.serieDiaria(periodo.desde(), periodo.hasta())) {
            Acumulado acumulado = bucketDe(buckets, periodo, punto.getAnio(), punto.getMes(), punto.getDia());
            acumulado.devoluciones = acumulado.devoluciones.add(CalculoAnalytics.nvl(punto.getMonto()));
        }

        return buckets.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entrada -> {
                Acumulado acumulado = entrada.getValue();
                return VentasSerieDTO.builder()
                    .fecha(entrada.getKey())
                    .etiqueta(entrada.getKey().toString())
                    .ventas(CalculoAnalytics.dinero(acumulado.compras))
                    .devoluciones(CalculoAnalytics.dinero(acumulado.devoluciones))
                    .ventasNetas(CalculoAnalytics.dinero(acumulado.compras.subtract(acumulado.devoluciones)))
                    .pedidos(acumulado.ordenes)
                    .build();
            })
            .toList();
    }

    private Acumulado bucketDe(
            Map<LocalDate, Acumulado> buckets, PeriodoAnalitico periodo, int anio, int mes, int dia) {
        return buckets.computeIfAbsent(
            periodo.bucketDe(LocalDate.of(anio, mes, dia)), fecha -> new Acumulado());
    }

    private static final class Acumulado {
        private BigDecimal compras = BigDecimal.ZERO;
        private BigDecimal devoluciones = BigDecimal.ZERO;
        private long ordenes;
    }
}
