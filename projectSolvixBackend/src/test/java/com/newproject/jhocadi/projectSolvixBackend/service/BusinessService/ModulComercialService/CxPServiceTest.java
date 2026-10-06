package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CuentaPorPagarResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PagoCxPRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPagoCxP;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * Matriz QA FASE 3.15.13 — ciclo de vida CxP.
 */
class CxPServiceTest extends ComercialTestSupport {

    @Autowired
    private CompraService compraService;

    @Autowired
    private DevolucionCompraService devolucionCompraService;

    @Autowired
    private CxPService cxpService;

    // ------------------------------------------------------------------
    // 1. CONTADO → no CxP
    // ------------------------------------------------------------------

    @Test
    @DisplayName("1. Compra CONTADO completada → NO genera CxP")
    void compraContadoNoCreaCxp() {
        Producto producto = crearProducto("CxP Contado", new BigDecimal("80.00"), new BigDecimal("30.00"), 0);
        Proveedor proveedor = crearProveedor("Prov Contado CxP");
        CompraRequestDTO request = baseCompra(proveedor.getId(), producto, 1, new BigDecimal("30.00"));
        request.setCondicionPagoAplicada(CondicionPagoProveedor.CONTADO);
        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);
        compraService.completar(compra.getId(), USUARIO_TEST);

        assertThat(cuentaPorPagarRepository.findByCompraId(compra.getId())).isEmpty();
    }

    // ------------------------------------------------------------------
    // 2. CREDITO → sí CxP
    // ------------------------------------------------------------------

    @Test
    @DisplayName("2. Compra CREDITO completada → SÍ genera CxP")
    void compraCreditoCreaCxp() {
        Producto producto = crearProducto("CxP Credito", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 2, new BigDecimal("50.00"), 30);

        CuentaPorPagarResponseDTO cxp = cxpService.obtenerPorCompraId(compra.getId());

        assertThat(cxp.getCompraId()).isEqualTo(compra.getId());
        assertThat(cxp.getSaldoInicial()).isEqualByComparingTo(compra.getTotal());
        assertThat(cxp.getTotalDevoluciones()).isEqualByComparingTo("0.00");
        assertThat(cxp.getTotalPagado()).isEqualByComparingTo("0.00");
        assertThat(cxp.getSaldoPendiente()).isEqualByComparingTo(compra.getTotal());
        assertThat(cxp.getEstado()).isEqualTo(EstadoCuentaPorPagar.PENDIENTE);
        assertThat(cxp.getFechaVencimiento()).isNotNull();
    }

    // ------------------------------------------------------------------
    // 3. Idempotencia / no duplicar CxP
    // ------------------------------------------------------------------

    @Test
    @DisplayName("3. Completar CREDITO dos veces: compra rechaza; CxP idempotente (sin duplicado)")
    void completarCreditoDosVecesNoDuplicaCxp() {
        Producto producto = crearProducto("CxP Idem", new BigDecimal("60.00"), new BigDecimal("20.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 1, new BigDecimal("20.00"), 15);
        Long compraId = compra.getId();

        assertThat(cuentaPorPagarRepository.findByCompraId(compraId)).isPresent();
        long antes = cuentaPorPagarRepository.count();

        // Segunda completar: falla a nivel Compra (ya no PENDIENTE).
        assertThatThrownBy(() -> compraService.completar(compraId, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("PENDIENTE");

        // Hook explícito idempotente: no crea segunda fila.
        Compra entidad = compraRepository.findById(compraId).orElseThrow();
        cxpService.crearDesdeCompraCompletada(entidad, USUARIO_TEST);

        assertThat(cuentaPorPagarRepository.count()).isEqualTo(antes);
        assertThat(cuentaPorPagarRepository.findByCompraId(compraId)).isPresent();
    }

    // ------------------------------------------------------------------
    // 4. Pago exacto → PAGADA
    // ------------------------------------------------------------------

    @Test
    @DisplayName("4. Pago exacto al saldo_pendiente → estado PAGADA")
    void pagoExactoDejaPagada() {
        Producto producto = crearProducto("CxP Pago Exacto", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 1, new BigDecimal("100.00"), 15);
        CuentaPorPagarResponseDTO cxp = cxpService.obtenerPorCompraId(compra.getId());

        PagoCxPRequestDTO pago = new PagoCxPRequestDTO();
        pago.setValor(cxp.getSaldoPendiente());
        pago.setMetodoPago(MetodoPagoCxP.TRANSFERENCIA);

        CuentaPorPagarResponseDTO resultado = cxpService.registrarPago(cxp.getId(), pago, USUARIO_TEST);

        assertThat(resultado.getSaldoPendiente()).isEqualByComparingTo("0.00");
        assertThat(resultado.getEstado()).isEqualTo(EstadoCuentaPorPagar.PAGADA);
        assertThat(resultado.isVencida()).isFalse();
    }

    // ------------------------------------------------------------------
    // 5. Pago menor → PARCIALMENTE_PAGADA
    // ------------------------------------------------------------------

    @Test
    @DisplayName("5. Pago menor al saldo → estado PARCIALMENTE_PAGADA")
    void pagoMenorDejaParcialmentePagada() {
        Producto producto = crearProducto("CxP Parcial", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 2, new BigDecimal("50.00"), 10);
        CuentaPorPagarResponseDTO cxp = cxpService.obtenerPorCompraId(compra.getId());

        PagoCxPRequestDTO parcial = new PagoCxPRequestDTO();
        parcial.setValor(new BigDecimal("40.00"));
        parcial.setMetodoPago(MetodoPagoCxP.EFECTIVO);

        CuentaPorPagarResponseDTO mid = cxpService.registrarPago(cxp.getId(), parcial, USUARIO_TEST);

        assertThat(mid.getEstado()).isEqualTo(EstadoCuentaPorPagar.PARCIALMENTE_PAGADA);
        assertThat(mid.getSaldoPendiente()).isEqualByComparingTo("60.00");
    }

    // ------------------------------------------------------------------
    // 6. Pago mayor → BusinessException
    // ------------------------------------------------------------------

    @Test
    @DisplayName("6. Pago mayor al saldo → rechazado (BusinessException)")
    void pagoMayorRechazado() {
        Producto producto = crearProducto("CxP Sobrepago", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 1, new BigDecimal("50.00"), 10);
        CuentaPorPagarResponseDTO cxp = cxpService.obtenerPorCompraId(compra.getId());

        PagoCxPRequestDTO exceso = new PagoCxPRequestDTO();
        exceso.setValor(cxp.getSaldoPendiente().add(new BigDecimal("0.01")));
        exceso.setMetodoPago(MetodoPagoCxP.EFECTIVO);

        assertThatThrownBy(() -> cxpService.registrarPago(cxp.getId(), exceso, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("supera el saldo pendiente");
    }

    // ------------------------------------------------------------------
    // 7. Devolución reduce obligación
    // ------------------------------------------------------------------

    @Test
    @DisplayName("7. Devolución reduce obligación y recalcula saldo")
    void devolucionReduceObligacionNeta() {
        Producto producto = crearProducto("CxP Dev", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 10, new BigDecimal("100.00"), 30);

        devolverUnidades(compra, 2);

        CuentaPorPagarResponseDTO despues = cxpService.obtenerPorCompraId(compra.getId());
        assertThat(despues.getTotalDevoluciones()).isEqualByComparingTo("200.00");
        assertThat(despues.getSaldoPendiente()).isEqualByComparingTo("800.00");
        assertThat(despues.getEstado()).isEqualTo(EstadoCuentaPorPagar.PENDIENTE);
    }

    // ------------------------------------------------------------------
    // 8. Devolución parcial + pago del resto → PAGADA
    // ------------------------------------------------------------------

    @Test
    @DisplayName("8. Devolución parcial + pago del resto → saldo 0 y PAGADA")
    void devolucionParcialMasPagoRestoDejaPagada() {
        Producto producto = crearProducto("CxP Dev+Pago", new BigDecimal("100.00"), new BigDecimal("40.00"), 0);
        // 10 × 100 = 1000
        CompraResponseDTO compra = comprarCredito(producto, 10, new BigDecimal("100.00"), 30);

        devolverUnidades(compra, 3); // −300 → pendiente 700

        CuentaPorPagarResponseDTO mid = cxpService.obtenerPorCompraId(compra.getId());
        assertThat(mid.getSaldoPendiente()).isEqualByComparingTo("700.00");

        PagoCxPRequestDTO pago = new PagoCxPRequestDTO();
        pago.setValor(new BigDecimal("700.00"));
        pago.setMetodoPago(MetodoPagoCxP.TRANSFERENCIA);

        CuentaPorPagarResponseDTO fin = cxpService.registrarPago(mid.getId(), pago, USUARIO_TEST);
        assertThat(fin.getSaldoPendiente()).isEqualByComparingTo("0.00");
        assertThat(fin.getEstado()).isEqualTo(EstadoCuentaPorPagar.PAGADA);
        assertThat(fin.getTotalDevoluciones()).isEqualByComparingTo("300.00");
        assertThat(fin.getTotalPagado()).isEqualByComparingTo("700.00");
    }

    // ------------------------------------------------------------------
    // 9. Flag vencida derivado
    // ------------------------------------------------------------------

    @Test
    @DisplayName("9. Flag vencida = true solo si ahora > fechaVencimiento y no PAGADA/ANULADA")
    void flagVencidaDerivado() {
        Producto producto = crearProducto("CxP Vencida", new BigDecimal("40.00"), new BigDecimal("15.00"), 0);
        Proveedor proveedor = crearProveedor("Prov Vencida");
        proveedor.setCondicionPago(CondicionPagoProveedor.CREDITO);
        proveedor.setDiasCredito(30);
        proveedorRepository.save(proveedor);

        CompraRequestDTO request = baseCompra(proveedor.getId(), producto, 2, new BigDecimal("15.00"));
        request.setCondicionPagoAplicada(CondicionPagoProveedor.CREDITO);
        request.setDiasCreditoAplicados(30);
        request.setFechaVencimiento(LocalDateTime.now().minusDays(2));
        CompraResponseDTO creada = compraService.crear(request, USUARIO_TEST);
        CompraResponseDTO compra = compraService.completar(creada.getId(), USUARIO_TEST);

        CuentaPorPagarResponseDTO abierta = cxpService.obtenerPorCompraId(compra.getId());
        assertThat(abierta.getEstado()).isEqualTo(EstadoCuentaPorPagar.PENDIENTE);
        assertThat(abierta.isVencida()).isTrue();

        PagoCxPRequestDTO pago = new PagoCxPRequestDTO();
        pago.setValor(abierta.getSaldoPendiente());
        pago.setMetodoPago(MetodoPagoCxP.EFECTIVO);
        CuentaPorPagarResponseDTO pagada = cxpService.registrarPago(abierta.getId(), pago, USUARIO_TEST);

        assertThat(pagada.getEstado()).isEqualTo(EstadoCuentaPorPagar.PAGADA);
        assertThat(pagada.isVencida()).isFalse();
    }

    // ------------------------------------------------------------------
    // 10. Cancelar compra PENDIENTE → no hay CxP
    // ------------------------------------------------------------------

    @Test
    @DisplayName("10. Compra CREDITO cancelada en PENDIENTE → no existe CxP")
    void compraCreditoCanceladaPendienteNoCreaCxp() {
        Producto producto = crearProducto("CxP Cancel", new BigDecimal("50.00"), new BigDecimal("20.00"), 0);
        Proveedor proveedor = crearProveedor("Prov Cancel CxP");
        proveedor.setCondicionPago(CondicionPagoProveedor.CREDITO);
        proveedor.setDiasCredito(10);
        proveedorRepository.save(proveedor);

        CompraRequestDTO request = baseCompra(proveedor.getId(), producto, 1, new BigDecimal("20.00"));
        request.setCondicionPagoAplicada(CondicionPagoProveedor.CREDITO);
        request.setDiasCreditoAplicados(10);
        CompraResponseDTO creada = compraService.crear(request, USUARIO_TEST);
        compraService.cancelar(creada.getId());

        assertThat(cuentaPorPagarRepository.findByCompraId(creada.getId())).isEmpty();
    }

    // ------------------------------------------------------------------
    // Domain validation (anti-enmascaramiento)
    // ------------------------------------------------------------------

    @Test
    @DisplayName("QA: devoluciones > saldo_inicial → BusinessException (antes del clamp)")
    void dominioRechazaDevolucionesSobreObligacion() {
        Producto producto = crearProducto("CxP Dom Dev", new BigDecimal("30.00"), new BigDecimal("10.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 1, new BigDecimal("10.00"), 5);
        CuentaPorPagar entity = cuentaPorPagarRepository.findByCompraId(compra.getId()).orElseThrow();

        entity.setTotalDevoluciones(entity.getSaldoInicial().add(new BigDecimal("1.00")));

        assertThatThrownBy(() -> cxpService.recalcularSaldosYEstado(entity))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Las devoluciones superan la obligación inicial");
    }

    @Test
    @DisplayName("QA: total_pagado > obligacion_neta → BusinessException (antes del clamp)")
    void dominioRechazaPagosSobreObligacionNeta() {
        Producto producto = crearProducto("CxP Dom Pago", new BigDecimal("30.00"), new BigDecimal("10.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 2, new BigDecimal("10.00"), 5);
        CuentaPorPagar entity = cuentaPorPagarRepository.findByCompraId(compra.getId()).orElseThrow();

        // obligacion_neta = 20 - 10 = 10; total_pagado = 11 → inválido
        entity.setTotalDevoluciones(new BigDecimal("10.00"));
        entity.setTotalPagado(new BigDecimal("11.00"));

        assertThatThrownBy(() -> cxpService.recalcularSaldosYEstado(entity))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Los pagos superan la obligación neta actual");
    }

    @Test
    @DisplayName("Listado paginado filtra por proveedor")
    void listadoPaginado() {
        Producto producto = crearProducto("CxP Lista", new BigDecimal("10.00"), new BigDecimal("4.00"), 0);
        CompraResponseDTO compra = comprarCredito(producto, 1, new BigDecimal("4.00"), 5);
        CuentaPorPagarResponseDTO cxp = cxpService.obtenerPorCompraId(compra.getId());

        var page = cxpService.listar(cxp.getProveedorId(), null, null, PageRequest.of(0, 10));
        assertThat(page.getContent()).isNotEmpty();
        assertThat(page.getContent().get(0).getProveedorId()).isEqualTo(cxp.getProveedorId());
    }

    private void devolverUnidades(CompraResponseDTO compra, int cantidad) {
        DevolucionCompraRequestDTO req = new DevolucionCompraRequestDTO();
        DevolucionLineaDTO linea = new DevolucionLineaDTO();
        linea.setDetalleId(compra.getDetalles().get(0).getId());
        linea.setCantidad(cantidad);
        req.setLineas(List.of(linea));
        devolucionCompraService.registrar(compra.getId(), req, USUARIO_TEST);
    }

    private CompraResponseDTO comprarCredito(Producto producto, int cantidad, BigDecimal costo, int dias) {
        Proveedor proveedor = crearProveedor("Prov CxP " + System.nanoTime() % 100_000);
        proveedor.setCondicionPago(CondicionPagoProveedor.CREDITO);
        proveedor.setDiasCredito(dias);
        proveedorRepository.save(proveedor);

        CompraRequestDTO request = baseCompra(proveedor.getId(), producto, cantidad, costo);
        request.setCondicionPagoAplicada(CondicionPagoProveedor.CREDITO);
        request.setDiasCreditoAplicados(dias);
        CompraResponseDTO creada = compraService.crear(request, USUARIO_TEST);
        return compraService.completar(creada.getId(), USUARIO_TEST);
    }

    private CompraRequestDTO baseCompra(Long proveedorId, Producto producto, int cantidad, BigDecimal costo) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costo);

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedorId);
        request.setDetalles(List.of(detalle));
        return request;
    }
}
