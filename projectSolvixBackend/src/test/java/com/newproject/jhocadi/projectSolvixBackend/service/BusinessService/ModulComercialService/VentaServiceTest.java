package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoAjusteCosto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class VentaServiceTest extends ComercialTestSupport {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("La venta se crea PENDIENTE, numerada y con totales calculados")
    void creaVentaPendienteConTotales() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        VentaResponseDTO venta = ventaService.crear(
            requestVenta(producto.getId(), 3, new BigDecimal("500.00"), new BigDecimal("200.00")), USUARIO_TEST);

        assertThat(venta.getEstado()).isEqualTo(EstadoVenta.PENDIENTE);
        assertThat(venta.getNumero()).isEqualTo("V-" + LocalDateTime.now().getYear() + "-000001");
        // 3 x 1000 = 3000 - 500 (descuento de línea) = 2500 subtotal
        assertThat(venta.getSubtotal()).isEqualByComparingTo("2500.00");
        assertThat(venta.getDescuento()).isEqualByComparingTo("200.00");
        assertThat(venta.getTotal()).isEqualByComparingTo("2300.00");
        // El stock no se mueve hasta completar
        assertThat(stockDe(producto.getId())).isEqualTo(10);
    }

    @Test
    @DisplayName("Sin cliente explícito la venta se asocia al Consumidor final")
    void ventaSinClienteUsaConsumidorFinal() {
        Producto producto = crearProducto("Producto B", new BigDecimal("100.00"), new BigDecimal("60.00"), 5);

        VentaResponseDTO venta = ventaService.crear(
            requestVenta(producto.getId(), 1, null, null), USUARIO_TEST);

        assertThat(venta.isClienteConsumidorFinal()).isTrue();
        assertThat(venta.getClienteId()).isNotNull();
    }

    @Test
    @DisplayName("Completar la venta descuenta stock, congela el costo y genera movimiento")
    void completarVentaDescuentaStockYCongelaCosto() {
        Producto producto = crearProducto("Producto C", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 4, null, null), USUARIO_TEST);
        VentaResponseDTO completada = ventaService.completar(creada.getId(), USUARIO_TEST);

        assertThat(completada.getEstado()).isEqualTo(EstadoVenta.COMPLETADA);
        assertThat(completada.getFechaCompletada()).isNotNull();
        assertThat(stockDe(producto.getId())).isEqualTo(6);

        DetalleVentaResponseDTO detalle = completada.getDetalles().get(0);
        assertThat(detalle.getPrecioUnitario()).isEqualByComparingTo("1000.00");
        assertThat(detalle.getCostoUnitario()).isEqualByComparingTo("600.00");
        assertThat(detalle.isCostoConocido()).isTrue();

        assertThat(inventarioService.listarMovimientos(
                producto.getId(), TipoMovimientoInventario.VENTA, null, null)).hasSize(1);
    }

    @Test
    @DisplayName("El precio histórico no cambia aunque el producto suba de precio después")
    void precioHistoricoQuedaCongelado() {
        Producto producto = crearProducto("Producto D", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 2, null, null), USUARIO_TEST);
        ventaService.completar(creada.getId(), USUARIO_TEST);

        producto.setPrecioVentaActual(new BigDecimal("2500.00"));
        productoRepository.save(producto);

        AjusteCostoRequestDTO ajuste = new AjusteCostoRequestDTO();
        ajuste.setProductoId(producto.getId());
        ajuste.setCostoNuevo(new BigDecimal("1800.00"));
        ajuste.setMotivo(MotivoAjusteCosto.ACTUALIZACION_PROVEEDOR);
        inventarioService.registrarAjusteCosto(ajuste, USUARIO_TEST);

        VentaResponseDTO recargada = ventaService.obtenerPorId(creada.getId());
        DetalleVentaResponseDTO detalle = recargada.getDetalles().get(0);

        assertThat(detalle.getPrecioUnitario()).isEqualByComparingTo("1000.00");
        assertThat(detalle.getCostoUnitario()).isEqualByComparingTo("600.00");
        assertThat(recargada.getTotal()).isEqualByComparingTo("2000.00");
    }

    @Test
    @DisplayName("Completar con stock insuficiente falla y revierte la operación completa")
    void completarConStockInsuficienteRevierteTodo() {
        Producto producto = crearProducto("Producto E", new BigDecimal("1000.00"), new BigDecimal("600.00"), 2);

        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 5, null, null), USUARIO_TEST);

        assertThatThrownBy(() -> ventaService.completar(creada.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Stock insuficiente");

        assertThat(stockDe(producto.getId())).isEqualTo(2);
        assertThat(ventaService.obtenerPorId(creada.getId()).getEstado()).isEqualTo(EstadoVenta.PENDIENTE);
        assertThat(inventarioService.listarMovimientos(producto.getId(), null, null, null)).isEmpty();
    }

    @Test
    @DisplayName("Un costo desconocido se marca explícitamente y no se asume cero")
    void costoDesconocidoNoSeAsumeCero() {
        Producto producto = crearProducto("Producto migrado", new BigDecimal("1000.00"), null, 10);

        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 1, null, null), USUARIO_TEST);
        VentaResponseDTO completada = ventaService.completar(creada.getId(), USUARIO_TEST);

        DetalleVentaResponseDTO detalle = completada.getDetalles().get(0);
        assertThat(detalle.getCostoUnitario()).isNull();
        assertThat(detalle.isCostoConocido()).isFalse();
    }

    @Test
    @DisplayName("Solo se cancela una venta PENDIENTE")
    void cancelarSoloAplicaAPendiente() {
        Producto producto = crearProducto("Producto F", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 1, null, null), USUARIO_TEST);

        VentaResponseDTO cancelada = ventaService.cancelar(creada.getId());
        assertThat(cancelada.getEstado()).isEqualTo(EstadoVenta.CANCELADA);
        assertThat(stockDe(producto.getId())).isEqualTo(10);

        VentaResponseDTO otra = ventaService.crear(requestVenta(producto.getId(), 1, null, null), USUARIO_TEST);
        ventaService.completar(otra.getId(), USUARIO_TEST);

        assertThatThrownBy(() -> ventaService.cancelar(otra.getId()))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("debe devolverse");
    }

    @Test
    @DisplayName("El descuento no puede superar el subtotal de la venta")
    void descuentoNoPuedeSuperarSubtotal() {
        Producto producto = crearProducto("Producto J", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        VentaRequestDTO request = requestVenta(producto.getId(), 1, null, new BigDecimal("500.00"));

        assertThatThrownBy(() -> ventaService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("descuento no puede superar");
    }

    private VentaRequestDTO requestVenta(
            Long productoId, int cantidad, BigDecimal descuentoLinea, BigDecimal descuentoCabecera) {

        DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
        detalle.setProductoId(productoId);
        detalle.setCantidad(cantidad);
        detalle.setDescuentoLinea(descuentoLinea);

        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(List.of(detalle));
        request.setDescuento(descuentoCabecera);
        return request;
    }
}
