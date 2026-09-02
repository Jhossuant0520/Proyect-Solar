package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.AnalisisABCDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CategoriaAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CriterioRanking;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoBajoRendimientoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoRankingDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/** KPIs 8, 9, 10, 11, 16 y 17: rankings de producto, categorías y clasificación ABC. */
class ProductoCategoriaAnalyticsServiceTest extends AnalyticsTestSupport {

    @Autowired
    private ProductoAnalyticsService productoAnalyticsService;

    @Autowired
    private CategoriaAnalyticsService categoriaAnalyticsService;

    @Test
    @DisplayName("El producto que más unidades mueve no es el que más ganancia deja")
    void unidadesYGananciaOrdenanDistinto() {
        Producto masVendido = crearProducto("Volumen", new BigDecimal("100.00"), new BigDecimal("90.00"), 100);
        Producto masRentable = crearProducto("Margen", new BigDecimal("1000.00"), new BigDecimal("200.00"), 10);

        vender(masVendido, 100);
        vender(masRentable, 10);

        List<ProductoRankingDTO> porUnidades =
            productoAnalyticsService.ranking(hoy(), CriterioRanking.UNIDADES, 10, null);
        List<ProductoRankingDTO> porGanancia =
            productoAnalyticsService.ranking(hoy(), CriterioRanking.GANANCIA, 10, null);

        assertThat(porUnidades.get(0).getProductoId()).isEqualTo(masVendido.getId());
        assertThat(porUnidades.get(0).getUnidades()).isEqualTo(100);
        assertThat(porUnidades.get(0).getIngresos()).isEqualByComparingTo("10000.00");
        assertThat(porUnidades.get(0).getGanancia()).isEqualByComparingTo("1000.00");
        assertThat(porUnidades.get(0).getMargen()).isEqualByComparingTo("10.00");

        assertThat(porGanancia.get(0).getProductoId()).isEqualTo(masRentable.getId());
        assertThat(porGanancia.get(0).getGanancia()).isEqualByComparingTo("8000.00");
        assertThat(porGanancia.get(0).getMargen()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("El ranking descuenta lo devuelto: lo que volvió no se vendió")
    void rankingDescuentaDevoluciones() {
        Producto producto = crearProducto("Con devolución", new BigDecimal("100.00"), new BigDecimal("60.00"), 50);
        VentaResponseDTO venta = vender(producto, 50);

        devolverVenta(venta, 0, 20);

        ProductoRankingDTO ranking =
            productoAnalyticsService.ranking(hoy(), CriterioRanking.UNIDADES, 10, null).get(0);

        assertThat(ranking.getUnidades()).isEqualTo(30);
        assertThat(ranking.getIngresos()).isEqualByComparingTo("3000.00");
        assertThat(ranking.getCosto()).isEqualByComparingTo("1800.00");
        assertThat(ranking.getGanancia()).isEqualByComparingTo("1200.00");
        assertThat(ranking.getStockActual()).isEqualTo(20);
    }

    @Test
    @DisplayName("Un producto sin costo conocido no reporta ganancia inventada y queda al final del ranking")
    void productoSinCostoNoReportaGananciaFalsa() {
        Producto conCosto = crearProducto("Con costo", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);
        Producto sinCosto = crearProducto("Sin costo", new BigDecimal("100.00"), null, 10);

        vender(conCosto, 5);
        vender(sinCosto, 10);

        List<ProductoRankingDTO> porGanancia =
            productoAnalyticsService.ranking(hoy(), CriterioRanking.GANANCIA, 10, null);

        assertThat(porGanancia.get(0).getProductoId()).isEqualTo(conCosto.getId());
        assertThat(porGanancia.get(1).getProductoId()).isEqualTo(sinCosto.getId());
        assertThat(porGanancia.get(1).getGanancia()).isNull();
        assertThat(porGanancia.get(1).getMargen()).isNull();
        assertThat(porGanancia.get(1).getEstadoGanancia()).isEqualTo(EstadoMetrica.COSTO_INCOMPLETO);
    }

    @Test
    @DisplayName("El ranking se puede acotar a una categoría")
    void rankingFiltraPorCategoria() {
        Producto electronica = crearProductoEnCategoria(
            "Sensor", "ELECTRONICA", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        Producto herramienta = crearProductoEnCategoria(
            "Llave", "HERRAMIENTA", new BigDecimal("500.00"), new BigDecimal("250.00"), 10);

        vender(electronica, 5);
        vender(herramienta, 5);

        List<ProductoRankingDTO> ranking =
            productoAnalyticsService.ranking(hoy(), CriterioRanking.UNIDADES, 10, "ELECTRONICA");

        assertThat(ranking).hasSize(1);
        assertThat(ranking.get(0).getProductoId()).isEqualTo(electronica.getId());
        assertThat(ranking.get(0).getCategoriaCodigo()).isEqualTo("ELECTRONICA");
    }

    @Test
    @DisplayName("Un producto recién creado no se clasifica como lento por falta de historial")
    void productoNuevoNoEsLento() {
        crearProducto("Recién creado", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        List<ProductoBajoRendimientoDTO> bajo = productoAnalyticsService.bajoRendimiento(hoy(), 10);

        assertThat(bajo).hasSize(1);
        assertThat(bajo.get(0).getEstado()).isEqualTo(EstadoMetrica.SIN_HISTORIAL_SUFICIENTE);
        assertThat(bajo.get(0).getUnidades()).isZero();
        assertThat(bajo.get(0).getUltimaVenta()).isNull();
        assertThat(bajo.get(0).getDiasSinVenta()).isNull();
    }

    @Test
    @DisplayName("Un producto con antigüedad y sin ventas queda como SIN_VENTAS_RECIENTES")
    void productoAntiguoSinVentas() {
        Producto vendido = crearProducto("Se vende", new BigDecimal("100.00"), new BigDecimal("60.00"), 50);
        Producto parado = crearProducto("No se vende", new BigDecimal("100.00"), new BigDecimal("60.00"), 50);

        vender(vendido, 20);

        List<ProductoBajoRendimientoDTO> bajo =
            productoAnalyticsService.bajoRendimiento(periodoConHistorialSuficiente(), 10);

        assertThat(bajo.get(0).getProductoId()).isEqualTo(parado.getId());
        assertThat(bajo.get(0).getEstado()).isEqualTo(EstadoMetrica.SIN_VENTAS_RECIENTES);
        assertThat(bajo.get(0).getUnidades()).isZero();
        assertThat(bajo.get(0).getStockActual()).isEqualTo(50);

        assertThat(bajo.get(1).getProductoId()).isEqualTo(vendido.getId());
        assertThat(bajo.get(1).getEstado()).isEqualTo(EstadoMetrica.OK);
        assertThat(bajo.get(1).getUltimaVenta()).isNotNull();
        assertThat(bajo.get(1).getDiasSinVenta()).isNotNull();
    }

    @Test
    @DisplayName("Las categorías reportan ventas, ganancia, margen y participación")
    void categoriasConParticipacionYMargen() {
        Producto electronica = crearProductoEnCategoria(
            "Sensor", "ELECTRONICA", new BigDecimal("1000.00"), new BigDecimal("600.00"), 20);
        Producto herramienta = crearProductoEnCategoria(
            "Llave", "HERRAMIENTA", new BigDecimal("500.00"), new BigDecimal("250.00"), 20);

        vender(electronica, 10);
        vender(herramienta, 2);

        List<CategoriaAnalyticsDTO> categorias = categoriaAnalyticsService.porCategoria(hoy(), null);

        assertThat(categorias).hasSize(2);

        CategoriaAnalyticsDTO primera = categorias.get(0);
        assertThat(primera.getCodigo()).isEqualTo("ELECTRONICA");
        assertThat(primera.getVentas()).isEqualByComparingTo("10000.00");
        assertThat(primera.getUnidades()).isEqualTo(10);
        assertThat(primera.getPedidos()).isEqualTo(1);
        assertThat(primera.getGanancia()).isEqualByComparingTo("4000.00");
        assertThat(primera.getMargen()).isEqualByComparingTo("40.00");
        assertThat(primera.getParticipacion()).isEqualByComparingTo("90.91");

        CategoriaAnalyticsDTO segunda = categorias.get(1);
        assertThat(segunda.getCodigo()).isEqualTo("HERRAMIENTA");
        assertThat(segunda.getMargen()).isEqualByComparingTo("50.00");
        assertThat(segunda.getParticipacion()).isEqualByComparingTo("9.09");
    }

    @Test
    @DisplayName("Una categoría sin ventas no aparece en el reporte del período")
    void categoriaSinVentasNoAparece() {
        Producto electronica = crearProductoEnCategoria(
            "Sensor", "ELECTRONICA", new BigDecimal("1000.00"), new BigDecimal("600.00"), 20);
        crearProductoEnCategoria("Llave", "HERRAMIENTA", new BigDecimal("500.00"), new BigDecimal("250.00"), 20);

        vender(electronica, 1);

        List<CategoriaAnalyticsDTO> categorias = categoriaAnalyticsService.porCategoria(hoy(), null);

        assertThat(categorias).hasSize(1);
        assertThat(categorias.get(0).getCodigo()).isEqualTo("ELECTRONICA");
        assertThat(categorias.get(0).getParticipacion()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("El análisis ABC clasifica por participación acumulada: A hasta 80%, B hasta 95%, C el resto")
    void analisisABCClasificaPorParticipacionAcumulada() {
        Producto claseA = crearProducto("Clase A", new BigDecimal("800.00"), new BigDecimal("100.00"), 10);
        Producto claseB = crearProducto("Clase B", new BigDecimal("150.00"), new BigDecimal("50.00"), 10);
        Producto claseC = crearProducto("Clase C", new BigDecimal("50.00"), new BigDecimal("10.00"), 10);

        vender(List.of(claseA, claseB, claseC), List.of(1, 1, 1));

        AnalisisABCDTO abc = productoAnalyticsService.analisisABC(hoy(), CriterioRanking.INGRESOS);

        assertThat(abc.getEstado()).isEqualTo(EstadoMetrica.OK);
        assertThat(abc.getTotal()).isEqualByComparingTo("1000.00");
        assertThat(abc.getLimiteA()).isEqualByComparingTo("80.00");
        assertThat(abc.getLimiteB()).isEqualByComparingTo("95.00");
        assertThat(abc.getProductos()).hasSize(3);

        assertThat(abc.getProductos().get(0).getProductoId()).isEqualTo(claseA.getId());
        assertThat(abc.getProductos().get(0).getParticipacion()).isEqualByComparingTo("80.00");
        assertThat(abc.getProductos().get(0).getParticipacionAcumulada()).isEqualByComparingTo("80.00");
        assertThat(abc.getProductos().get(0).getClasificacion()).isEqualTo("A");

        assertThat(abc.getProductos().get(1).getProductoId()).isEqualTo(claseB.getId());
        assertThat(abc.getProductos().get(1).getParticipacionAcumulada()).isEqualByComparingTo("95.00");
        assertThat(abc.getProductos().get(1).getClasificacion()).isEqualTo("B");

        assertThat(abc.getProductos().get(2).getProductoId()).isEqualTo(claseC.getId());
        assertThat(abc.getProductos().get(2).getParticipacionAcumulada()).isEqualByComparingTo("100.00");
        assertThat(abc.getProductos().get(2).getClasificacion()).isEqualTo("C");
    }

    @Test
    @DisplayName("Sin ventas, el análisis ABC responde SIN_DATOS en lugar de una lista vacía sin contexto")
    void analisisABCSinVentas() {
        crearProducto("Sin ventas", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        AnalisisABCDTO abc = productoAnalyticsService.analisisABC(hoy(), CriterioRanking.INGRESOS);

        assertThat(abc.getEstado()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(abc.getProductos()).isEmpty();
        assertThat(abc.getTotal()).isEqualByComparingTo("0.00");
    }
}
