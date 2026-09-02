package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.ProductoService;

/**
 * Verifica la regla de trazabilidad de stock y la semántica de costo desconocido
 * heredada de los productos migrados.
 */
class ProductoStockReglaTest extends ComercialTestSupport {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("El stock inicial se registra como movimiento CARGA_INICIAL")
    void stockInicialGeneraMovimiento() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO producto = productoService.crear(
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("600.00"), 7), USUARIO_TEST);

        assertThat(producto.getStockActual()).isEqualTo(7);
        assertThat(inventarioService.listarMovimientos(
                producto.getId(), TipoMovimientoInventario.CARGA_INICIAL, null, null)).hasSize(1);
    }

    @Test
    @DisplayName("Actualizar el producto no permite modificar el stock directamente")
    void actualizarNoPermiteCambiarStock() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO producto = productoService.crear(
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("600.00"), 5), USUARIO_TEST);

        ProductoRequestDTO cambioDeStock =
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("600.00"), 99);

        assertThatThrownBy(() -> productoService.actualizar(producto.getId(), cambioDeStock))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ajuste de inventario");

        assertThat(stockDe(producto.getId())).isEqualTo(5);
    }

    @Test
    @DisplayName("Actualizar datos maestros sin tocar el stock es válido")
    void actualizarDatosMaestrosMantieneStock() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO producto = productoService.crear(
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("600.00"), 5), USUARIO_TEST);

        // Reenviar el costo vigente sin cambios es válido: el cliente puede mandar el objeto completo.
        ProductoRequestDTO cambio =
            request(categoria.getId(), new BigDecimal("1300.00"), new BigDecimal("600.00"), null);
        cambio.setNombre("Nombre actualizado");

        ProductoResponseDTO actualizado = productoService.actualizar(producto.getId(), cambio);

        assertThat(actualizado.getNombre()).isEqualTo("Nombre actualizado");
        assertThat(actualizado.getPrecioVentaActual()).isEqualByComparingTo("1300.00");
        assertThat(actualizado.getStockActual()).isEqualTo(5);
        assertThat(actualizado.getCostoActual()).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("Actualizar el producto no permite modificar el costo directamente")
    void actualizarNoPermiteCambiarCosto() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO producto = productoService.crear(
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("600.00"), 5), USUARIO_TEST);

        ProductoRequestDTO cambioDeCosto =
            request(categoria.getId(), new BigDecimal("1000.00"), new BigDecimal("900.00"), null);

        assertThatThrownBy(() -> productoService.actualizar(producto.getId(), cambioDeCosto))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ajustes/costo");

        assertThat(costoDe(producto.getId())).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("Un producto migrado sin costo reporta costo desconocido, no costo cero")
    void productoSinCostoReportaCostoDesconocido() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO producto = productoService.crear(
            request(categoria.getId(), new BigDecimal("1000.00"), null, 3), USUARIO_TEST);

        assertThat(producto.getCostoActual()).isNull();
        assertThat(producto.isCostoConocido()).isFalse();
        assertThat(productoRepository.findByCostoActualIsNull()).hasSize(1);
    }

    @Test
    @DisplayName("Los valores migrados de precio y stock se conservan en los campos nuevos")
    void migracionConservaPrecioYStock() {
        // Simula el resultado de la migración SQL: precio -> precioVentaActual, cantidadStock -> stockActual
        BigDecimal precioLegado = new BigDecimal("850000.00");
        int stockLegado = 12;

        var producto = crearProducto("Producto legado", precioLegado, null, stockLegado);

        ProductoResponseDTO resultado = productoService.obtenerPorId(producto.getId());

        assertThat(resultado.getPrecioVentaActual()).isEqualByComparingTo(precioLegado);
        assertThat(resultado.getStockActual()).isEqualTo(stockLegado);
        assertThat(resultado.isCostoConocido()).isFalse();
    }

    private ProductoRequestDTO request(
            Long categoriaId, BigDecimal precio, BigDecimal costo, Integer stockInicial) {

        ProductoRequestDTO request = new ProductoRequestDTO();
        request.setNombre("Producto de prueba");
        request.setMarca("Marca");
        request.setCategoriaId(categoriaId);
        request.setPrecioVentaActual(precio);
        request.setCostoActual(costo);
        request.setStockInicial(stockInicial);
        return request;
    }
}
