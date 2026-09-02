package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.InventarioKpiDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionCompraService;

/** KPIs 12 a 15 (inventario) y 18 (compras). */
class InventarioComprasAnalyticsServiceTest extends AnalyticsTestSupport {

    @Autowired
    private InventarioAnalyticsService inventarioAnalyticsService;

    @Autowired
    private ComprasAnalyticsService comprasAnalyticsService;

    @Autowired
    private DevolucionCompraService devolucionCompraService;

    @Test
    @DisplayName("Rotación, sell-through, velocidad y días de inventario con valores conocidos")
    void kpisDeInventarioConValoresConocidos() {
        Producto producto = crearProductoConHistorial(
            "Producto A", new BigDecimal("200.00"), new BigDecimal("100.00"), 100);
        vender(producto, 40);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        // Stock reconstruido: terminó en 60 y empezó en 100, porque salieron 40 en el período.
        assertThat(kpis.getStockInicial()).isEqualTo(100);
        assertThat(kpis.getStockFinal()).isEqualTo(60);
        assertThat(kpis.getProductosSinValuacionHistorica()).isZero();
        assertThat(kpis.getValorInventarioInicial()).isEqualByComparingTo("10000.00");
        assertThat(kpis.getValorInventarioFinal()).isEqualByComparingTo("6000.00");
        assertThat(kpis.getInventarioPromedio()).isEqualByComparingTo("8000.00");

        assertThat(kpis.getCostoVentas()).isEqualByComparingTo("4000.00");
        assertThat(kpis.getUnidadesVendidas()).isEqualTo(40);

        // 4000 / 8000
        assertThat(kpis.getInventoryTurnover()).isEqualByComparingTo("0.5000");
        // Sin compras en el período, el inventario disponible es el stock inicial.
        assertThat(kpis.getInventarioDisponible()).isEqualTo(100);
        // 40 / 100 × 100
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("40.00");
        // 40 unidades / 1 día
        assertThat(kpis.getVelocidadVenta()).isEqualByComparingTo("40.0000");
        // 60 de stock / 40 por día
        assertThat(kpis.getDiasInventario()).isEqualByComparingTo("1.5");

        assertThat(kpis.getStockTotal()).isEqualTo(60);
        assertThat(kpis.getValorInventario()).isEqualByComparingTo("6000.00");
        assertThat(kpis.getEstadoTurnover()).isEqualTo(EstadoMetrica.OK);
    }

    @Test
    @DisplayName("La devolución de cliente resta ventas netas pero no suma inventario disponible")
    void devolucionDeClienteNoAumentaInventarioDisponible() {
        Producto producto = crearProducto("Producto B", new BigDecimal("200.00"), new BigDecimal("100.00"), 100);
        devolverVenta(vender(producto, 40), 0, 20);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getUnidadesVendidas()).isEqualTo(20);
        assertThat(kpis.getStockFinal()).isEqualTo(80);
        // Las 20 unidades que volvieron ya estaban contadas en el stock inicial: siguen siendo 100.
        assertThat(kpis.getUnidadesIngresadas()).isZero();
        assertThat(kpis.getInventarioDisponible()).isEqualTo(100);
        // 20 / 100 × 100
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("20.00");
        assertThat(kpis.getCostoVentas()).isEqualByComparingTo("2000.00");
    }

    @Test
    @DisplayName("Sell-through sobre el inventario disponible: 100 + 50 - 10 = 140, vendidas netas 55 → 39,29%")
    void sellThroughConEjemploOficial() {
        Producto producto = crearProducto("Producto S", new BigDecimal("200.00"), new BigDecimal("100.00"), 100);

        CompraResponseDTO compra = comprar(producto, 50, new BigDecimal("100.00"));
        devolverCompra(compra, 10);
        devolverVenta(vender(producto, 60), 0, 5);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getStockInicial()).isEqualTo(100);
        assertThat(kpis.getUnidadesIngresadas()).isEqualTo(50);
        assertThat(kpis.getUnidadesDevueltasProveedor()).isEqualTo(10);
        assertThat(kpis.getInventarioDisponible()).isEqualTo(140);

        assertThat(kpis.getUnidadesVendidas()).isEqualTo(55);
        assertThat(kpis.getStockFinal()).isEqualTo(85);

        // 55 / 140 × 100
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("39.29");
        assertThat(kpis.getEstadoSellThrough()).isEqualTo(EstadoMetrica.OK);
    }

    @Test
    @DisplayName("Sin compras, el inventario disponible es solo el stock inicial")
    void sellThroughSoloConInventarioInicial() {
        Producto producto = crearProducto("Producto T", new BigDecimal("200.00"), new BigDecimal("100.00"), 100);
        vender(producto, 25);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getUnidadesIngresadas()).isZero();
        assertThat(kpis.getInventarioDisponible()).isEqualTo(100);
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("25.00");
    }

    @Test
    @DisplayName("Varias compras y varias devoluciones del período se acumulan en el inventario disponible")
    void sellThroughConVariasComprasYDevoluciones() {
        Producto producto = crearProducto("Producto U", new BigDecimal("200.00"), new BigDecimal("100.00"), 50);

        CompraResponseDTO primera = comprar(producto, 30, new BigDecimal("100.00"));
        CompraResponseDTO segunda = comprar(producto, 20, new BigDecimal("100.00"));
        devolverCompra(primera, 5);
        devolverCompra(segunda, 5);

        var venta = vender(producto, 40);
        devolverVenta(venta, 0, 10);
        devolverVenta(venta, 0, 10);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getStockInicial()).isEqualTo(50);
        assertThat(kpis.getUnidadesIngresadas()).isEqualTo(50);
        assertThat(kpis.getUnidadesDevueltasProveedor()).isEqualTo(10);
        // 50 + 50 - 10
        assertThat(kpis.getInventarioDisponible()).isEqualTo(90);
        // 40 - 20
        assertThat(kpis.getUnidadesVendidas()).isEqualTo(20);
        // 20 / 90 × 100
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("22.22");
    }

    @Test
    @DisplayName("Con inventario disponible y sin ventas el sell-through es cero, no ausencia de dato")
    void sellThroughSinVentas() {
        crearProducto("Producto V", new BigDecimal("200.00"), new BigDecimal("100.00"), 50);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getInventarioDisponible()).isEqualTo(50);
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("0.00");
        assertThat(kpis.getEstadoSellThrough()).isEqualTo(EstadoMetrica.VALOR_CERO);
    }

    @Test
    @DisplayName("Sin inventario disponible no se divide: el sell-through queda en SIN_DATOS")
    void sellThroughSinInventarioDisponible() {
        crearProducto("Producto W", new BigDecimal("200.00"), new BigDecimal("100.00"), 0);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getInventarioDisponible()).isZero();
        assertThat(kpis.getSellThrough()).isNull();
        assertThat(kpis.getEstadoSellThrough()).isEqualTo(EstadoMetrica.SIN_DATOS);
    }

    @Test
    @DisplayName("Un ajuste de costo posterior no reescribe el costo de ventas ya registrado")
    void costoDeVentasNoSeRecalculaConElAjusteDeCosto() {
        Producto producto = crearProductoConHistorial(
            "Producto X", new BigDecimal("1000.00"), new BigDecimal("600.00"), 100);
        vender(producto, 40);

        ajustarCosto(producto, new BigDecimal("900.00"));

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        // 40 × 600, el costo congelado en la línea de venta, no el costo corregido después.
        assertThat(kpis.getCostoVentas()).isEqualByComparingTo("24000.00");
    }

    @Test
    @DisplayName("La rotación valora cada extremo con el costo que regía en esa fecha")
    void inventoryTurnoverUsaCostosHistoricos() {
        Producto producto = crearProductoConHistorial(
            "Producto Y", new BigDecimal("1000.00"), new BigDecimal("600.00"), 100);
        vender(producto, 40);

        ajustarCosto(producto, new BigDecimal("900.00"));

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getProductosSinValuacionHistorica()).isZero();
        // Al abrir el período regía 600, aunque hoy el costo sea 900: 100 × 600.
        assertThat(kpis.getValorInventarioInicial()).isEqualByComparingTo("60000.00");
        // Al cerrar ya regía el costo corregido: 60 × 900.
        assertThat(kpis.getValorInventarioFinal()).isEqualByComparingTo("54000.00");
        assertThat(kpis.getInventarioPromedio()).isEqualByComparingTo("57000.00");
        // 24000 / 57000
        assertThat(kpis.getInventoryTurnover()).isEqualByComparingTo("0.4211");
        assertThat(kpis.getEstadoTurnover()).isEqualTo(EstadoMetrica.OK);
    }

    @Test
    @DisplayName("Producto anterior a la migración: sin costo histórico no hay rotación inventada")
    void periodoSinValuacionHistoricaNoCalculaRotacion() {
        // crearProducto escribe el stock directamente, sin movimientos: es el producto que ya
        // existía antes de V4 y cuya línea de tiempo de costo no empieza antes del período.
        Producto producto = crearProducto("Producto Z", new BigDecimal("1000.00"), new BigDecimal("600.00"), 100);
        vender(producto, 40);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getProductosSinValuacionHistorica()).isEqualTo(1);
        assertThat(kpis.getValorInventarioInicial()).isNull();
        assertThat(kpis.getValorInventarioFinal()).isNull();
        assertThat(kpis.getInventarioPromedio()).isNull();
        assertThat(kpis.getInventoryTurnover()).isNull();
        assertThat(kpis.getEstadoTurnover()).isEqualTo(EstadoMetrica.COSTO_INCOMPLETO);

        // El costo de ventas sí es exacto: sale de la línea de venta, no de la valuación.
        assertThat(kpis.getCostoVentas()).isEqualByComparingTo("24000.00");
    }

    @Test
    @DisplayName("Con historial completo la compra actualiza el costo y la valuación es exacta")
    void periodoConHistorialCompletoValuaConPrecision() {
        Producto producto = crearProductoConHistorial(
            "Producto W", new BigDecimal("1000.00"), new BigDecimal("600.00"), 100);

        comprar(producto, 50, new BigDecimal("800.00"));

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getProductosSinValuacionHistorica()).isZero();
        assertThat(kpis.getStockInicial()).isEqualTo(100);
        assertThat(kpis.getStockFinal()).isEqualTo(150);
        // Apertura al costo anterior a la compra: 100 × 600.
        assertThat(kpis.getValorInventarioInicial()).isEqualByComparingTo("60000.00");
        // Cierre al costo que dejó la compra según la política de último costo: 150 × 800.
        assertThat(kpis.getValorInventarioFinal()).isEqualByComparingTo("120000.00");
        assertThat(kpis.getInventarioPromedio()).isEqualByComparingTo("90000.00");
    }

    @Test
    @DisplayName("Con inventario en cero y sin ventas no se divide: cada KPI declara su estado")
    void inventarioEnCeroNoDivide() {
        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getStockTotal()).isZero();
        assertThat(kpis.getValorInventario()).isEqualByComparingTo("0.00");
        assertThat(kpis.getInventoryTurnover()).isNull();
        assertThat(kpis.getSellThrough()).isNull();
        assertThat(kpis.getDiasInventario()).isNull();
        assertThat(kpis.getEstadoTurnover()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(kpis.getEstadoSellThrough()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(kpis.getEstadoDiasInventario()).isEqualTo(EstadoMetrica.SIN_VENTAS_RECIENTES);
    }

    @Test
    @DisplayName("Con stock pero sin ventas, los días de inventario quedan SIN_VENTAS_RECIENTES")
    void velocidadCeroNoProyectaDiasDeInventario() {
        crearProducto("Producto C", new BigDecimal("200.00"), new BigDecimal("100.00"), 50);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), null);

        assertThat(kpis.getVelocidadVenta()).isEqualByComparingTo("0.0000");
        assertThat(kpis.getSellThrough()).isEqualByComparingTo("0.00");
        assertThat(kpis.getDiasInventario()).isNull();
        assertThat(kpis.getEstadoDiasInventario()).isEqualTo(EstadoMetrica.SIN_VENTAS_RECIENTES);
    }

    @Test
    @DisplayName("El stock crítico usa el umbral pedido y avisa del inventario sin costo conocido")
    void stockCriticoYCostoDesconocido() {
        crearProducto("Con costo", new BigDecimal("200.00"), new BigDecimal("100.00"), 3);
        crearProducto("Sin costo", new BigDecimal("200.00"), null, 40);

        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(hoy(), 5);

        assertThat(kpis.getUmbralStockCritico()).isEqualTo(5);
        assertThat(kpis.getProductosStockCritico()).isEqualTo(1);
        assertThat(kpis.getProductosSinCosto()).isEqualTo(1);
        assertThat(kpis.getEstadoValorInventario()).isEqualTo(EstadoMetrica.COSTO_INCOMPLETO);
        // Solo se valora lo que tiene costo conocido: 3 × 100.
        assertThat(kpis.getValorInventario()).isEqualByComparingTo("300.00");
    }

    @Test
    @DisplayName("La devolución de compra reduce las compras netas sin tocar la compra original")
    void comprasNetasDescuentanDevolucion() {
        Producto producto = crearProducto("Producto D", new BigDecimal("200.00"), new BigDecimal("100.00"), 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("100.00"));

        devolverCompra(compra, 2);

        CompraAnalyticsDTO analytics = comprasAnalyticsService.analytics(hoy(), null);

        assertThat(analytics.getComprasBrutas()).isEqualByComparingTo("1000.00");
        assertThat(analytics.getDevolucionesCompra()).isEqualByComparingTo("200.00");
        assertThat(analytics.getComprasNetas()).isEqualByComparingTo("800.00");
        assertThat(analytics.getOrdenes()).isEqualTo(1);
        assertThat(analytics.getEstado()).isEqualTo(EstadoMetrica.OK);

        // La compra conserva su importe histórico.
        assertThat(compraService.obtenerPorId(compra.getId()).getTotal()).isEqualByComparingTo("1000.00");

        assertThat(analytics.getGastoPorProveedor()).hasSize(1);
        assertThat(analytics.getGastoPorProveedor().get(0).getComprasBrutas()).isEqualByComparingTo("1000.00");
        assertThat(analytics.getGastoPorProveedor().get(0).getDevoluciones()).isEqualByComparingTo("200.00");
        assertThat(analytics.getGastoPorProveedor().get(0).getComprasNetas()).isEqualByComparingTo("800.00");
        assertThat(analytics.getGastoPorProveedor().get(0).getParticipacion()).isEqualByComparingTo("100.00");

        assertThat(analytics.getProductosComprados()).hasSize(1);
        assertThat(analytics.getProductosComprados().get(0).getUnidades()).isEqualTo(10);
        assertThat(analytics.getProductosComprados().get(0).getUnidadesDevueltas()).isEqualTo(2);
        assertThat(analytics.getProductosComprados().get(0).getCostoNeto()).isEqualByComparingTo("800.00");
    }

    @Test
    @DisplayName("El gasto se reparte entre proveedores por participación")
    void gastoPorProveedorSeReparte() {
        Producto uno = crearProducto("Producto E", new BigDecimal("200.00"), new BigDecimal("100.00"), 0);
        Producto dos = crearProducto("Producto F", new BigDecimal("200.00"), new BigDecimal("100.00"), 0);

        comprar(uno, 30, new BigDecimal("100.00"));
        comprar(dos, 10, new BigDecimal("100.00"));

        CompraAnalyticsDTO analytics = comprasAnalyticsService.analytics(hoy(), null);

        assertThat(analytics.getComprasBrutas()).isEqualByComparingTo("4000.00");
        assertThat(analytics.getGastoPorProveedor()).hasSize(2);
        assertThat(analytics.getGastoPorProveedor().get(0).getParticipacion()).isEqualByComparingTo("75.00");
        assertThat(analytics.getGastoPorProveedor().get(1).getParticipacion()).isEqualByComparingTo("25.00");
    }

    @Test
    @DisplayName("Un período de compras sin operaciones responde SIN_DATOS")
    void comprasSinDatos() {
        CompraAnalyticsDTO analytics = comprasAnalyticsService.analytics(periodoVacio(), null);

        assertThat(analytics.getComprasBrutas()).isEqualByComparingTo("0.00");
        assertThat(analytics.getComprasNetas()).isEqualByComparingTo("0.00");
        assertThat(analytics.getOrdenes()).isZero();
        assertThat(analytics.getEstado()).isEqualTo(EstadoMetrica.SIN_DATOS);
        assertThat(analytics.getGastoPorProveedor()).isEmpty();
    }

    private void devolverCompra(CompraResponseDTO compra, int cantidad) {
        DevolucionLineaDTO linea = new DevolucionLineaDTO();
        linea.setDetalleId(compra.getDetalles().get(0).getId());
        linea.setCantidad(cantidad);

        DevolucionCompraRequestDTO request = new DevolucionCompraRequestDTO();
        request.setLineas(List.of(linea));
        request.setMotivo(MotivoDevolucionCompra.PRODUCTO_DEFECTUOSO);

        devolucionCompraService.registrar(compra.getId(), request, USUARIO_TEST);
    }
}
