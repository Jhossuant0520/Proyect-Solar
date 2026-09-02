package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteInventarioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DireccionMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * La devolución al proveedor es un documento económico propio: la compra original
 * conserva su importe y la devolución se resta aparte.
 */
class DevolucionCompraServiceTest extends ComercialTestSupport {

    @Autowired
    private CompraService compraService;

    @Autowired
    private DevolucionCompraService devolucionCompraService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("Devolución total: cierra la compra, vacía el stock y devuelve el importe completo")
    void devolucionTotal() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        DevolucionCompraResponseDTO devolucion = devolver(compra, detalle(compra, 0), 10);

        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("3000.00");
        assertThat(devolucion.getCostoTotalDevuelto()).isEqualByComparingTo("3000.00");
        assertThat(devolucion.getCompraEstado()).isEqualTo(EstadoCompra.DEVUELTA);
        assertThat(stockDe(producto.getId())).isZero();

        assertThat(compraService.obtenerPorId(compra.getId()).getEstado()).isEqualTo(EstadoCompra.DEVUELTA);
    }

    @Test
    @DisplayName("Devolución parcial: la compra queda PARCIALMENTE_DEVUELTA y el stock baja solo lo devuelto")
    void devolucionParcial() {
        Producto producto = crearProducto("Producto B", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        DevolucionCompraResponseDTO devolucion = devolver(compra, detalle(compra, 0), 4);

        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("1200.00");
        assertThat(devolucion.getCompraEstado()).isEqualTo(EstadoCompra.PARCIALMENTE_DEVUELTA);
        assertThat(devolucion.getDetalles()).hasSize(1);
        assertThat(devolucion.getDetalles().get(0).getCantidad()).isEqualTo(4);
        assertThat(stockDe(producto.getId())).isEqualTo(6);
    }

    @Test
    @DisplayName("Una segunda devolución parcial cierra la compra y suma exactamente el total")
    void segundaDevolucionParcial() {
        Producto producto = crearProducto("Producto C", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        devolver(compra, detalle(compra, 0), 4);
        DevolucionCompraResponseDTO segunda = devolver(compra, detalle(compra, 0), 6);

        assertThat(segunda.getCompraEstado()).isEqualTo(EstadoCompra.DEVUELTA);
        assertThat(stockDe(producto.getId())).isZero();
        assertThat(totalDevueltoDe(compra)).isEqualByComparingTo("3000.00");
    }

    @Test
    @DisplayName("Devolver más unidades de las pendientes rechaza toda la operación")
    void excesoDeDevolucionSeRechaza() {
        Producto producto = crearProducto("Producto D", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        devolver(compra, detalle(compra, 0), 6);

        DevolucionCompraRequestDTO request = requestDevolucion(detalle(compra, 0), 5);

        assertThatThrownBy(() -> devolucionCompraService.registrar(compra.getId(), request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("pendiente de devolución 4");

        assertThat(devolucionCompraService.listarPorCompra(compra.getId())).hasSize(1);
        assertThat(stockDe(producto.getId())).isEqualTo(4);
        assertThat(compraService.obtenerPorId(compra.getId()).getDetalles().get(0).getCantidadDevuelta())
            .isEqualTo(6);
    }

    @Test
    @DisplayName("Una compra PENDIENTE no genera devolución económica")
    void compraPendienteNoSeDevuelve() {
        Producto producto = crearProducto("Producto E", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor E");

        CompraResponseDTO compra = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 5, new BigDecimal("100.00"), null), USUARIO_TEST);

        DevolucionCompraRequestDTO request = requestDevolucion(detalle(compra, 0), 1);

        assertThatThrownBy(() -> devolucionCompraService.registrar(compra.getId(), request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("compra completada");

        assertThat(devolucionCompraService.listarPorCompra(compra.getId())).isEmpty();
        assertThat(stockDe(producto.getId())).isZero();
    }

    @Test
    @DisplayName("Una compra CANCELADA no genera devolución económica")
    void compraCanceladaNoSeDevuelve() {
        Producto producto = crearProducto("Producto F", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor F");

        CompraResponseDTO compra = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 5, new BigDecimal("100.00"), null), USUARIO_TEST);
        compraService.cancelar(compra.getId());

        DevolucionCompraRequestDTO request = requestDevolucion(detalle(compra, 0), 1);

        assertThatThrownBy(() -> devolucionCompraService.registrar(compra.getId(), request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("CANCELADA");

        assertThat(devolucionCompraService.listarPorCompra(compra.getId())).isEmpty();
    }

    @Test
    @DisplayName("El movimiento de inventario es una salida referida al documento de devolución")
    void movimientoDeInventarioTrazable() {
        Producto producto = crearProducto("Producto G", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("250.00"), null);

        DevolucionCompraResponseDTO devolucion = devolver(compra, detalle(compra, 0), 3);

        List<MovimientoInventarioResponseDTO> movimientos = inventarioService.listarMovimientos(
            producto.getId(), TipoMovimientoInventario.DEVOLUCION_COMPRA, null, null);

        assertThat(movimientos).hasSize(1);
        MovimientoInventarioResponseDTO movimiento = movimientos.get(0);

        assertThat(movimiento.getDireccion()).isEqualTo(DireccionMovimiento.SALIDA);
        assertThat(movimiento.getCantidad()).isEqualTo(3);
        assertThat(movimiento.getStockAnterior()).isEqualTo(10);
        assertThat(movimiento.getStockNuevo()).isEqualTo(7);
        assertThat(movimiento.getCostoUnitario()).isEqualByComparingTo("250.00");
        assertThat(movimiento.getReferenciaTipo()).isEqualTo(ReferenciaMovimiento.DEVOLUCION_COMPRA);
        assertThat(movimiento.getReferenciaId()).isEqualTo(devolucion.getId());
    }

    @Test
    @DisplayName("La devolución revierte el costo histórico de la compra, no el costo vigente del producto")
    void costoHistoricoNoSeReinterpreta() {
        Producto producto = crearProducto("Producto H", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor H");

        CompraResponseDTO primera = comprar(proveedor, producto, 10, new BigDecimal("400.00"), null);
        comprar(proveedor, producto, 5, new BigDecimal("700.00"), null);

        assertThat(costoDe(producto.getId())).isEqualByComparingTo("700.00");

        DevolucionCompraResponseDTO devolucion = devolver(primera, detalle(primera, 0), 10);

        assertThat(devolucion.getDetalles().get(0).getCostoUnitario()).isEqualByComparingTo("400.00");
        assertThat(devolucion.getDetalles().get(0).isCostoConocido()).isTrue();
        assertThat(devolucion.getCostoTotalDevuelto()).isEqualByComparingTo("4000.00");
        assertThat(stockDe(producto.getId())).isEqualTo(5);
    }

    @Test
    @DisplayName("La compra original conserva su importe histórico tras la devolución")
    void compraOriginalIntacta() {
        Producto producto = crearProducto("Producto I", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        devolver(compra, detalle(compra, 0), 7);

        CompraResponseDTO despues = compraService.obtenerPorId(compra.getId());

        assertThat(despues.getSubtotal()).isEqualByComparingTo("3000.00");
        assertThat(despues.getTotal()).isEqualByComparingTo("3000.00");
        assertThat(despues.getDetalles().get(0).getCostoUnitario()).isEqualByComparingTo("300.00");
        assertThat(despues.getDetalles().get(0).getSubtotal()).isEqualByComparingTo("3000.00");
        assertThat(despues.getDetalles().get(0).getCantidad()).isEqualTo(10);
    }

    @Test
    @DisplayName("La compra neta se obtiene restando devoluciones sin tocar la compra bruta")
    void compraNetaSeCalculaAparte() {
        Producto producto = crearProducto("Producto J", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("100.00"), null);

        devolver(compra, detalle(compra, 0), 2);

        BigDecimal bruta = compraService.obtenerPorId(compra.getId()).getTotal();
        BigDecimal neta = bruta.subtract(totalDevueltoDe(compra));

        assertThat(bruta).isEqualByComparingTo("1000.00");
        assertThat(neta).isEqualByComparingTo("800.00");
    }

    @Test
    @DisplayName("Si el stock no alcanza, la devolución se revierte entera y no deja rastro")
    void rollbackCompletoAnteError() {
        Producto producto = crearProducto("Producto K", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        // Las unidades ya salieron del almacén: la devolución al proveedor no puede cumplirse.
        AjusteInventarioRequestDTO salida = new AjusteInventarioRequestDTO();
        salida.setProductoId(producto.getId());
        salida.setTipo(TipoMovimientoInventario.AJUSTE_SALIDA);
        salida.setCantidad(8);
        salida.setObservaciones("Salida previa a la devolución");
        inventarioService.registrarAjuste(salida, USUARIO_TEST);

        DevolucionCompraRequestDTO request = requestDevolucion(detalle(compra, 0), 10);

        assertThatThrownBy(() -> devolucionCompraService.registrar(compra.getId(), request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Stock insuficiente");

        assertThat(devolucionCompraService.listarPorCompra(compra.getId())).isEmpty();
        assertThat(devolucionCompraRepository.count()).isZero();
        assertThat(inventarioService.listarMovimientos(
            producto.getId(), TipoMovimientoInventario.DEVOLUCION_COMPRA, null, null)).isEmpty();
        assertThat(stockDe(producto.getId())).isEqualTo(2);

        CompraResponseDTO despues = compraService.obtenerPorId(compra.getId());
        assertThat(despues.getEstado()).isEqualTo(EstadoCompra.COMPLETADA);
        assertThat(despues.getDetalles().get(0).getCantidadDevuelta()).isZero();
    }

    @Test
    @DisplayName("Las devoluciones se numeran DC-{yyyy}-{seq} de forma consecutiva")
    void numeracionConsecutiva() {
        Producto producto = crearProducto("Producto L", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("300.00"), null);

        DevolucionCompraResponseDTO primera = devolver(compra, detalle(compra, 0), 2);
        DevolucionCompraResponseDTO segunda = devolver(compra, detalle(compra, 0), 3);

        int anio = LocalDateTime.now().getYear();
        assertThat(primera.getNumero()).isEqualTo("DC-" + anio + "-000001");
        assertThat(segunda.getNumero()).isEqualTo("DC-" + anio + "-000002");
    }

    @Test
    @DisplayName("El importe devuelto respeta el descuento de cabecera y el costo revertido no")
    void descuentoDeCabeceraSeProrratea() {
        Producto producto = crearProducto("Producto M", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 10, new BigDecimal("500.00"), new BigDecimal("500.00"));

        assertThat(compra.getTotal()).isEqualByComparingTo("4500.00");

        DevolucionCompraResponseDTO devolucion = devolver(compra, detalle(compra, 0), 4);

        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("1800.00");
        assertThat(devolucion.getCostoTotalDevuelto()).isEqualByComparingTo("2000.00");
    }

    @Test
    @DisplayName("Varias devoluciones parciales con redondeo suman exactamente el total de la compra")
    void redondeoSinDiferenciaAcumulada() {
        Producto producto = crearProducto("Producto N", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 3, new BigDecimal("100.00"), new BigDecimal("0.01"));

        assertThat(compra.getTotal()).isEqualByComparingTo("299.99");

        devolver(compra, detalle(compra, 0), 1);
        devolver(compra, detalle(compra, 0), 1);
        DevolucionCompraResponseDTO ultima = devolver(compra, detalle(compra, 0), 1);

        assertThat(ultima.getCompraEstado()).isEqualTo(EstadoCompra.DEVUELTA);
        assertThat(ultima.getMontoTotalDevuelto()).isEqualByComparingTo("99.99");
        assertThat(totalDevueltoDe(compra)).isEqualByComparingTo("299.99");
    }

    @Test
    @DisplayName("Una devolución total de varias líneas cuadra con el total de la compra")
    void devolucionTotalMultilinea() {
        Producto uno = crearProducto("Producto O", new BigDecimal("1000.00"), null, 0);
        Producto dos = crearProducto("Producto P", new BigDecimal("1000.00"), null, 0);
        Proveedor proveedor = crearProveedor("Proveedor O");

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDescuento(new BigDecimal("0.05"));
        request.setDetalles(List.of(
            linea(uno.getId(), 3, new BigDecimal("100.00")),
            linea(dos.getId(), 2, new BigDecimal("33.33"))));

        CompraResponseDTO compra = compraService.completar(
            compraService.crear(request, USUARIO_TEST).getId(), USUARIO_TEST);

        assertThat(compra.getTotal()).isEqualByComparingTo("366.61");

        List<DevolucionLineaDTO> lineas = new ArrayList<>();
        lineas.add(lineaDevolucion(detalle(compra, 0), 3));
        lineas.add(lineaDevolucion(detalle(compra, 1), 2));

        DevolucionCompraRequestDTO devolucionRequest = new DevolucionCompraRequestDTO();
        devolucionRequest.setLineas(lineas);
        devolucionRequest.setMotivo(MotivoDevolucionCompra.PRODUCTO_DEFECTUOSO);

        DevolucionCompraResponseDTO devolucion =
            devolucionCompraService.registrar(compra.getId(), devolucionRequest, USUARIO_TEST);

        assertThat(devolucion.getCompraEstado()).isEqualTo(EstadoCompra.DEVUELTA);
        assertThat(devolucion.getMontoTotalDevuelto()).isEqualByComparingTo("366.61");
        assertThat(stockDe(uno.getId())).isZero();
        assertThat(stockDe(dos.getId())).isZero();
    }

    @Test
    @DisplayName("Informar el método de reembolso deja la devolución como REEMBOLSADA")
    void reembolsoPosterior() {
        Producto producto = crearProducto("Producto Q", new BigDecimal("1000.00"), null, 0);
        CompraResponseDTO compra = comprar(producto, 5, new BigDecimal("200.00"), null);

        DevolucionCompraResponseDTO devolucion = devolver(compra, detalle(compra, 0), 2);
        assertThat(devolucion.getEstado()).isEqualTo(EstadoDevolucionCompra.REGISTRADA);
        assertThat(devolucion.getFechaReembolso()).isNull();

        DevolucionCompraResponseDTO reembolsada = devolucionCompraService.registrarReembolso(
            devolucion.getId(), MetodoReembolso.NOTA_CREDITO);

        assertThat(reembolsada.getEstado()).isEqualTo(EstadoDevolucionCompra.REEMBOLSADA);
        assertThat(reembolsada.getMetodoReembolso()).isEqualTo(MetodoReembolso.NOTA_CREDITO);
        assertThat(reembolsada.getFechaReembolso()).isNotNull();

        assertThatThrownBy(() -> devolucionCompraService.registrarReembolso(
                devolucion.getId(), MetodoReembolso.EFECTIVO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ya fue reembolsada");
    }

    // ----------------------------------------------------------------- ayudas

    private CompraResponseDTO comprar(Producto producto, int cantidad, BigDecimal costo, BigDecimal descuento) {
        return comprar(crearProveedor("Proveedor de " + producto.getNombre()), producto, cantidad, costo, descuento);
    }

    private CompraResponseDTO comprar(
            Proveedor proveedor, Producto producto, int cantidad, BigDecimal costo, BigDecimal descuento) {

        CompraResponseDTO creada = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), cantidad, costo, descuento), USUARIO_TEST);
        return compraService.completar(creada.getId(), USUARIO_TEST);
    }

    private DevolucionCompraResponseDTO devolver(CompraResponseDTO compra, Long detalleId, int cantidad) {
        return devolucionCompraService.registrar(
            compra.getId(), requestDevolucion(detalleId, cantidad), USUARIO_TEST);
    }

    private BigDecimal totalDevueltoDe(CompraResponseDTO compra) {
        return devolucionCompraService.listarPorCompra(compra.getId()).stream()
            .map(DevolucionCompraResponseDTO::getMontoTotalDevuelto)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Long detalle(CompraResponseDTO compra, int indice) {
        return compra.getDetalles().get(indice).getId();
    }

    private DevolucionCompraRequestDTO requestDevolucion(Long detalleId, int cantidad) {
        DevolucionCompraRequestDTO request = new DevolucionCompraRequestDTO();
        request.setLineas(List.of(lineaDevolucion(detalleId, cantidad)));
        request.setMotivo(MotivoDevolucionCompra.PRODUCTO_DEFECTUOSO);
        return request;
    }

    private DevolucionLineaDTO lineaDevolucion(Long detalleId, int cantidad) {
        DevolucionLineaDTO linea = new DevolucionLineaDTO();
        linea.setDetalleId(detalleId);
        linea.setCantidad(cantidad);
        return linea;
    }

    private CompraRequestDTO requestCompra(
            Long proveedorId, Long productoId, int cantidad,
            BigDecimal costoUnitario, BigDecimal descuentoCabecera) {

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedorId);
        request.setDetalles(List.of(linea(productoId, cantidad, costoUnitario)));
        request.setDescuento(descuentoCabecera);
        return request;
    }

    private DetalleCompraRequestDTO linea(Long productoId, int cantidad, BigDecimal costoUnitario) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(productoId);
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costoUnitario);
        return detalle;
    }
}
