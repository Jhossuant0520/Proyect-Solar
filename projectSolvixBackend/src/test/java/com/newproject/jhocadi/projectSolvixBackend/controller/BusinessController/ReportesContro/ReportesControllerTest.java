package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ReportesContro;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CompraService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.VentaService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService.ReportCsvExportService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportesControllerTest extends ComercialTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VentaService ventaService;

    @Autowired
    private CompraService compraService;

    @Test
    @DisplayName("GET /api/v1/reportes/ventas/resumen sin JWT → 401")
    void ventasResumenSinJwt() throws Exception {
        mockMvc.perform(get("/api/v1/reportes/ventas/resumen"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/reportes/ventas/resumen token inválido/expirado → 401")
    void ventasResumenTokenInvalido() throws Exception {
        mockMvc.perform(get("/api/v1/reportes/ventas/resumen")
                .header(HttpHeaders.AUTHORIZATION, "Bearer token.expirado.invalido"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("GET /api/v1/reportes/ventas/resumen con USUARIO → 403")
    void ventasResumenUsuario() throws Exception {
        mockMvc.perform(get("/api/v1/reportes/ventas/resumen"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/reportes/ventas/resumen ADMIN → 200 con kpis y serie")
    void ventasResumenAdmin() throws Exception {
        Producto producto = crearProducto("Reporte Venta", new BigDecimal("100.00"), new BigDecimal("40.00"), 20);
        registrarVentaCompletada(producto, 2, new BigDecimal("100.00"));

        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        mockMvc.perform(get("/api/v1/reportes/ventas/resumen")
                .param("desde", desde.toString())
                .param("hasta", hasta.toString())
                .param("agrupacion", "DIA"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpis").exists())
            .andExpect(jsonPath("$.serie").exists())
            .andExpect(jsonPath("$.kpis.pedidos").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/reportes/ventas/exportar ADMIN → CSV con BOM y Content-Disposition")
    void ventasExportarAdmin() throws Exception {
        Producto producto = crearProducto("CSV Venta", new BigDecimal("50.00"), new BigDecimal("20.00"), 10);
        registrarVentaCompletada(producto, 1, new BigDecimal("50.00"));

        MvcResult result = mockMvc.perform(get("/api/v1/reportes/ventas/exportar")
                .param("agrupacion", "MES"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ventas.csv\""))
            .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("text/csv")))
            .andReturn();

        byte[] body = result.getResponse().getContentAsByteArray();
        assertThat(body[0]).isEqualTo(ReportCsvExportService.UTF8_BOM[0]);
        assertThat(body[1]).isEqualTo(ReportCsvExportService.UTF8_BOM[1]);
        assertThat(body[2]).isEqualTo(ReportCsvExportService.UTF8_BOM[2]);
        String texto = new String(body, StandardCharsets.UTF_8);
        assertThat(texto).contains("ventasBrutas");
        assertThat(texto).contains("fecha;etiqueta;ventas");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/reportes/compras/resumen y exportar ADMIN → 200")
    void comprasResumenYExportAdmin() throws Exception {
        Producto producto = crearProducto("CSV Compra", new BigDecimal("30.00"), new BigDecimal("10.00"), 0);
        Proveedor proveedor = crearProveedor("Prov Reporte");
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(5);
        detalle.setCostoUnitario(new BigDecimal("10.00"));
        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedor.getId());
        request.setDetalles(java.util.List.of(detalle));
        CompraResponseDTO compra = compraService.crear(request, USUARIO_TEST);
        compraService.completar(compra.getId(), USUARIO_TEST);

        mockMvc.perform(get("/api/v1/reportes/compras/resumen")
                .param("proveedorId", String.valueOf(proveedor.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ordenes").value(1))
            .andExpect(jsonPath("$.comprasBrutas").exists());

        mockMvc.perform(get("/api/v1/reportes/compras/exportar"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"compras.csv\""))
            .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("text/csv")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/reportes/inventario/resumen y exportar ADMIN → 200")
    void inventarioResumenYExportAdmin() throws Exception {
        crearProducto("Inv Reporte", new BigDecimal("20.00"), new BigDecimal("8.00"), 4);

        mockMvc.perform(get("/api/v1/reportes/inventario/resumen")
                .param("incluirAbc", "true")
                .param("criterio", "INGRESOS"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpis").exists())
            .andExpect(jsonPath("$.abc").exists());

        mockMvc.perform(get("/api/v1/reportes/inventario/exportar")
                .param("incluirAbc", "false"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"inventario.csv\""))
            .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("text/csv")));
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("GET /api/v1/reportes/compras/exportar USUARIO → 403")
    void comprasExportUsuarioForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/reportes/compras/exportar"))
            .andExpect(status().isForbidden());
    }

    private void registrarVentaCompletada(Producto producto, int cantidad, BigDecimal precio) {
        DetalleVentaRequestDTO linea = new DetalleVentaRequestDTO();
        linea.setProductoId(producto.getId());
        linea.setCantidad(cantidad);
        linea.setPrecioUnitario(precio);

        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(java.util.List.of(linea));
        VentaResponseDTO venta = ventaService.crear(request, USUARIO_TEST);
        ventaService.completar(venta.getId(), USUARIO_TEST);
    }
}
