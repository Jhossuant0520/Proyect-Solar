package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class ProductoCodigoBarrasTest extends ComercialTestSupport {

    @Autowired
    private ProductoService productoService;

    @Test
    @DisplayName("Se puede crear un producto con código de barras")
    void crearConCodigoBarras() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO request = requestBase(categoria.getId());
        request.setCodigoBarras("7701234567890");

        ProductoResponseDTO creado = productoService.crear(request, USUARIO_TEST);

        assertThat(creado.getCodigoBarras()).isEqualTo("7701234567890");
        assertThat(productoService.obtenerPorCodigoBarras("7701234567890").getId())
            .isEqualTo(creado.getId());
    }

    @Test
    @DisplayName("Se puede crear un producto sin código de barras")
    void crearSinCodigoBarras() {
        CategoriaProducto categoria = crearCategoria();

        ProductoResponseDTO creado = productoService.crear(requestBase(categoria.getId()), USUARIO_TEST);

        assertThat(creado.getCodigoBarras()).isNull();
    }

    @Test
    @DisplayName("El código de barras vacío se guarda como null")
    void codigoVacioSeNormalizaANull() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO request = requestBase(categoria.getId());
        request.setCodigoBarras("   ");

        ProductoResponseDTO creado = productoService.crear(request, USUARIO_TEST);

        assertThat(creado.getCodigoBarras()).isNull();
    }

    @Test
    @DisplayName("Conserva ceros a la izquierda del código de barras")
    void conservaCerosIniciales() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO request = requestBase(categoria.getId());
        request.setCodigoBarras("07701234567890");

        ProductoResponseDTO creado = productoService.crear(request, USUARIO_TEST);

        assertThat(creado.getCodigoBarras()).isEqualTo("07701234567890");
    }

    @Test
    @DisplayName("Rechaza un código de barras duplicado al crear")
    void rechazaDuplicadoAlCrear() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO primero = requestBase(categoria.getId());
        primero.setNombre("Cámara H9C");
        primero.setCodigoBarras("7701234567890");
        productoService.crear(primero, USUARIO_TEST);

        ProductoRequestDTO segundo = requestBase(categoria.getId());
        segundo.setNombre("Otro producto");
        segundo.setCodigoBarras("7701234567890");

        assertThatThrownBy(() -> productoService.crear(segundo, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Ya existe un producto con este código de barras.");
    }

    @Test
    @DisplayName("Rechaza un código de barras duplicado al actualizar")
    void rechazaDuplicadoAlActualizar() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO primero = requestBase(categoria.getId());
        primero.setCodigoBarras("7701111111111");
        productoService.crear(primero, USUARIO_TEST);

        ProductoRequestDTO segundo = requestBase(categoria.getId());
        segundo.setNombre("Producto B");
        ProductoResponseDTO b = productoService.crear(segundo, USUARIO_TEST);

        ProductoRequestDTO cambio = requestBase(categoria.getId());
        cambio.setNombre("Producto B");
        cambio.setCodigoBarras("7701111111111");

        assertThatThrownBy(() -> productoService.actualizar(b.getId(), cambio))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Ya existe un producto con este código de barras.");
    }

    @Test
    @DisplayName("Permite quitar el código de barras dejándolo vacío")
    void permiteQuitarCodigoBarras() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO crear = requestBase(categoria.getId());
        crear.setCodigoBarras("7709999999999");
        ProductoResponseDTO producto = productoService.crear(crear, USUARIO_TEST);

        ProductoRequestDTO actualizar = requestBase(categoria.getId());
        actualizar.setCodigoBarras("");
        ProductoResponseDTO actualizado = productoService.actualizar(producto.getId(), actualizar);

        assertThat(actualizado.getCodigoBarras()).isNull();
    }

    @Test
    @DisplayName("Permite varios productos sin código de barras")
    void permiteVariosSinCodigo() {
        CategoriaProducto categoria = crearCategoria();

        ProductoRequestDTO a = requestBase(categoria.getId());
        a.setNombre("Sin código A");
        ProductoRequestDTO b = requestBase(categoria.getId());
        b.setNombre("Sin código B");

        assertThat(productoService.crear(a, USUARIO_TEST).getCodigoBarras()).isNull();
        assertThat(productoService.crear(b, USUARIO_TEST).getCodigoBarras()).isNull();
    }

    @Test
    @DisplayName("Buscar por código inexistente responde no encontrado")
    void buscarCodigoInexistente() {
        assertThatThrownBy(() -> productoService.obtenerPorCodigoBarras("0000000000000"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("404");
    }

    private ProductoRequestDTO requestBase(Long categoriaId) {
        ProductoRequestDTO request = new ProductoRequestDTO();
        request.setNombre("Producto de prueba");
        request.setMarca("Marca");
        request.setCategoriaId(categoriaId);
        request.setPrecioVentaActual(new BigDecimal("1000.00"));
        request.setCostoActual(new BigDecimal("600.00"));
        request.setStockInicial(0);
        return request;
    }
}
