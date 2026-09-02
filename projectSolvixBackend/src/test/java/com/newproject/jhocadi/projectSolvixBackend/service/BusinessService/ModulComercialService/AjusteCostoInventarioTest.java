package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteInventarioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoAjusteCosto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * Gobierno del costo vigente: quién puede cambiarlo, qué rastro deja y cómo queda registrado
 * en el libro de inventario para poder valorar existencias en fechas pasadas.
 */
class AjusteCostoInventarioTest extends ComercialTestSupport {

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private CompraService compraService;

    @Test
    @DisplayName("Completar una compra actualiza el costo mediante la política de costeo")
    void compraActualizaCostoConLaPolitica() {
        Producto producto = crearProducto("Producto A", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        comprar(producto, 5, new BigDecimal("850.00"));

        // Política de último costo: el costo vigente pasa a ser el de la compra más reciente.
        assertThat(costoDe(producto.getId())).isEqualByComparingTo("850.00");
    }

    @Test
    @DisplayName("El movimiento de compra guarda el costo que quedó vigente tras la política")
    void movimientoRegistraCostoProductoResultante() {
        Producto producto = crearProducto("Producto B", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        comprar(producto, 5, new BigDecimal("850.00"));

        MovimientoInventarioResponseDTO movimiento = movimientoUnico(
            producto.getId(), TipoMovimientoInventario.COMPRA);

        // El costo de la operación y el costo resultante del producto son magnitudes distintas
        // que aquí coinciden porque la política vigente es último costo.
        assertThat(movimiento.getCostoUnitario()).isEqualByComparingTo("850.00");
        assertThat(movimiento.getCostoProductoResultante()).isEqualByComparingTo("850.00");
    }

    @Test
    @DisplayName("Un ajuste de inventario sin costo de operación conserva el costo vigente del producto")
    void ajusteDeInventarioConservaCostoResultante() {
        Producto producto = crearProducto("Producto C", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        ajustarInventario(producto, TipoMovimientoInventario.MERMA, 2);

        MovimientoInventarioResponseDTO movimiento = movimientoUnico(
            producto.getId(), TipoMovimientoInventario.MERMA);

        // No se inventa un costo para la merma, pero el costo del producto sí se conoce.
        assertThat(movimiento.getCostoUnitario()).isNull();
        assertThat(movimiento.getCostoProductoResultante()).isEqualByComparingTo("600.00");
        assertThat(stockDe(producto.getId())).isEqualTo(8);
    }

    @Test
    @DisplayName("Si el costo vigente tampoco se conoce, el movimiento lo deja en NULL")
    void movimientoSinCostoConocidoConservaNull() {
        Producto producto = crearProducto("Producto D", new BigDecimal("1000.00"), null, 10);

        ajustarInventario(producto, TipoMovimientoInventario.AJUSTE_SALIDA, 3);

        MovimientoInventarioResponseDTO movimiento = movimientoUnico(
            producto.getId(), TipoMovimientoInventario.AJUSTE_SALIDA);

        assertThat(movimiento.getCostoUnitario()).isNull();
        assertThat(movimiento.getCostoProductoResultante()).isNull();
    }

    @Test
    @DisplayName("El ajuste de costo explícito actualiza el costo vigente del producto")
    void ajusteDeCostoActualizaElCosto() {
        Producto producto = crearProducto("Producto E", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        AjusteCostoResponseDTO ajuste = ajustarCosto(producto, new BigDecimal("720.00"));

        assertThat(costoDe(producto.getId())).isEqualByComparingTo("720.00");
        assertThat(ajuste.getCostoAnterior()).isEqualByComparingTo("600.00");
        assertThat(ajuste.getCostoNuevo()).isEqualByComparingTo("720.00");
        assertThat(ajuste.getCostoProductoResultante()).isEqualByComparingTo("720.00");
    }

    @Test
    @DisplayName("El ajuste de costo no mueve stock ni genera movimiento de inventario")
    void ajusteDeCostoNoCambiaStock() {
        Producto producto = crearProducto("Producto F", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        AjusteCostoResponseDTO ajuste = ajustarCosto(producto, new BigDecimal("720.00"));

        assertThat(stockDe(producto.getId())).isEqualTo(10);
        assertThat(ajuste.getStockAlAjustar()).isEqualTo(10);
        // El libro de inventario registra unidades: una corrección de precio no le corresponde.
        assertThat(inventarioService.listarMovimientos(producto.getId(), null, null, null)).isEmpty();
    }

    @Test
    @DisplayName("El ajuste de costo queda auditado con motivo, usuario y fecha")
    void ajusteDeCostoQuedaAuditado() {
        Producto producto = crearProducto("Producto G", new BigDecimal("1000.00"), null, 10);

        ajustarCosto(producto, new BigDecimal("450.00"));

        List<AjusteCostoResponseDTO> historial = inventarioService.listarAjustesCosto(producto.getId());

        assertThat(historial).hasSize(1);
        AjusteCostoResponseDTO ajuste = historial.get(0);
        assertThat(ajuste.getProductoId()).isEqualTo(producto.getId());
        // El producto no tenía costo conocido: se registra como NULL, no como cero.
        assertThat(ajuste.getCostoAnterior()).isNull();
        assertThat(ajuste.getMotivo()).isEqualTo(MotivoAjusteCosto.CORRECCION_ERROR);
        assertThat(ajuste.getUsuarioRegistro()).isEqualTo(USUARIO_TEST);
        assertThat(ajuste.getFecha()).isNotNull();
        assertThat(ajuste.getObservaciones()).isEqualTo("Ajuste de prueba.");
    }

    @Test
    @DisplayName("Ajustar al mismo costo vigente se rechaza: no hay nada que corregir")
    void ajusteDeCostoSinCambioSeRechaza() {
        Producto producto = crearProducto("Producto H", new BigDecimal("1000.00"), new BigDecimal("600.00"), 10);

        assertThatThrownBy(() -> ajustarCosto(producto, new BigDecimal("600.00")))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ya está vigente");

        assertThat(inventarioService.listarAjustesCosto(producto.getId())).isEmpty();
    }

    private AjusteCostoResponseDTO ajustarCosto(Producto producto, BigDecimal costoNuevo) {
        AjusteCostoRequestDTO request = new AjusteCostoRequestDTO();
        request.setProductoId(producto.getId());
        request.setCostoNuevo(costoNuevo);
        request.setMotivo(MotivoAjusteCosto.CORRECCION_ERROR);
        request.setObservaciones("Ajuste de prueba.");

        return inventarioService.registrarAjusteCosto(request, USUARIO_TEST);
    }

    private void ajustarInventario(Producto producto, TipoMovimientoInventario tipo, int cantidad) {
        AjusteInventarioRequestDTO request = new AjusteInventarioRequestDTO();
        request.setProductoId(producto.getId());
        request.setTipo(tipo);
        request.setCantidad(cantidad);

        inventarioService.registrarAjuste(request, USUARIO_TEST);
    }

    private CompraResponseDTO comprar(Producto producto, int cantidad, BigDecimal costoUnitario) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costoUnitario);

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(crearProveedor("Proveedor de " + producto.getNombre()).getId());
        request.setDetalles(List.of(detalle));

        CompraResponseDTO creada = compraService.crear(request, USUARIO_TEST);
        return compraService.completar(creada.getId(), USUARIO_TEST);
    }

    private MovimientoInventarioResponseDTO movimientoUnico(Long productoId, TipoMovimientoInventario tipo) {
        List<MovimientoInventarioResponseDTO> movimientos =
            inventarioService.listarMovimientos(productoId, tipo, null, null);
        assertThat(movimientos).hasSize(1);
        return movimientos.get(0);
    }
}
