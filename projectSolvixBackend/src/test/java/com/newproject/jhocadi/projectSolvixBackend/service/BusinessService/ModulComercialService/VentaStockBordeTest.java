package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class VentaStockBordeTest extends ComercialTestSupport {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private InventarioService inventarioService;

    @ParameterizedTest(name = "stock {0} / venta {1} → permitida")
    @CsvSource({ "1,1", "2,1", "2,2" })
    void ventaDentroDelStockSeCompleta(int stock, int cantidad) {
        Producto producto = crearProducto("Borde " + stock + "-" + cantidad,
            new BigDecimal("1000.00"), new BigDecimal("600.00"), stock);

        VentaResponseDTO creada = ventaService.crear(request(producto.getId(), cantidad), USUARIO_TEST);
        VentaResponseDTO completada = ventaService.completar(creada.getId(), USUARIO_TEST);

        assertThat(completada.getEstado()).isEqualTo(EstadoVenta.COMPLETADA);
        assertThat(stockDe(producto.getId())).isEqualTo(stock - cantidad);

        List<MovimientoInventarioResponseDTO> movimientos = inventarioService.listarMovimientos(
            producto.getId(), TipoMovimientoInventario.VENTA, null, null);
        assertThat(movimientos).hasSize(1);
        MovimientoInventarioResponseDTO mov = movimientos.get(0);
        assertThat(mov.getCantidad()).isEqualTo(cantidad);
        assertThat(mov.getStockAnterior()).isEqualTo(stock);
        assertThat(mov.getStockNuevo()).isEqualTo(stock - cantidad);
    }

    @ParameterizedTest(name = "stock {0} / venta {1} → rechazada")
    @CsvSource({ "1,2", "2,3", "0,1" })
    void ventaSobreElStockSeRechazaSinMoverInventario(int stock, int cantidad) {
        Producto producto = crearProducto("Exceso " + stock + "-" + cantidad,
            new BigDecimal("1000.00"), new BigDecimal("600.00"), stock);

        VentaResponseDTO creada = ventaService.crear(request(producto.getId(), cantidad), USUARIO_TEST);

        assertThatThrownBy(() -> ventaService.completar(creada.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Stock insuficiente")
            .hasMessageContaining("Disponible: " + stock)
            .hasMessageContaining("requerido: " + cantidad);

        assertThat(stockDe(producto.getId())).isEqualTo(stock);
        assertThat(inventarioService.listarMovimientos(producto.getId(), null, null, null)).isEmpty();
        assertThat(ventaService.obtenerPorId(creada.getId()).getEstado()).isEqualTo(EstadoVenta.PENDIENTE);
    }

    private VentaRequestDTO request(Long productoId, int cantidad) {
        DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
        detalle.setProductoId(productoId);
        detalle.setCantidad(cantidad);
        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(List.of(detalle));
        return request;
    }
}
