package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProveedorGastoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.VentasSerieDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos.ReporteVentasResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CompraService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.VentaService;

@SpringBootTest
@ActiveProfiles("test")
class ReportesConsistenciaTest extends ComercialTestSupport {

    @Autowired
    private ReportesService reportesService;

    @Autowired
    private VentaService ventaService;

    @Autowired
    private CompraService compraService;

    @Test
    @DisplayName("Ventas: suma(serie) == KPIs del mismo período (y CSV usa mismos totales)")
    void ventasKpiIgualSumaSerie() {
        Producto producto = crearProducto("Consist Venta", new BigDecimal("80.00"), new BigDecimal("30.00"), 50);
        registrarVenta(producto, 3, new BigDecimal("80.00"));
        registrarVenta(producto, 1, new BigDecimal("80.00"));

        LocalDateTime desde = LocalDateTime.now().minusDays(2);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        ReporteVentasResumenDTO reporte = reportesService.resumenVentas(desde, hasta, Agrupacion.DIA);
        List<VentasSerieDTO> puntos = reporte.getSerie().getPuntos();

        BigDecimal sumVentas = puntos.stream()
            .map(VentasSerieDTO::getVentas)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumDev = puntos.stream()
            .map(VentasSerieDTO::getDevoluciones)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumNetas = puntos.stream()
            .map(VentasSerieDTO::getVentasNetas)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumGanancia = puntos.stream()
            .map(VentasSerieDTO::getGanancia)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long sumPedidos = puntos.stream().mapToLong(VentasSerieDTO::getPedidos).sum();

        assertThat(sumVentas).isEqualByComparingTo(reporte.getKpis().getVentasBrutas());
        assertThat(sumDev).isEqualByComparingTo(reporte.getKpis().getDevoluciones());
        assertThat(sumNetas).isEqualByComparingTo(reporte.getKpis().getVentasNetas());
        assertThat(sumGanancia).isEqualByComparingTo(reporte.getKpis().getGananciaBruta());
        assertThat(sumPedidos).isEqualTo(reporte.getKpis().getPedidos());

        byte[] csv = reportesService.exportarVentasCsv(desde, hasta, Agrupacion.DIA);
        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto).contains(reporte.getKpis().getVentasBrutas().toPlainString());
        assertThat(texto).contains("fecha;etiqueta;ventas");
    }

    @Test
    @DisplayName("Compras sin filtro: suma(gastoPorProveedor) == KPIs")
    void comprasKpiIgualSumaProveedores() {
        Producto producto = crearProducto("Consist Compra", new BigDecimal("40.00"), new BigDecimal("15.00"), 0);
        Proveedor p1 = crearProveedor("Prov A Consist");
        Proveedor p2 = crearProveedor("Prov B Consist");
        registrarCompra(producto, p1, 2, new BigDecimal("15.00"));
        registrarCompra(producto, p2, 4, new BigDecimal("15.00"));

        LocalDateTime desde = LocalDateTime.now().minusDays(2);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        CompraAnalyticsDTO reporte = reportesService.resumenCompras(desde, hasta, Agrupacion.DIA, null);
        List<ProveedorGastoDTO> detalle = reporte.getGastoPorProveedor();

        BigDecimal sumBrutas = detalle.stream()
            .map(ProveedorGastoDTO::getComprasBrutas)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumDev = detalle.stream()
            .map(ProveedorGastoDTO::getDevoluciones)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumNetas = detalle.stream()
            .map(ProveedorGastoDTO::getComprasNetas)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long sumOrdenes = detalle.stream().mapToLong(ProveedorGastoDTO::getOrdenes).sum();

        assertThat(sumBrutas).isEqualByComparingTo(reporte.getComprasBrutas());
        assertThat(sumDev).isEqualByComparingTo(reporte.getDevolucionesCompra());
        assertThat(sumNetas).isEqualByComparingTo(reporte.getComprasNetas());
        assertThat(sumOrdenes).isEqualTo(reporte.getOrdenes());
    }

    @Test
    @DisplayName("Compras con proveedorId: KPI alineado 100% con detalle filtrado")
    void comprasConFiltroProveedorKpiAlineado() {
        Producto producto = crearProducto("Filtro Compra", new BigDecimal("25.00"), new BigDecimal("10.00"), 0);
        Proveedor objetivo = crearProveedor("Prov Filtro");
        Proveedor otro = crearProveedor("Prov Otro");
        registrarCompra(producto, objetivo, 3, new BigDecimal("10.00"));
        registrarCompra(producto, otro, 10, new BigDecimal("10.00"));

        LocalDateTime desde = LocalDateTime.now().minusDays(2);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        CompraAnalyticsDTO reporte =
            reportesService.resumenCompras(desde, hasta, Agrupacion.DIA, objetivo.getId());

        assertThat(reporte.getGastoPorProveedor()).hasSize(1);
        ProveedorGastoDTO fila = reporte.getGastoPorProveedor().get(0);
        assertThat(fila.getProveedorId()).isEqualTo(objetivo.getId());
        assertThat(reporte.getComprasBrutas()).isEqualByComparingTo(fila.getComprasBrutas());
        assertThat(reporte.getDevolucionesCompra()).isEqualByComparingTo(fila.getDevoluciones());
        assertThat(reporte.getComprasNetas()).isEqualByComparingTo(fila.getComprasNetas());
        assertThat(reporte.getOrdenes()).isEqualTo(fila.getOrdenes());
        assertThat(reporte.getProductosComprados()).isEmpty();
        assertThat(reporte.getSerie()).isEmpty();
    }

    private void registrarVenta(Producto producto, int cantidad, BigDecimal precio) {
        DetalleVentaRequestDTO linea = new DetalleVentaRequestDTO();
        linea.setProductoId(producto.getId());
        linea.setCantidad(cantidad);
        linea.setPrecioUnitario(precio);
        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(List.of(linea));
        VentaResponseDTO venta = ventaService.crear(request, USUARIO_TEST);
        ventaService.completar(venta.getId(), USUARIO_TEST);
    }

    private void registrarCompra(Producto producto, Proveedor proveedor, int cantidad, BigDecimal costo) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costo);
        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDetalles(List.of(detalle));
        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);
        compraService.completar(compra.getId(), USUARIO_TEST);
    }
}
