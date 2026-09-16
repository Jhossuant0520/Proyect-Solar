package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoCategoriaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.DisponibilidadCatalogo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class CatalogoServiceTest extends ComercialTestSupport {

    @Autowired
    private CatalogoService catalogoService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("El catálogo solo incluye productos activos")
    void listarSoloActivos() {
        Producto activo = crearProducto("Panel activo", new BigDecimal("100"), new BigDecimal("40"), 3);
        Producto inactivo = crearProducto("Panel oculto", new BigDecimal("100"), new BigDecimal("40"), 3);
        inactivo.setActivo(false);
        productoRepository.save(inactivo);

        List<CatalogoProductoResponseDTO> lista = catalogoService.listarProductos();

        assertThat(lista).extracting(CatalogoProductoResponseDTO::getId).containsExactly(activo.getId());
    }

    @Test
    @DisplayName("El DTO público no incluye costo, stock, código de barras ni fechas")
    void dtoPublicoSinCamposAdministrativos() throws Exception {
        Producto producto = crearProducto("Inversor", new BigDecimal("500"), new BigDecimal("220"), 2);
        producto.setCodigoBarras("7701112223334");
        producto.setDescripcion("Inversor 3 kW");
        producto.setImagenUrl("https://ejemplo.com/inversor.png");
        productoRepository.save(producto);

        CatalogoProductoResponseDTO dto = catalogoService.obtenerProducto(producto.getId());
        Map<String, Object> json = objectMapper.convertValue(dto, new TypeReference<>() {});

        assertThat(json.keySet()).containsExactlyInAnyOrder(
            "id", "nombre", "marca", "descripcion", "precioVentaActual",
            "imagenUrl", "categoriaId", "categoriaNombre", "disponibilidad");
        assertThat(json).doesNotContainKeys(
            "costoActual", "costoConocido", "stockActual", "codigoBarras",
            "fechaCreacion", "fechaActualizacion", "activo", "categoriaCodigo");
        assertThat(dto.getDisponibilidad()).isEqualTo(DisponibilidadCatalogo.DISPONIBLE);
        assertThat(dto.getPrecioVentaActual()).isEqualByComparingTo("500");
    }

    @Test
    @DisplayName("Disponibilidad es AGOTADO cuando el stock es cero, sin revelar el número")
    void disponibilidadAgotado() {
        Producto producto = crearProducto("Cable", new BigDecimal("20"), new BigDecimal("8"), 0);

        CatalogoProductoResponseDTO dto = catalogoService.obtenerProducto(producto.getId());

        assertThat(dto.getDisponibilidad()).isEqualTo(DisponibilidadCatalogo.AGOTADO);
    }

    @Test
    @DisplayName("Producto inactivo por ID responde 404 sin revelar que existe")
    void productoInactivo404() {
        Producto inactivo = crearProducto("Oculto", new BigDecimal("10"), new BigDecimal("4"), 1);
        inactivo.setActivo(false);
        productoRepository.save(inactivo);

        assertThatThrownBy(() -> catalogoService.obtenerProducto(inactivo.getId()))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("Producto inexistente responde 404")
    void productoInexistente404() {
        assertThatThrownBy(() -> catalogoService.obtenerProducto(999_999L))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("Categorías públicas solo incluyen activas y van ordenadas por nombre")
    void categoriasSoloActivasOrdenadas() {
        categoriaRepository.save(CategoriaProducto.builder()
            .codigo("ZULU").nombre("Zulu").activo(true).build());
        categoriaRepository.save(CategoriaProducto.builder()
            .codigo("ALFA").nombre("Alfa").activo(true).build());
        categoriaRepository.save(CategoriaProducto.builder()
            .codigo("BETA").nombre("Beta").activo(false).build());

        List<CatalogoCategoriaResponseDTO> categorias = catalogoService.listarCategorias();

        assertThat(categorias).extracting(CatalogoCategoriaResponseDTO::getNombre)
            .containsExactly("Alfa", "Zulu");
        assertThat(categorias).allSatisfy(item -> {
            assertThat(item.getId()).isNotNull();
            assertThat(item.getCodigo()).isNotBlank();
            assertThat(item.getNombre()).isNotBlank();
        });
    }
}
