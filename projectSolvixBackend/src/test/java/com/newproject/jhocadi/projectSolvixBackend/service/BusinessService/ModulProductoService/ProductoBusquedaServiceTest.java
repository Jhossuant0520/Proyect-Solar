package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoListadoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.InventarioService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.VentaService;

class ProductoBusquedaServiceTest extends ComercialTestSupport {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private VentaService ventaService;

    @Autowired
    private InventarioService inventarioService;

    @Test
    @DisplayName("q busca por cada palabra en nombre/marca/código y limite acota resultados")
    void busquedaPorTextoConLimite() {
        crearProducto("Pantalla LCD Lenovo X", bd("180000"), bd("100000"), 2);
        crearProducto("Pantalla Lenovo Y", bd("160000"), bd("90000"), 0);
        crearProducto("Teclado HP", bd("60000"), bd("30000"), 5);
        for (int i = 0; i < 30; i++) {
            crearProducto("Cable genérico " + i, bd("5000"), bd("2000"), 1);
        }

        List<ProductoListadoResponseDTO> lenovo = productoService.listar(
            "pantalla lenovo", 10, null, null, null, null, null, true);
        assertThat(lenovo).extracting(ProductoListadoResponseDTO::getNombre)
            .containsExactly("Pantalla LCD Lenovo X", "Pantalla Lenovo Y");

        List<ProductoListadoResponseDTO> limitados = productoService.listar(
            "cable", 20, null, null, null, null, null, true);
        assertThat(limitados).hasSize(20);

        List<ProductoListadoResponseDTO> tope = productoService.listar(
            null, 500, null, null, null, null, null, true);
        assertThat(tope).hasSize(33);

        assertThat(productoService.listar(
            "inexistente", 20, null, null, null, null, null, true)).isEmpty();

        assertThat(productoService.listar(null, null, null, null, null, true)).hasSize(33);

        // D.3: preview sin q textual acota a máximo 5
        assertThat(productoService.listar("", 5, null, null, null, null, null, true)).hasSize(5);
        assertThat(productoService.listar(null, 5, null, null, null, null, null, true)).hasSize(5);
    }

    @Test
    @DisplayName("producto único creado con stock inicial 1 queda disponible para búsqueda")
    void productoUnicoConStockInicial() {
        crearCategoria();
        ProductoRequestDTO request = new ProductoRequestDTO();
        request.setNombre("Tarjeta especial XYZ");
        request.setMarca("Genérica");
        request.setCategoriaId(categoriaRepository.findAll().get(0).getId());
        request.setPrecioVentaActual(bd("250000"));
        request.setStockInicial(1);

        ProductoResponseDTO creado = productoService.crear(request, USUARIO_TEST);

        assertThat(stockDe(creado.getId())).isEqualTo(1);
        assertThat(productoService.listar("xyz", 10, null, null, null, null, null, true))
            .extracting(ProductoListadoResponseDTO::getId)
            .containsExactly(creado.getId());
    }

    @Test
    @DisplayName("listado no expone costo; detalle sí incluye costoActual")
    void listadoSinCostoDetalleConCosto() {
        ProductoResponseDTO creado = productoService.crear(requestProducto("Panel solar", 3), USUARIO_TEST);

        ProductoListadoResponseDTO listado = productoService.listar(
            "panel solar", 10, null, null, null, null, null, true).get(0);
        assertThat(listado.getId()).isEqualTo(creado.getId());
        assertThat(listado.getPrecioVentaActual()).isEqualByComparingTo("250000");
        // El DTO de listado no tiene accessors de costo.
        assertThat(listado.getClass().getDeclaredFields())
            .extracting(java.lang.reflect.Field::getName)
            .doesNotContain("costoActual", "costoConocido");

        ProductoResponseDTO detalle = productoService.obtenerPorId(creado.getId());
        assertThat(detalle.getCostoActual()).isEqualByComparingTo("150000");
        assertThat(detalle.isCostoConocido()).isTrue();
    }

    @Test
    @DisplayName("CASO A: producto creado con stock inicial 1 se vende completo y queda en 0")
    void productoConStockInicialUnoSeVende() {
        ProductoResponseDTO creado = productoService.crear(requestProducto("Disco único", 1), USUARIO_TEST);

        DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
        detalle.setProductoId(creado.getId());
        detalle.setCantidad(1);
        VentaRequestDTO venta = new VentaRequestDTO();
        venta.setDetalles(List.of(detalle));

        VentaResponseDTO creada = ventaService.crear(venta, USUARIO_TEST);
        VentaResponseDTO completada = ventaService.completar(creada.getId(), USUARIO_TEST);

        assertThat(completada.getEstado()).isEqualTo(EstadoVenta.COMPLETADA);
        assertThat(stockDe(creado.getId())).isZero();
        MovimientoInventarioResponseDTO salida = inventarioService
            .listarMovimientos(creado.getId(), TipoMovimientoInventario.VENTA, null, null).get(0);
        assertThat(salida.getStockAnterior()).isEqualTo(1);
        assertThat(salida.getStockNuevo()).isZero();
    }

    @Test
    @DisplayName("Desactivar conserva el producto (sin borrado físico) y activar lo habilita de nuevo")
    void desactivarYActivar() {
        ProductoResponseDTO creado = productoService.crear(requestProducto("Mouse", 2), USUARIO_TEST);

        assertThat(productoService.desactivar(creado.getId()).isActivo()).isFalse();
        assertThat(productoRepository.findById(creado.getId())).isPresent();
        assertThat(productoService.listar("mouse", 10, null, null, null, null, null, true)).isEmpty();

        DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
        detalle.setProductoId(creado.getId());
        detalle.setCantidad(1);
        VentaRequestDTO venta = new VentaRequestDTO();
        venta.setDetalles(List.of(detalle));
        assertThatThrownBy(() -> ventaService.crear(venta, USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("inactivo");

        assertThat(productoService.activar(creado.getId()).isActivo()).isTrue();
        assertThat(productoService.listar("mouse", 10, null, null, null, null, null, true)).hasSize(1);
        assertThat(stockDe(creado.getId())).isEqualTo(2);
    }

    private ProductoRequestDTO requestProducto(String nombre, int stockInicial) {
        if (categoriaRepository.findAll().isEmpty()) {
            crearCategoria();
        }
        ProductoRequestDTO request = new ProductoRequestDTO();
        request.setNombre(nombre);
        request.setMarca("Genérica");
        request.setCategoriaId(categoriaRepository.findAll().get(0).getId());
        request.setPrecioVentaActual(bd("250000"));
        request.setCostoActual(bd("150000"));
        request.setStockInicial(stockInicial);
        return request;
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }
}
