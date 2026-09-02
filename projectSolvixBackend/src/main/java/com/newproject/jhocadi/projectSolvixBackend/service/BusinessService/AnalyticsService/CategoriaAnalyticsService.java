package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CategoriaAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.DevolucionVentaAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.VentaAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.CategoriaProductoRepository;

import lombok.RequiredArgsConstructor;

/**
 * KPIs 10 y 11: ventas y ganancia por categoría.
 *
 * <p>La agrupación usa el {@code categoriaCodigo} congelado en la línea de venta, no la
 * categoría actual del producto. Si mañana un producto cambia de categoría, las ventas de
 * ayer siguen contando donde realmente se hicieron. El nombre visible sí se resuelve contra
 * la tabla de categorías, para que renombrar una categoría no rompa los reportes históricos.
 */
@Service
@RequiredArgsConstructor
public class CategoriaAnalyticsService {

    private static final List<EstadoVenta> ESTADOS_REALIZADOS = Arrays.stream(EstadoVenta.values())
        .filter(EstadoVenta::esVentaRealizada)
        .toList();

    private final VentaAnalyticsRepository ventaRepository;
    private final DevolucionVentaAnalyticsRepository devolucionRepository;
    private final CategoriaProductoRepository categoriaRepository;

    @Transactional(readOnly = true)
    public List<CategoriaAnalyticsDTO> porCategoria(PeriodoAnalitico periodo, Long categoriaId) {
        Map<String, DevolucionVentaAnalyticsRepository.DevolucionPorCategoria> devoluciones =
            devolucionRepository.devolucionesPorCategoria(periodo.desde(), periodo.hasta()).stream()
                .filter(d -> d.getCodigo() != null)
                .collect(Collectors.toMap(
                    DevolucionVentaAnalyticsRepository.DevolucionPorCategoria::getCodigo,
                    Function.identity()));

        Map<String, CategoriaProducto> catalogo = categoriaRepository.findAll().stream()
            .collect(Collectors.toMap(
                c -> c.getCodigo().toUpperCase(), Function.identity(), (a, b) -> a));

        List<CategoriaAnalyticsDTO> resultado = new ArrayList<>();
        BigDecimal totalVentas = BigDecimal.ZERO;

        for (var venta : ventaRepository.ventasPorCategoria(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {
            var devolucion = venta.getCodigo() != null ? devoluciones.get(venta.getCodigo()) : null;

            long unidades = CalculoAnalytics.nvl(venta.getUnidades())
                - (devolucion != null ? CalculoAnalytics.nvl(devolucion.getUnidades()) : 0L);

            BigDecimal ventas = CalculoAnalytics.dinero(CalculoAnalytics.nvl(venta.getIngresos())
                .subtract(devolucion != null ? CalculoAnalytics.nvl(devolucion.getMonto()) : BigDecimal.ZERO));

            BigDecimal costo = CalculoAnalytics.dinero(CalculoAnalytics.nvl(venta.getCosto())
                .subtract(devolucion != null ? CalculoAnalytics.nvl(devolucion.getCosto()) : BigDecimal.ZERO));

            boolean costoCompleto = CalculoAnalytics.nvl(venta.getLineasSinCosto()) == 0;
            BigDecimal ganancia = costoCompleto ? CalculoAnalytics.dinero(ventas.subtract(costo)) : null;

            CategoriaProducto categoria = venta.getCodigo() != null
                ? catalogo.get(venta.getCodigo().toUpperCase())
                : null;

            totalVentas = totalVentas.add(ventas);

            resultado.add(CategoriaAnalyticsDTO.builder()
                .categoriaId(categoria != null ? categoria.getId() : null)
                .codigo(venta.getCodigo())
                .nombre(categoria != null ? categoria.getNombre() : venta.getCodigo())
                .ventas(ventas)
                .unidades(unidades)
                .pedidos(CalculoAnalytics.nvl(venta.getPedidos()))
                .costo(costo)
                .ganancia(ganancia)
                .margen(ganancia == null ? null : CalculoAnalytics.porcentaje(ganancia, ventas))
                .estadoGanancia(costoCompleto ? EstadoMetrica.OK : EstadoMetrica.COSTO_INCOMPLETO)
                .build());
        }

        aplicarParticipacion(resultado, totalVentas);

        return resultado.stream()
            .filter(c -> categoriaId == null || categoriaId.equals(c.getCategoriaId()))
            .sorted(Comparator.comparing(CategoriaAnalyticsDTO::getVentas).reversed())
            .toList();
    }

    /** La participación se calcula sobre el total del período, antes de filtrar por categoría. */
    private void aplicarParticipacion(List<CategoriaAnalyticsDTO> categorias, BigDecimal totalVentas) {
        for (CategoriaAnalyticsDTO categoria : categorias) {
            categoria.setParticipacion(CalculoAnalytics.porcentaje(categoria.getVentas(), totalVentas));
        }
    }
}
