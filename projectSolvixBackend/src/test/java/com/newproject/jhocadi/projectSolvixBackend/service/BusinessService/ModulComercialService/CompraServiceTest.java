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
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
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
