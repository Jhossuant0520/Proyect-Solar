package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteInventarioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DireccionMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class InventarioServiceTest extends ComercialTestSupport {

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("Una entrada aumenta el stock y registra stockAnterior/stockNuevo")
    void entradaRegistraStockAnteriorYNuevo() {
        Producto producto = crearProducto("Producto A", new BigDecimal("100.00"), new BigDecimal("60.00"), 10);

        inventarioService.registrarMovimiento(
            producto, TipoMovimientoInventario.AJUSTE_ENTRADA, 5,
            ReferenciaMovimiento.AJUSTE_MANUAL, null, null, USUARIO_TEST, "alta manual");

        assertThat(stockDe(producto.getId())).isEqualTo(15);

        List<MovimientoInventarioResponseDTO> movimientos =
            inventarioService.listarMovimientos(producto.getId(), null, null, null);

        assertThat(movimientos).hasSize(1);
        MovimientoInventarioResponseDTO movimiento = movimientos.get(0);
        assertThat(movimiento.getStockAnterior()).isEqualTo(10);
        assertThat(movimiento.getStockNuevo()).isEqualTo(15);
        assertThat(movimiento.getDireccion()).isEqualTo(DireccionMovimiento.ENTRADA);
        assertThat(movimiento.getCostoUnitario()).isNull();
        assertThat(movimiento.getCostoProductoResultante()).isEqualByComparingTo("60.00");
        assertThat(movimiento.getUsuarioRegistro()).isEqualTo(USUARIO_TEST);
    }

    @Test
    @DisplayName("Una salida con stock insuficiente falla y no altera el inventario")
    void salidaConStockInsuficienteFalla() {
        Producto producto = crearProducto("Producto B", new BigDecimal("100.00"), new BigDecimal("60.00"), 3);

        assertThatThrownBy(() -> inventarioService.registrarMovimiento(
                producto, TipoMovimientoInventario.VENTA, 5,
                ReferenciaMovimiento.VENTA, null, null, USUARIO_TEST, null))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Stock insuficiente");

        assertThat(stockDe(producto.getId())).isEqualTo(3);
        assertThat(inventarioService.listarMovimientos(producto.getId(), null, null, null)).isEmpty();
    }

    @Test
    @DisplayName("La merma descuenta stock y queda registrada")
    void mermaDescuentaStock() {
        Producto producto = crearProducto("Producto C", new BigDecimal("100.00"), new BigDecimal("60.00"), 8);

        AjusteInventarioRequestDTO request = new AjusteInventarioRequestDTO();
        request.setProductoId(producto.getId());
        request.setTipo(TipoMovimientoInventario.MERMA);
        request.setCantidad(3);
        request.setObservaciones("Unidades dañadas");

        MovimientoInventarioResponseDTO movimiento = inventarioService.registrarAjuste(request, USUARIO_TEST);

        assertThat(movimiento.getDireccion()).isEqualTo(DireccionMovimiento.SALIDA);
        assertThat(movimiento.getStockNuevo()).isEqualTo(5);
        assertThat(stockDe(producto.getId())).isEqualTo(5);
    }

    @Test
    @DisplayName("Los ajustes manuales no aceptan tipos reservados a documentos de negocio")
    void ajusteRechazaTiposDeDocumento() {
        Producto producto = crearProducto("Producto D", new BigDecimal("100.00"), new BigDecimal("60.00"), 8);

        AjusteInventarioRequestDTO request = new AjusteInventarioRequestDTO();
        request.setProductoId(producto.getId());
        request.setTipo(TipoMovimientoInventario.COMPRA);
        request.setCantidad(2);

        assertThatThrownBy(() -> inventarioService.registrarAjuste(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("AJUSTE_ENTRADA");

        assertThat(stockDe(producto.getId())).isEqualTo(8);
    }

    @Test
    @DisplayName("Una cantidad no positiva es rechazada")
    void cantidadInvalidaEsRechazada() {
        Producto producto = crearProducto("Producto E", new BigDecimal("100.00"), new BigDecimal("60.00"), 8);

        assertThatThrownBy(() -> inventarioService.registrarMovimiento(
                producto, TipoMovimientoInventario.AJUSTE_ENTRADA, 0,
                ReferenciaMovimiento.AJUSTE_MANUAL, null, null, USUARIO_TEST, null))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("mayor que cero");
    }
}
