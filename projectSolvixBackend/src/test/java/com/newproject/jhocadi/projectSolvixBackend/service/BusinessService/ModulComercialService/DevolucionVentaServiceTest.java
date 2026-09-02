package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class DevolucionVentaServiceTest extends ComercialTestSupport {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private DevolucionVentaService devolucionService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("La devolución total deja la venta DEVUELTA y restaura todo el stock")
    void devolucionTotalRestauraStock() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 3);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 3);

        assertThat(devolucion.getVentaEstado()).isEqualTo(EstadoVenta.DEVUELTA);
        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("3000.00");
        assertThat(stockDe(producto.getId())).isEqualTo(10);
        assertThat(ventaService.obtenerPorId(venta.getId()).getDetalles().get(0).getCantidadDevuelta())
            .isEqualTo(3);
    }

    @Test
    @DisplayName("La devolución parcial deja la venta PARCIALMENTE_DEVUELTA y reintegra lo devuelto")
    void devolucionParcialReintegraStock() {
        Producto producto = crearProducto("Producto B", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 4);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 1);

        assertThat(devolucion.getVentaEstado()).isEqualTo(EstadoVenta.PARCIALMENTE_DEVUELTA);
        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("1000.00");
        assertThat(stockDe(producto.getId())).isEqualTo(7);
        assertThat(ventaService.obtenerPorId(venta.getId()).getDetalles().get(0).getCantidadDevuelta())
            .isEqualTo(1);
    }

    @Test
    @DisplayName("Devolver más de lo vendido se rechaza y no deja rastro")
    void devolucionSuperiorALoVendidoSeRechaza() {
        Producto producto = crearProducto("Producto C", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 2);

        assertThatThrownBy(() -> devolver(venta, 5))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("pendiente de devolución");

        assertThat(stockDe(producto.getId())).isEqualTo(8);
        assertThat(devolucionVentaRepository.count()).isZero();
        assertThat(ventaService.obtenerPorId(venta.getId()).getEstado()).isEqualTo(EstadoVenta.COMPLETADA);
        assertThat(inventarioService.listarMovimientos(
                producto.getId(), TipoMovimientoInventario.DEVOLUCION_VENTA, null, null)).isEmpty();
    }

    @Test
    @DisplayName("La venta original conserva su importe histórico tras la devolución")
    void ventaOriginalPermaneceIntacta() {
        Producto producto = crearProducto("Producto D", new BigDecimal("100000.00"), new BigDecimal("60000.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 3);
        assertThat(venta.getTotal()).isEqualByComparingTo("300000.00");

        DevolucionVentaResponseDTO devolucion = devolver(venta, 1);

        VentaResponseDTO ventaTrasDevolucion = ventaService.obtenerPorId(venta.getId());
        assertThat(ventaTrasDevolucion.getTotal()).isEqualByComparingTo("300000.00");
        assertThat(ventaTrasDevolucion.getSubtotal()).isEqualByComparingTo("300000.00");
        assertThat(ventaTrasDevolucion.getDetalles().get(0).getPrecioUnitario()).isEqualByComparingTo("100000.00");

        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("100000.00");
        assertThat(devolucion.getVentaTotalOriginal()).isEqualByComparingTo("300000.00");

        // Ventas netas = 300.000 - 100.000
        BigDecimal ventasNetas = ventaTrasDevolucion.getTotal()
            .subtract(devolucion.getMontoTotalDevuelto());
        assertThat(ventasNetas).isEqualByComparingTo("200000.00");
    }

    @Test
    @DisplayName("Una devolución no aparece como una venta nueva")
    void devolucionNoEsUnaVentaNueva() {
        Producto producto = crearProducto("Producto E", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 2);

        long ventasAntes = ventaRepository.count();
        devolver(venta, 1);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
        assertThat(ventaService.listar(null, null, null, null)).hasSize(1);
        assertThat(devolucionVentaRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("La devolución genera movimiento DEVOLUCION_VENTA referenciado a su documento")
    void generaMovimientoDeDevolucion() {
        Producto producto = crearProducto("Producto F", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 4);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 2);

        var movimientos = inventarioService.listarMovimientos(
            producto.getId(), TipoMovimientoInventario.DEVOLUCION_VENTA, null, null);

        assertThat(movimientos).hasSize(1);
        var movimiento = movimientos.get(0);
        assertThat(movimiento.getCantidad()).isEqualTo(2);
        assertThat(movimiento.getStockAnterior()).isEqualTo(6);
        assertThat(movimiento.getStockNuevo()).isEqualTo(8);
        assertThat(movimiento.getReferenciaId()).isEqualTo(devolucion.getId());
        assertThat(movimiento.getCostoUnitario()).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("El monto devuelto respeta los descuentos de línea y de cabecera")
    void montoDevueltoRespetaDescuentos() {
        Producto producto = crearProducto("Producto G", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        // 4 x 1000 = 4000, menos 400 de descuento de línea = 3600 subtotal,
        // menos 600 de descuento de cabecera = 3000 total. Cada unidad valió 750.
        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 4, new BigDecimal("400.00"), new BigDecimal("600.00")), USUARIO_TEST);
        VentaResponseDTO venta = ventaService.completar(creada.getId(), USUARIO_TEST);
        assertThat(venta.getTotal()).isEqualByComparingTo("3000.00");

        DevolucionVentaResponseDTO devolucion = devolver(venta, 2);

        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("1500.00");
        assertThat(devolucion.getDetalles().get(0).getMontoDevuelto()).isEqualByComparingTo("1500.00");
    }

    @Test
    @DisplayName("Varias devoluciones parciales suman exactamente el total de la venta")
    void devolucionesParcialesSumanElTotal() {
        Producto producto = crearProducto("Producto H", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        // 3 x 100 = 300, menos 10 de descuento = 290 total. 290/3 no es exacto.
        VentaResponseDTO creada = ventaService.crear(
            requestVenta(producto.getId(), 3, null, new BigDecimal("10.00")), USUARIO_TEST);
        VentaResponseDTO venta = ventaService.completar(creada.getId(), USUARIO_TEST);
        assertThat(venta.getTotal()).isEqualByComparingTo("290.00");

        DevolucionVentaResponseDTO primera = devolver(venta, 1);
        DevolucionVentaResponseDTO segunda = devolver(venta, 2);

        assertThat(segunda.getVentaEstado()).isEqualTo(EstadoVenta.DEVUELTA);

        BigDecimal totalDevuelto = primera.getMontoTotalDevuelto().add(segunda.getMontoTotalDevuelto());
        assertThat(totalDevuelto).isEqualByComparingTo("290.00");
        assertThat(stockDe(producto.getId())).isEqualTo(10);
    }

    @Test
    @DisplayName("El costo devuelto se registra para poder revertir el costo de ventas")
    void registraCostoDevuelto() {
        Producto producto = crearProducto("Producto I", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 3);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 2);

        assertThat(devolucion.getCostoTotalDevuelto()).isEqualByComparingTo("1200.00");
        assertThat(devolucion.isCostoCompletoConocido()).isTrue();
        assertThat(devolucion.getDetalles().get(0).getCostoUnitario()).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("Un costo desconocido en la venta se propaga como costo incompleto")
    void costoDesconocidoSePropagaALaDevolucion() {
        Producto producto = crearProducto("Producto migrado", new BigDecimal("1000.00"), null, 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 2);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 1);

        assertThat(devolucion.getCostoTotalDevuelto()).isEqualByComparingTo("0.00");
        assertThat(devolucion.isCostoCompletoConocido()).isFalse();
        assertThat(devolucion.getDetalles().get(0).getCostoUnitario()).isNull();
        assertThat(devolucion.getDetalles().get(0).isCostoConocido()).isFalse();
    }

    @Test
    @DisplayName("La devolución se numera con la serie D-{yyyy}-{seq}")
    void devolucionSeNumeraConSuPropiaSerie() {
        Producto producto = crearProducto("Producto J", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 3);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 1);

        assertThat(devolucion.getNumero()).isEqualTo("D-" + LocalDateTime.now().getYear() + "-000001");
        assertThat(devolucion.getVentaNumero()).startsWith("V-");
    }

    @Test
    @DisplayName("Informar el método de reembolso deja la devolución como REEMBOLSADA")
    void reembolsoMarcaLaDevolucion() {
        Producto producto = crearProducto("Producto K", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 2);

        DevolucionVentaRequestDTO request = requestDevolucion(venta, 1);
        request.setMetodoReembolso(MetodoReembolso.EFECTIVO);
        DevolucionVentaResponseDTO devolucion = devolucionService.registrar(venta.getId(), request, USUARIO_TEST);

        assertThat(devolucion.getEstado()).isEqualTo(EstadoDevolucionVenta.REEMBOLSADA);
        assertThat(devolucion.getMetodoReembolso()).isEqualTo(MetodoReembolso.EFECTIVO);
        assertThat(devolucion.getFechaReembolso()).isNotNull();
    }

    @Test
    @DisplayName("Una devolución registrada puede reembolsarse después, una sola vez")
    void reembolsoPosteriorSoloUnaVez() {
        Producto producto = crearProducto("Producto L", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = venderYCompletar(producto.getId(), 2);

        DevolucionVentaResponseDTO devolucion = devolver(venta, 1);
        assertThat(devolucion.getEstado()).isEqualTo(EstadoDevolucionVenta.REGISTRADA);

        DevolucionVentaResponseDTO reembolsada =
            devolucionService.registrarReembolso(devolucion.getId(), MetodoReembolso.TRANSFERENCIA);
        assertThat(reembolsada.getEstado()).isEqualTo(EstadoDevolucionVenta.REEMBOLSADA);

        assertThatThrownBy(() -> devolucionService.registrarReembolso(
                devolucion.getId(), MetodoReembolso.EFECTIVO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ya fue reembolsada");
    }

    @Test
    @DisplayName("No se puede devolver una venta que nunca se completó")
    void noSePuedeDevolverUnaVentaPendiente() {
        Producto producto = crearProducto("Producto M", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);
        VentaResponseDTO venta = ventaService.crear(
            requestVenta(producto.getId(), 2, null, null), USUARIO_TEST);

        assertThatThrownBy(() -> devolver(venta, 1))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("venta completada");

        assertThat(devolucionVentaRepository.count()).isZero();
    }

    private VentaResponseDTO venderYCompletar(Long productoId, int cantidad) {
        VentaResponseDTO creada = ventaService.crear(requestVenta(productoId, cantidad, null, null), USUARIO_TEST);
        return ventaService.completar(creada.getId(), USUARIO_TEST);
    }

    private DevolucionVentaResponseDTO devolver(VentaResponseDTO venta, int cantidad) {
        return devolucionService.registrar(venta.getId(), requestDevolucion(venta, cantidad), USUARIO_TEST);
    }

    private DevolucionVentaRequestDTO requestDevolucion(VentaResponseDTO venta, int cantidad) {
        DevolucionLineaDTO linea = new DevolucionLineaDTO();
        linea.setDetalleId(venta.getDetalles().get(0).getId());
        linea.setCantidad(cantidad);

        DevolucionVentaRequestDTO request = new DevolucionVentaRequestDTO();
        request.setLineas(List.of(linea));
        request.setMotivo(MotivoDevolucion.PRODUCTO_DEFECTUOSO);
        return request;
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
