package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.InventarioKpiDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DireccionMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.AnalyticsRepo.InventarioAnalyticsRepository;

import lombok.RequiredArgsConstructor;

/**
 * KPIs 12 a 15. Fórmulas oficiales de SOLVIX, idénticas aquí, en el DTO y en la documentación:
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
 * <p><b>Sell-through.</b> Responde qué porcentaje del inventario que estuvo disponible para
 * vender durante el período se vendió efectivamente. El denominador es inventario real, no
 * una suma de ventas más stock: incluye lo que entró por compra dentro del período y descuenta
 * lo que se devolvió al proveedor. Las devoluciones de cliente no suman inventario disponible
 * (esas unidades ya estaban contadas cuando salieron); su efecto es restar del numerador.
 *
 * <p><b>Stock de un momento pasado.</b> No hay foto diaria del inventario: se reconstruye
 * desde el stock vigente descontando el movimiento neto posterior. Las cantidades son exactas
 * porque toda variación de stock pasa por {@code MovimientoInventario}.
 *
 * <p><b>Valuación histórica.</b> El inventario inicial y final se valoran con el costo que
 * regía en cada fecha, reconstruido desde {@code MovimientoInventario.costoProductoResultante}
 * y las correcciones de {@code AjusteCostoProducto}. Nunca con {@code Producto.costoActual}:
 * ambos extremos de la rotación quedan así en costo histórico, igual que el costo de ventas.
 *
 * <p>Si algún producto con existencias no tiene costo conocido en una de las dos fechas —el
 * caso de los movimientos anteriores a la migración V4—, la valuación no se completa: el valor
 * viaja en {@code null} con estado {@code COSTO_INCOMPLETO} en lugar de entregar una cifra
 * apoyada en supuestos.
 *
 * <p>{@code valorInventario} es distinto: es el valor de la bodega <b>hoy</b> a costo de
 * reposición, y por eso sí usa {@code costoActual}. No entra en la rotación.
 */
@Service
@RequiredArgsConstructor
public class InventarioAnalyticsService {

    /** Sin campo de stock mínimo por producto, el umbral es un parámetro con valor por defecto. */
    public static final int UMBRAL_STOCK_CRITICO_POR_DEFECTO = 5;

    private final InventarioAnalyticsRepository inventarioRepository;
    private final VentasAnalyticsService ventasAnalyticsService;

    @Transactional(readOnly = true)
    public InventarioKpiDTO kpis(PeriodoAnalitico periodo, Integer umbralStockCritico) {
        int umbral = umbralStockCritico != null ? umbralStockCritico : UMBRAL_STOCK_CRITICO_POR_DEFECTO;

        var global = inventarioRepository.stockGlobal();
        TotalesVentas ventas = ventasAnalyticsService.totales(periodo);

        Map<Long, Long> netoPosterior = netoPorProducto(
            inventarioRepository.movimientoNetoDespuesDe(DireccionMovimiento.ENTRADA, periodo.hasta()));
        Map<Long, Long> netoPeriodo = netoPorProducto(
            inventarioRepository.movimientoNetoEntre(
                DireccionMovimiento.ENTRADA, periodo.desde(), periodo.hasta()));

        Map<Long, Long> stockInicialPorProducto = new HashMap<>();
        Map<Long, Long> stockFinalPorProducto = new HashMap<>();
        long stockInicial = 0;
        long stockFinal = 0;

        for (var producto : inventarioRepository.stockPorProducto()) {
            long actual = producto.getStock() != null ? producto.getStock() : 0L;
            long finalPeriodo = actual - netoPosterior.getOrDefault(producto.getProductoId(), 0L);
            long inicialPeriodo = finalPeriodo - netoPeriodo.getOrDefault(producto.getProductoId(), 0L);

            stockFinalPorProducto.put(producto.getProductoId(), finalPeriodo);
            stockInicialPorProducto.put(producto.getProductoId(), inicialPeriodo);

            stockFinal += finalPeriodo;
            stockInicial += inicialPeriodo;
        }

        Valuacion inicial = valorHistorico(stockInicialPorProducto, costosVigentesA(periodo.desde()));
        Valuacion cierre = valorHistorico(stockFinalPorProducto, costosVigentesA(periodo.hasta()));

        Set<Long> sinValuacion = new HashSet<>(inicial.productosSinCosto());
        sinValuacion.addAll(cierre.productosSinCosto());
        boolean valuacionCompleta = sinValuacion.isEmpty();

        BigDecimal valorInicial = valuacionCompleta ? CalculoAnalytics.dinero(inicial.valor()) : null;
        BigDecimal valorFinal = valuacionCompleta ? CalculoAnalytics.dinero(cierre.valor()) : null;
        BigDecimal inventarioPromedio = valuacionCompleta
            ? CalculoAnalytics.dinero(inicial.valor().add(cierre.valor())
                .divide(BigDecimal.valueOf(2), CalculoAnalytics.ESCALA_DINERO, CalculoAnalytics.REDONDEO))
            : null;

        long unidadesVendidas = unidadesNetas(ventas);
        BigDecimal unidades = BigDecimal.valueOf(unidadesVendidas);

        long unidadesIngresadas = CalculoAnalytics.nvl(inventarioRepository.unidadesIngresadas(
            DireccionMovimiento.ENTRADA, TipoMovimientoInventario.DEVOLUCION_VENTA,
            periodo.desde(), periodo.hasta()));
        long unidadesDevueltasProveedor = CalculoAnalytics.nvl(
            inventarioRepository.unidadesDevueltasAProveedor(
                TipoMovimientoInventario.DEVOLUCION_COMPRA, periodo.desde(), periodo.hasta()));

        long inventarioDisponible = stockInicial + unidadesIngresadas - unidadesDevueltasProveedor;

        BigDecimal turnover = inventarioPromedio == null
            ? null
            : CalculoAnalytics.dividir(
                ventas.costoVentas(), inventarioPromedio, CalculoAnalytics.ESCALA_RATIO);
        BigDecimal sellThrough = inventarioDisponible <= 0
            ? null
            : CalculoAnalytics.porcentaje(unidades, BigDecimal.valueOf(inventarioDisponible));
        BigDecimal velocidad = CalculoAnalytics.dividir(
            unidades, BigDecimal.valueOf(periodo.dias()), CalculoAnalytics.ESCALA_RATIO);

        long stockTotal = CalculoAnalytics.nvl(global.getStockTotal());
        long productosSinCosto = CalculoAnalytics.nvl(global.getProductosSinCosto());

        BigDecimal diasInventario = velocidad == null || velocidad.signum() == 0
            ? null
            : CalculoAnalytics.dividir(BigDecimal.valueOf(stockTotal), velocidad, 1);

        return InventarioKpiDTO.builder()
            .periodo(periodo.aDTO())
            .stockTotal(stockTotal)
            .valorInventario(CalculoAnalytics.dinero(global.getValor()))
            .stockInicial(stockInicial)
            .valorInventarioInicial(valorInicial)
            .stockFinal(stockFinal)
            .valorInventarioFinal(valorFinal)
            .inventarioPromedio(inventarioPromedio)
            .productosSinValuacionHistorica(sinValuacion.size())
            .unidadesIngresadas(unidadesIngresadas)
            .unidadesDevueltasProveedor(unidadesDevueltasProveedor)
            .inventarioDisponible(inventarioDisponible)
            .unidadesVendidas(unidadesVendidas)
            .costoVentas(ventas.costoVentas())
            .inventoryTurnover(turnover)
            .sellThrough(sellThrough)
            .velocidadVenta(velocidad)
            .diasInventario(diasInventario)
            .productosStockCritico(inventarioRepository.contarStockCritico(umbral))
            .umbralStockCritico(umbral)
            .productosSinCosto(productosSinCosto)
            .estadoValorInventario(productosSinCosto > 0
                ? EstadoMetrica.COSTO_INCOMPLETO
                : estadoValor(stockTotal))
            .estadoTurnover(estadoTurnover(valuacionCompleta, turnover))
            .estadoSellThrough(estadoSellThrough(sellThrough))
            .estadoDiasInventario(diasInventario == null
                ? EstadoMetrica.SIN_VENTAS_RECIENTES
                : EstadoMetrica.OK)
            .build();
    }

    /**
     * Unidades efectivamente vendidas: las despachadas menos las que volvieron. El total de
     * ventas ya trae el costo neto; aquí interesa el conteo físico para rotación y velocidad.
     */
    private long unidadesNetas(TotalesVentas ventas) {
        return Math.max(ventas.unidadesVendidas(), 0);
    }

    private Map<Long, Long> netoPorProducto(List<InventarioAnalyticsRepository.MovimientoNeto> movimientos) {
        Map<Long, Long> neto = new HashMap<>();
        movimientos.forEach(m -> neto.put(m.getProductoId(), CalculoAnalytics.nvl(m.getNeto())));
        return neto;
    }

    private EstadoMetrica estadoValor(long stockTotal) {
        return stockTotal == 0 ? EstadoMetrica.VALOR_CERO : EstadoMetrica.OK;
    }

    /**
     * Sin valuación histórica completa no se entrega rotación: un número apoyado en productos
     * sin costo conocido sería una precisión falsa.
     */
    private EstadoMetrica estadoTurnover(boolean valuacionCompleta, BigDecimal turnover) {
        if (!valuacionCompleta) {
            return EstadoMetrica.COSTO_INCOMPLETO;
        }
        return turnover == null ? EstadoMetrica.SIN_DATOS : EstadoMetrica.OK;
    }

    /** Valor del inventario y productos cuyo costo en esa fecha no se puede conocer. */
    private record Valuacion(BigDecimal valor, Set<Long> productosSinCosto) {
    }

    /**
     * Valora existencias con el costo que regía en la fecha, nunca con el costo de hoy.
     * Un producto sin unidades no necesita costo: no aporta valor ni bloquea la valuación.
     */
    private Valuacion valorHistorico(Map<Long, Long> stockPorProducto, Map<Long, BigDecimal> costos) {
        BigDecimal total = BigDecimal.ZERO;
        Set<Long> sinCosto = new HashSet<>();

        for (var entrada : stockPorProducto.entrySet()) {
            long stock = entrada.getValue();
            if (stock <= 0) {
                continue;
            }

            BigDecimal costo = costos.get(entrada.getKey());
            if (costo == null) {
                sinCosto.add(entrada.getKey());
                continue;
            }

            total = total.add(costo.multiply(BigDecimal.valueOf(stock)));
        }

        return new Valuacion(total, sinCosto);
    }

    /**
     * Costo vigente de cada producto en una fecha, reconstruido desde las dos fuentes que
     * componen la línea de tiempo del costo: los movimientos de inventario y las correcciones
     * manuales. Para cada producto gana el punto más reciente anterior a la fecha.
     */
    private Map<Long, BigDecimal> costosVigentesA(LocalDateTime fecha) {
        Map<Long, LocalDateTime> fechaVigente = new HashMap<>();
        Map<Long, BigDecimal> costos = new HashMap<>();

        inventarioRepository.costosVigentesEnMovimientos(fecha)
            .forEach(punto -> acumularCosto(fechaVigente, costos, punto));
        inventarioRepository.costosVigentesEnAjustes(fecha)
            .forEach(punto -> acumularCosto(fechaVigente, costos, punto));

        return costos;
    }

    /**
     * Los ajustes se procesan después que los movimientos, así que ante el mismo instante
     * prevalece la corrección manual: es la intención más explícita sobre el costo.
     */
    private void acumularCosto(
            Map<Long, LocalDateTime> fechaVigente,
            Map<Long, BigDecimal> costos,
            InventarioAnalyticsRepository.CostoVigente punto) {

        LocalDateTime vigente = fechaVigente.get(punto.getProductoId());
        if (vigente == null || !punto.getFecha().isBefore(vigente)) {
            fechaVigente.put(punto.getProductoId(), punto.getFecha());
            costos.put(punto.getProductoId(), punto.getCosto());
        }
    }

    /** Sin inventario disponible no hay porcentaje que calcular; con inventario y sin ventas, sí: es cero. */
    private EstadoMetrica estadoSellThrough(BigDecimal sellThrough) {
        if (sellThrough == null) {
            return EstadoMetrica.SIN_DATOS;
        }
        return sellThrough.signum() == 0 ? EstadoMetrica.VALOR_CERO : EstadoMetrica.OK;
    }
}
