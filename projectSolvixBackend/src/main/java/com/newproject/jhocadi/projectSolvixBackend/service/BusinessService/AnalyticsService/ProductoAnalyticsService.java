package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ABCProductoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.AnalisisABCDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CriterioRanking;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoBajoRendimientoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoRankingDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.DevolucionVentaAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.VentaAnalyticsRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;

/**
 * Rankings de producto y clasificación ABC.
 *
 * <p><b>Todo es neto de devolución:</b> lo que volvió no se vendió, así que se descuenta
 * de unidades, ingresos y costo.
 *
 * <p><b>Productos con costo desconocido:</b> su ganancia y su margen se devuelven en
 * {@code null} con estado COSTO_INCOMPLETO en lugar de un número inflado. Sumar solo el
 * costo de las líneas conocidas produciría un margen falso cercano al 100%, que es
 * exactamente la lectura que hay que evitar.
 */
@Service
@RequiredArgsConstructor
public class ProductoAnalyticsService {

    /** Un producto recién creado no vende poco: todavía no tuvo tiempo de vender. */
    private static final long DIAS_PARA_JUZGAR_DESEMPENIO = 30;

    private static final BigDecimal LIMITE_A = new BigDecimal("80.00");
    private static final BigDecimal LIMITE_B = new BigDecimal("95.00");

    private static final List<EstadoVenta> ESTADOS_REALIZADOS = Arrays.stream(EstadoVenta.values())
        .filter(EstadoVenta::esVentaRealizada)
        .toList();

    private final VentaAnalyticsRepository ventaRepository;
    private final DevolucionVentaAnalyticsRepository devolucionRepository;
    private final ProductoRepository productoRepository;

    /** KPI 8 y 16: ranking de productos por el criterio pedido. */
    @Transactional(readOnly = true)
    public List<ProductoRankingDTO> ranking(
            PeriodoAnalitico periodo, CriterioRanking criterio, int limite, String categoriaCodigo) {

        List<ProductoRankingDTO> ranking = construirRanking(periodo);

        if (categoriaCodigo != null && !categoriaCodigo.isBlank()) {
            ranking = ranking.stream()
                .filter(p -> categoriaCodigo.equalsIgnoreCase(p.getCategoriaCodigo()))
                .toList();
        }

        return ranking.stream()
            .sorted(comparador(criterio != null ? criterio : CriterioRanking.UNIDADES))
            .limit(limite)
            .toList();
    }

    /**
     * KPI 9: productos de bajo desempeño. No se juzga solo por unidades; viajan también
     * ingresos, stock, velocidad, días sin venta y antigüedad para que la lectura sea justa.
     * Los productos demasiado nuevos se marcan y se envían al final del listado.
     */
    @Transactional(readOnly = true)
    public List<ProductoBajoRendimientoDTO> bajoRendimiento(PeriodoAnalitico periodo, int limite) {
        Map<Long, ProductoRankingDTO> vendidos = construirRanking(periodo).stream()
            .collect(Collectors.toMap(ProductoRankingDTO::getProductoId, Function.identity()));

        Map<Long, LocalDateTime> ultimaVenta = ventaRepository.ultimaVentaPorProducto(ESTADOS_REALIZADOS)
            .stream()
            .filter(u -> u.getFecha() != null)
            .collect(Collectors.toMap(
                VentaAnalyticsRepository.UltimaVenta::getProductoId,
                VentaAnalyticsRepository.UltimaVenta::getFecha));

        BigDecimal dias = BigDecimal.valueOf(periodo.dias());
        List<ProductoBajoRendimientoDTO> resultado = new ArrayList<>();

        for (Producto producto : productosActivos()) {
            ProductoRankingDTO venta = vendidos.get(producto.getId());
            long unidades = venta != null ? venta.getUnidades() : 0L;
            BigDecimal ingresos = venta != null ? venta.getIngresos() : CalculoAnalytics.cero();

            LocalDateTime ultima = ultimaVenta.get(producto.getId());
            long diasEnCatalogo = producto.getFechaCreacion() == null
                ? DIAS_PARA_JUZGAR_DESEMPENIO
                : ChronoUnit.DAYS.between(producto.getFechaCreacion(), periodo.hasta());

            resultado.add(ProductoBajoRendimientoDTO.builder()
                .productoId(producto.getId())
                .nombre(producto.getNombre())
                .categoriaCodigo(codigoDe(producto))
                .categoriaNombre(nombreCategoriaDe(producto))
                .unidades(unidades)
                .ingresos(ingresos)
                .stockActual(producto.getStockActual())
                .velocidadVenta(CalculoAnalytics.dividir(
                    BigDecimal.valueOf(unidades), dias, CalculoAnalytics.ESCALA_RATIO))
                .ultimaVenta(ultima)
                .diasSinVenta(ultima == null ? null : ChronoUnit.DAYS.between(ultima, periodo.hasta()))
                .diasEnCatalogo(diasEnCatalogo)
                .estado(estadoDesempenio(diasEnCatalogo, unidades))
                .build());
        }

        Comparator<ProductoBajoRendimientoDTO> orden = Comparator
            .comparing((ProductoBajoRendimientoDTO p) -> p.getEstado() == EstadoMetrica.SIN_HISTORIAL_SUFICIENTE)
            .thenComparingLong(ProductoBajoRendimientoDTO::getUnidades)
            .thenComparing(ProductoBajoRendimientoDTO::getIngresos);

        return resultado.stream().sorted(orden).limit(limite).toList();
    }

    /**
     * KPI 17: clasificación ABC sobre la participación acumulada.
     * A hasta 80%, B por encima de 80% y hasta 95%, C el resto.
     */
    @Transactional(readOnly = true)
    public AnalisisABCDTO analisisABC(PeriodoAnalitico periodo, CriterioRanking criterio) {
        CriterioRanking usado = criterio == CriterioRanking.GANANCIA
            ? CriterioRanking.GANANCIA
            : CriterioRanking.INGRESOS;

        List<ProductoRankingDTO> productos = construirRanking(periodo).stream()
            .filter(p -> magnitudABC(p, usado) != null && magnitudABC(p, usado).signum() > 0)
            .sorted(Comparator.comparing(
                (ProductoRankingDTO p) -> magnitudABC(p, usado)).reversed())
            .toList();

        BigDecimal total = productos.stream()
            .map(p -> magnitudABC(p, usado))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.signum() == 0) {
            return AnalisisABCDTO.builder()
                .periodo(periodo.aDTO())
                .criterio(usado)
                .limiteA(LIMITE_A)
                .limiteB(LIMITE_B)
                .total(CalculoAnalytics.cero())
                .productos(List.of())
                .estado(EstadoMetrica.SIN_DATOS)
                .build();
        }

        List<ABCProductoDTO> clasificados = new ArrayList<>();
        BigDecimal acumulado = BigDecimal.ZERO;

        for (ProductoRankingDTO producto : productos) {
            BigDecimal magnitud = magnitudABC(producto, usado);
            BigDecimal participacion = CalculoAnalytics.porcentaje(magnitud, total);
            acumulado = acumulado.add(participacion);

            clasificados.add(ABCProductoDTO.builder()
                .productoId(producto.getProductoId())
                .nombre(producto.getNombre())
                .categoriaCodigo(producto.getCategoriaCodigo())
                .ingresos(CalculoAnalytics.dinero(magnitud))
                .participacion(participacion)
                .participacionAcumulada(acumulado.setScale(
                    CalculoAnalytics.ESCALA_PORCENTAJE, CalculoAnalytics.REDONDEO))
                .clasificacion(clasificar(acumulado))
                .build());
        }

        return AnalisisABCDTO.builder()
            .periodo(periodo.aDTO())
            .criterio(usado)
            .limiteA(LIMITE_A)
            .limiteB(LIMITE_B)
            .total(CalculoAnalytics.dinero(total))
            .productos(clasificados)
            .estado(EstadoMetrica.OK)
            .build();
    }

    /** Une ventas y devoluciones del período para obtener el desempeño neto por producto. */
    private List<ProductoRankingDTO> construirRanking(PeriodoAnalitico periodo) {
        Map<Long, DevolucionVentaAnalyticsRepository.DevolucionPorProducto> devoluciones =
            devolucionRepository.devolucionesPorProducto(periodo.desde(), periodo.hasta()).stream()
                .collect(Collectors.toMap(
                    DevolucionVentaAnalyticsRepository.DevolucionPorProducto::getProductoId,
                    Function.identity()));

        Map<Long, Producto> catalogo = productosActivos().stream()
            .collect(Collectors.toMap(Producto::getId, Function.identity(), (a, b) -> a));

        List<ProductoRankingDTO> ranking = new ArrayList<>();

        for (var venta : ventaRepository.ventasPorProducto(ESTADOS_REALIZADOS, periodo.desde(), periodo.hasta())) {
            var devolucion = devoluciones.get(venta.getProductoId());

            long unidades = CalculoAnalytics.nvl(venta.getUnidades())
                - (devolucion != null ? CalculoAnalytics.nvl(devolucion.getUnidades()) : 0L);

            BigDecimal ingresos = CalculoAnalytics.dinero(CalculoAnalytics.nvl(venta.getIngresos())
                .subtract(devolucion != null ? CalculoAnalytics.nvl(devolucion.getMonto()) : BigDecimal.ZERO));

            BigDecimal costo = CalculoAnalytics.dinero(CalculoAnalytics.nvl(venta.getCosto())
                .subtract(devolucion != null ? CalculoAnalytics.nvl(devolucion.getCosto()) : BigDecimal.ZERO));

            boolean costoCompleto = CalculoAnalytics.nvl(venta.getLineasSinCosto()) == 0;
            BigDecimal ganancia = costoCompleto ? CalculoAnalytics.dinero(ingresos.subtract(costo)) : null;

            Producto producto = catalogo.get(venta.getProductoId());

            ranking.add(ProductoRankingDTO.builder()
                .productoId(venta.getProductoId())
                .nombre(venta.getNombre())
                .categoriaCodigo(venta.getCategoriaCodigo())
                .categoriaNombre(producto != null ? nombreCategoriaDe(producto) : null)
                .unidades(unidades)
                .ingresos(ingresos)
                .costo(costo)
                .ganancia(ganancia)
                .margen(ganancia == null ? null : CalculoAnalytics.porcentaje(ganancia, ingresos))
                .stockActual(producto != null ? producto.getStockActual() : null)
                .estadoGanancia(costoCompleto ? EstadoMetrica.OK : EstadoMetrica.COSTO_INCOMPLETO)
                .build());
        }

        return ranking;
    }

    private BigDecimal magnitudABC(ProductoRankingDTO producto, CriterioRanking criterio) {
        return criterio == CriterioRanking.GANANCIA ? producto.getGanancia() : producto.getIngresos();
    }

    private String clasificar(BigDecimal participacionAcumulada) {
        if (participacionAcumulada.compareTo(LIMITE_A) <= 0) {
            return "A";
        }
        return participacionAcumulada.compareTo(LIMITE_B) <= 0 ? "B" : "C";
    }

    private EstadoMetrica estadoDesempenio(long diasEnCatalogo, long unidades) {
        if (diasEnCatalogo < DIAS_PARA_JUZGAR_DESEMPENIO) {
            return EstadoMetrica.SIN_HISTORIAL_SUFICIENTE;
        }
        return unidades == 0 ? EstadoMetrica.SIN_VENTAS_RECIENTES : EstadoMetrica.OK;
    }

    /**
     * Ordena de mayor a menor. Los valores nulos (ganancia o margen desconocidos por falta
     * de costo) van al final: no se puede premiar a un producto por un dato que no existe.
     */
    private Comparator<ProductoRankingDTO> comparador(CriterioRanking criterio) {
        Comparator<BigDecimal> descNullsLast = Comparator
            .nullsLast(Comparator.<BigDecimal>naturalOrder().reversed());

        return switch (criterio) {
            case UNIDADES -> Comparator.comparingLong(ProductoRankingDTO::getUnidades).reversed();
            case INGRESOS -> Comparator.comparing(ProductoRankingDTO::getIngresos, descNullsLast);
            case GANANCIA -> Comparator.comparing(ProductoRankingDTO::getGanancia, descNullsLast);
            case MARGEN -> Comparator.comparing(ProductoRankingDTO::getMargen, descNullsLast);
        };
    }

    /** El catálogo activo es un conjunto acotado; el volumen transaccional ya se redujo en la base. */
    private List<Producto> productosActivos() {
        return productoRepository.findAll().stream().filter(Producto::isActivo).toList();
    }

    private String codigoDe(Producto producto) {
        CategoriaProducto categoria = producto.getCategoria();
        return categoria != null ? categoria.getCodigo() : null;
    }

    private String nombreCategoriaDe(Producto producto) {
        CategoriaProducto categoria = producto.getCategoria();
        return categoria != null ? categoria.getNombre() : null;
    }
}
