package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumentoExternoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class CompraServiceTest extends ComercialTestSupport {

    @Autowired
    private CompraService compraService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("La compra se crea PENDIENTE, numerada y sin mover inventario")
    void creaCompraPendiente() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor 1");

        CompraResponseDTO compra = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 10, new BigDecimal("500.00"), null), USUARIO_TEST);

        assertThat(compra.getEstado()).isEqualTo(EstadoCompra.PENDIENTE);
        assertThat(compra.getNumero()).isEqualTo("C-" + LocalDateTime.now().getYear() + "-000001");
        assertThat(compra.getSubtotal()).isEqualByComparingTo("5000.00");
        assertThat(compra.getTotal()).isEqualByComparingTo("5000.00");
        assertThat(stockDe(producto.getId())).isZero();
    }

    @Test
    @DisplayName("Completar la compra ingresa stock y fija el costo con la política de último costo")
    void completarCompraIngresaStockYActualizaCosto() {
        Producto producto = crearProducto("Producto B", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor 2");

        CompraResponseDTO creada = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 10, new BigDecimal("500.00"), null), USUARIO_TEST);
        CompraResponseDTO completada = compraService.completar(creada.getId(), USUARIO_TEST);

        assertThat(completada.getEstado()).isEqualTo(EstadoCompra.COMPLETADA);
        assertThat(stockDe(producto.getId())).isEqualTo(10);
        assertThat(costoDe(producto.getId())).isEqualByComparingTo("500.00");

        assertThat(inventarioService.listarMovimientos(
                producto.getId(), TipoMovimientoInventario.COMPRA, null, null)).hasSize(1);
    }

    @Test
    @DisplayName("Una segunda compra reemplaza el costo vigente sin alterar el costo histórico anterior")
    void ultimoCostoReemplazaElVigente() {
        Producto producto = crearProducto("Producto C", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor 3");

        CompraResponseDTO primera = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 5, new BigDecimal("400.00"), null), USUARIO_TEST);
        compraService.completar(primera.getId(), USUARIO_TEST);

        CompraResponseDTO segunda = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 5, new BigDecimal("700.00"), null), USUARIO_TEST);
        compraService.completar(segunda.getId(), USUARIO_TEST);

        assertThat(costoDe(producto.getId())).isEqualByComparingTo("700.00");
        assertThat(stockDe(producto.getId())).isEqualTo(10);

        CompraResponseDTO historica = compraService.obtenerPorId(primera.getId());
        assertThat(historica.getDetalles().get(0).getCostoUnitario()).isEqualByComparingTo("400.00");
    }

    @Test
    @DisplayName("Una compra completada no puede cancelarse")
    void compraCompletadaNoSeCancela() {
        Producto producto = crearProducto("Producto D", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor 4");

        CompraResponseDTO creada = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 2, new BigDecimal("100.00"), null), USUARIO_TEST);
        compraService.completar(creada.getId(), USUARIO_TEST);

        assertThatThrownBy(() -> compraService.cancelar(creada.getId()))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("devolverse");
    }

    @Test
    @DisplayName("El descuento de cabecera no puede superar el subtotal")
    void descuentoNoPuedeSuperarSubtotal() {
        Producto producto = crearProducto("Producto F", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor 6");

        CompraRequestDTO request = requestCompra(
            proveedor.getId(), producto.getId(), 1, new BigDecimal("100.00"), new BigDecimal("900.00"));

        assertThatThrownBy(() -> compraService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("descuento no puede superar");
    }

    @Test
    @DisplayName("Documento externo, OC, cotización y condiciones se congelan al crear")
    void compraEnriquecidaCongelaDocumentoYCondiciones() {
        Producto producto = crearProducto("Producto Enriq", new BigDecimal("100.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov Condiciones");
        proveedor.setCondicionPago(CondicionPagoProveedor.CREDITO);
        proveedor.setDiasCredito(30);
        proveedorRepository.save(proveedor);

        CompraRequestDTO request = requestCompra(
            proveedor.getId(), producto.getId(), 2, new BigDecimal("100.00"), null);
        request.setTipoDocumentoExterno(TipoDocumentoExternoCompra.FACTURA);
        request.setNumeroDocumentoExterno("F-9001");
        request.setNumeroOrdenCompra("OC-55");
        request.setNumeroCotizacionProveedor("CDV-12");
        request.setFechaDocumentoProveedor(LocalDateTime.of(2026, 3, 1, 10, 0));
        request.setFechaEntrega(LocalDateTime.of(2026, 3, 10, 0, 0));
        request.setContactoNombreSnapshot("Ana Comercial");

        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);

        assertThat(compra.getTipoDocumentoExterno()).isEqualTo(TipoDocumentoExternoCompra.FACTURA);
        assertThat(compra.getNumeroDocumentoExterno()).isEqualTo("F-9001");
        assertThat(compra.getNumeroOrdenCompra()).isEqualTo("OC-55");
        assertThat(compra.getNumeroCotizacionProveedor()).isEqualTo("CDV-12");
        assertThat(compra.getCondicionPagoAplicada()).isEqualTo(CondicionPagoProveedor.CREDITO);
        assertThat(compra.getDiasCreditoAplicados()).isEqualTo(30);
        assertThat(compra.getFechaVencimiento()).isEqualTo(compra.getFecha().plusDays(30));
        assertThat(compra.getMoneda()).isEqualTo("COP");
        assertThat(compra.getContactoNombreSnapshot()).isEqualTo("Ana Comercial");
        assertThat(compra.getImpuestoTotal()).isEqualByComparingTo("0.00");

        proveedor.setCondicionPago(CondicionPagoProveedor.CONTADO);
        proveedor.setDiasCredito(0);
        proveedor.setNombre("Prov Renombrado");
        proveedorRepository.save(proveedor);

        CompraResponseDTO historica = compraService.obtenerPorId(compra.getId());
        assertThat(historica.getCondicionPagoAplicada()).isEqualTo(CondicionPagoProveedor.CREDITO);
        assertThat(historica.getDiasCreditoAplicados()).isEqualTo(30);
        assertThat(historica.getProveedorNombre()).isEqualTo("Prov Condiciones");
        assertThat(historica.getContactoNombreSnapshot()).isEqualTo("Ana Comercial");
    }

    @Test
    @DisplayName("IVA mínimo: total = subtotal - descuento + impuesto")
    void totalConImpuestoYReferenciaProveedor() {
        Producto producto = crearProducto("Producto IVA", new BigDecimal("100.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov IVA");

        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(2);
        detalle.setCostoUnitario(new BigDecimal("100.00"));
        detalle.setPorcentajeImpuesto(new BigDecimal("19.00"));
        detalle.setReferenciaProveedor("ABC-7781");

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDescuento(new BigDecimal("10.00"));
        request.setDetalles(List.of(detalle));

        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);

        assertThat(compra.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(compra.getDescuento()).isEqualByComparingTo("10.00");
        assertThat(compra.getImpuestoTotal()).isEqualByComparingTo("38.00");
        assertThat(compra.getTotal()).isEqualByComparingTo("228.00");
        assertThat(compra.getDetalles().get(0).getReferenciaProveedor()).isEqualTo("ABC-7781");
        assertThat(compra.getDetalles().get(0).getValorImpuesto()).isEqualByComparingTo("38.00");
    }

    @Test
    @DisplayName("Tipo documento externo exige número")
    void tipoDocumentoExternoSinNumeroRechaza() {
        Producto producto = crearProducto("Producto Doc", new BigDecimal("50.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov Doc");

        CompraRequestDTO request = requestCompra(
            proveedor.getId(), producto.getId(), 1, new BigDecimal("50.00"), null);
        request.setTipoDocumentoExterno(TipoDocumentoExternoCompra.PEDIDO);

        assertThatThrownBy(() -> compraService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("número de documento");
    }

    @Test
    @DisplayName("Backend ignora valorImpuesto e impuestoTotal manipulados en el request")
    void backendRecalculaIvaIgnorandoValorManipulado() {
        Producto producto = crearProducto("Producto AntiManip", new BigDecimal("100.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov AntiManip");

        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(10);
        detalle.setCostoUnitario(new BigDecimal("100000.00"));
        detalle.setPorcentajeImpuesto(new BigDecimal("19.00"));
        detalle.setValorImpuesto(new BigDecimal("1.00")); // manipulación

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDescuento(BigDecimal.ZERO);
        request.setImpuestoTotal(new BigDecimal("999.00")); // manipulación
        request.setDetalles(List.of(detalle));

        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);

        assertThat(compra.getSubtotal()).isEqualByComparingTo("1000000.00");
        assertThat(compra.getImpuestoTotal()).isEqualByComparingTo("190000.00");
        assertThat(compra.getTotal()).isEqualByComparingTo("1190000.00");
        assertThat(compra.getDetalles().get(0).getValorImpuesto()).isEqualByComparingTo("190000.00");
        assertThat(compra.getDetalles().get(0).getPorcentajeImpuesto()).isEqualByComparingTo("19.00");
    }

    @Test
    @DisplayName("IVA 0% no genera impuesto y total = subtotal - descuento")
    void ivaCeroNoGeneraImpuesto() {
        Producto producto = crearProducto("Producto SinIVA", new BigDecimal("50.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov SinIVA");

        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(4);
        detalle.setCostoUnitario(new BigDecimal("50.00"));
        detalle.setPorcentajeImpuesto(BigDecimal.ZERO);

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDescuento(new BigDecimal("20.00"));
        request.setDetalles(List.of(detalle));

        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);

        assertThat(compra.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(compra.getImpuestoTotal()).isEqualByComparingTo("0.00");
        assertThat(compra.getTotal()).isEqualByComparingTo("180.00");
        assertThat(compra.getDetalles().get(0).getValorImpuesto()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("CONTADO congela días 0 y vencimiento null; CREDITO calcula vencimiento")
    void condicionesContadoYCredito() {
        Producto producto = crearProducto("Producto Cond", new BigDecimal("10.00"), null, 0);
        Proveedor proveedor = crearProveedor("Prov ContadoCredito");

        CompraRequestDTO contado = requestCompra(
            proveedor.getId(), producto.getId(), 1, new BigDecimal("10.00"), null);
        contado.setCondicionPagoAplicada(CondicionPagoProveedor.CONTADO);
        CompraResponseDTO c1 = compraService.crear(contado, USUARIO_TEST);
        assertThat(c1.getCondicionPagoAplicada()).isEqualTo(CondicionPagoProveedor.CONTADO);
        assertThat(c1.getDiasCreditoAplicados()).isEqualTo(0);
        assertThat(c1.getFechaVencimiento()).isNull();

        CompraRequestDTO credito = requestCompra(
            proveedor.getId(), producto.getId(), 1, new BigDecimal("10.00"), null);
        credito.setCondicionPagoAplicada(CondicionPagoProveedor.CREDITO);
        credito.setDiasCreditoAplicados(15);
        CompraResponseDTO c2 = compraService.crear(credito, USUARIO_TEST);
        assertThat(c2.getDiasCreditoAplicados()).isEqualTo(15);
        assertThat(c2.getFechaVencimiento()).isEqualTo(c2.getFecha().plusDays(15));
    }

    private CompraRequestDTO requestCompra(
            Long proveedorId, Long productoId, int cantidad,
            BigDecimal costoUnitario, BigDecimal descuentoCabecera) {

        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(productoId);
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costoUnitario);

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedorId);
        request.setDetalles(List.of(detalle));
        request.setDescuento(descuentoCabecera);
        return request;
    }
}
