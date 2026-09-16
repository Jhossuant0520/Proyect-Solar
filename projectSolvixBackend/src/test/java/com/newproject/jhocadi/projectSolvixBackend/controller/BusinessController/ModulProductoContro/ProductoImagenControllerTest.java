package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.ProductoImagenService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.ProductoImagenServiceTest;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductoImagenControllerTest extends ComercialTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductoImagenService productoImagenService;

    @Value("${solvix.productos.imagenes-dir}")
    private String imagenesDir;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN puede subir imagen y actualizar imagenUrl")
    void adminSubeImagen() throws Exception {
        Producto producto = crearProducto("Cámara H9C", new BigDecimal("100"), new BigDecimal("40"), 1);
        MockMultipartFile file = ProductoImagenServiceTest.jpegFile("camara.jpg");

        MvcResult result = mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId()).file(file))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(producto.getId().intValue()))
            .andExpect(jsonPath("$.imagenUrl").value(org.hamcrest.Matchers.startsWith(
                ProductoImagenService.RUTA_PUBLICA_PREFIJO)))
            .andReturn();

        String imagenUrl = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.imagenUrl");
        String nombre = productoImagenService.extraerNombreLocal(imagenUrl);
        assertThat(Files.exists(Path.of(imagenesDir).resolve(nombre))).isTrue();
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("usuario no ADMIN recibe 403 al subir")
    void usuarioNoAdmin403() throws Exception {
        Producto producto = crearProducto("Sin permiso", new BigDecimal("10"), new BigDecimal("4"), 1);

        mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("a.jpg")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("subida sin JWT queda protegida")
    void subidaSinJwt() throws Exception {
        Producto producto = crearProducto("Anon", new BigDecimal("10"), new BigDecimal("4"), 1);

        mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("a.jpg")))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("producto inexistente responde 404")
    void productoInexistente() throws Exception {
        mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", 999999L)
                .file(ProductoImagenServiceTest.jpegFile("a.jpg")))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("MIME no permitido responde 400")
    void mimeNoPermitido() throws Exception {
        Producto producto = crearProducto("Bad mime", new BigDecimal("10"), new BigDecimal("4"), 1);
        MockMultipartFile file = new MockMultipartFile(
            "file", "x.txt", "text/plain", "hola".getBytes());

        mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId()).file(file))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("archivo vacío responde 400")
    void archivoVacio() throws Exception {
        Producto producto = crearProducto("Vacío", new BigDecimal("10"), new BigDecimal("4"), 1);
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId()).file(file))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("reemplazo elimina archivo local anterior")
    void reemplazoImagenLocal() throws Exception {
        Producto producto = crearProducto("Reemplazo", new BigDecimal("10"), new BigDecimal("4"), 1);

        MvcResult primero = mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("uno.jpg")))
            .andExpect(status().isOk())
            .andReturn();
        String url1 = com.jayway.jsonpath.JsonPath.read(primero.getResponse().getContentAsString(), "$.imagenUrl");
        String nombre1 = productoImagenService.extraerNombreLocal(url1);

        MvcResult segundo = mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("dos.jpg")))
            .andExpect(status().isOk())
            .andReturn();
        String url2 = com.jayway.jsonpath.JsonPath.read(segundo.getResponse().getContentAsString(), "$.imagenUrl");
        String nombre2 = productoImagenService.extraerNombreLocal(url2);

        assertThat(nombre1).isNotEqualTo(nombre2);
        assertThat(Files.exists(Path.of(imagenesDir).resolve(nombre1))).isFalse();
        assertThat(Files.exists(Path.of(imagenesDir).resolve(nombre2))).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("eliminar imagen local limpia referencia y archivo")
    void eliminarImagenLocal() throws Exception {
        Producto producto = crearProducto("Borrar img", new BigDecimal("10"), new BigDecimal("4"), 1);
        MvcResult subida = mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("del.jpg")))
            .andExpect(status().isOk())
            .andReturn();
        String url = com.jayway.jsonpath.JsonPath.read(subida.getResponse().getContentAsString(), "$.imagenUrl");
        String nombre = productoImagenService.extraerNombreLocal(url);

        mockMvc.perform(delete("/api/v1/productos/{id}/imagen", producto.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.imagenUrl").doesNotExist());

        assertThat(Files.exists(Path.of(imagenesDir).resolve(nombre))).isFalse();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET público sirve la imagen sin JWT")
    void servirImagenPublica() throws Exception {
        Producto producto = crearProducto("Pública", new BigDecimal("10"), new BigDecimal("4"), 1);
        MvcResult subida = mockMvc.perform(multipart("/api/v1/productos/{id}/imagen", producto.getId())
                .file(ProductoImagenServiceTest.jpegFile("pub.jpg")))
            .andExpect(status().isOk())
            .andReturn();
        String url = com.jayway.jsonpath.JsonPath.read(subida.getResponse().getContentAsString(), "$.imagenUrl");
        String nombre = productoImagenService.extraerNombreLocal(url);

        mockMvc.perform(get("/api/v1/productos/imagenes/{nombre}", nombre))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("image")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("URL externa sigue guardándose en imagenUrl vía PUT sin tocar archivos")
    void urlExternaSigueFuncionando() throws Exception {
        Producto producto = crearProducto("Externa", new BigDecimal("10"), new BigDecimal("4"), 1);
        producto.setImagenUrl("https://cdn.example.com/panel.jpg");
        productoRepository.save(producto);

        assertThat(productoImagenService.esImagenLocal(producto.getImagenUrl())).isFalse();
        productoImagenService.eliminarSiEsLocal(producto.getImagenUrl());
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getImagenUrl())
            .isEqualTo("https://cdn.example.com/panel.jpg");
    }
}
