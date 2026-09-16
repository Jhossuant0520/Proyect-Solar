package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CatalogoControllerSecurityTest extends ComercialTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/catalogo/productos funciona sin JWT")
    void catalogoProductosSinJwt() throws Exception {
        crearProducto("Panel público", new BigDecimal("100"), new BigDecimal("40"), 2);

        mockMvc.perform(get("/api/v1/catalogo/productos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nombre").value("Panel público"))
            .andExpect(jsonPath("$[0].disponibilidad").value("DISPONIBLE"))
            .andExpect(jsonPath("$[0].costoActual").doesNotExist())
            .andExpect(jsonPath("$[0].stockActual").doesNotExist())
            .andExpect(jsonPath("$[0].codigoBarras").doesNotExist())
            .andExpect(jsonPath("$[0].costoConocido").doesNotExist())
            .andExpect(jsonPath("$[0].activo").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/v1/catalogo/categorias funciona sin JWT")
    void catalogoCategoriasSinJwt() throws Exception {
        crearCategoria();

        mockMvc.perform(get("/api/v1/catalogo/categorias"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].codigo").value("GENERAL"))
            .andExpect(jsonPath("$[0].fechaCreacion").doesNotExist())
            .andExpect(jsonPath("$[0].activo").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/v1/catalogo/productos/{id} inactivo responde 404")
    void catalogoDetalleInactivo404() throws Exception {
        Producto inactivo = crearProducto("Oculto", new BigDecimal("10"), new BigDecimal("4"), 1);
        inactivo.setActivo(false);
        productoRepository.save(inactivo);

        mockMvc.perform(get("/api/v1/catalogo/productos/{id}", inactivo.getId()))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/productos sin JWT queda protegido")
    void productosAdminSinJwtRechazado() throws Exception {
        mockMvc.perform(get("/api/v1/productos"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/productos/{id} sin JWT queda protegido")
    void productoPorIdSinJwtRechazado() throws Exception {
        Producto producto = crearProducto("Admin", new BigDecimal("10"), new BigDecimal("4"), 1);

        mockMvc.perform(get("/api/v1/productos/{id}", producto.getId()))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/productos/codigo-barras/{codigo} sin JWT queda protegido")
    void codigoBarrasSinJwtRechazado() throws Exception {
        Producto producto = crearProducto("Con código", new BigDecimal("10"), new BigDecimal("4"), 1);
        producto.setCodigoBarras("7709998887776");
        productoRepository.save(producto);

        mockMvc.perform(get("/api/v1/productos/codigo-barras/{codigo}", "7709998887776"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/productos sin JWT queda protegido")
    void crearProductoSinJwtRechazado() throws Exception {
        mockMvc.perform(post("/api/v1/productos")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/productos sigue disponible para ADMIN")
    void productosAdminConRolAdmin() throws Exception {
        crearProducto("Solo admin", new BigDecimal("10"), new BigDecimal("4"), 1);

        mockMvc.perform(get("/api/v1/productos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].costoActual").exists())
            .andExpect(jsonPath("$[0].stockActual").exists());
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("GET /api/v1/productos rechaza rol USUARIO")
    void productosAdminConRolUsuarioRechazado() throws Exception {
        mockMvc.perform(get("/api/v1/productos"))
            .andExpect(status().isForbidden());
    }
}
