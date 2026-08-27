package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulHSPContro;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulHSPDtos.ResponseHSP;
import com.newproject.jhocadi.projectSolvixBackend.exception.GlobalExceptionHandler;
import com.newproject.jhocadi.projectSolvixBackend.security.JwtAuthFilter;
import com.newproject.jhocadi.projectSolvixBackend.security.JwtUtil;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulHspService.ServiceImpHSP;

@WebMvcTest(controllers = ControllerHSP.class)
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class ControllerHSPTest {

    private static final String JSON = "application/json";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ServiceImpHSP service;

    @MockitoBean
    private JwtAuthFilter jwtAuthFilter;

    @MockitoBean
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("POST /api/v1/hsp/calcular → 200 con coordenadas válidas")
    void calcular_conPayloadValido_retorna200() throws Exception {
        ResponseHSP response = new ResponseHSP();
        response.setLatitud(4.6097);
        response.setLongitud(-74.0817);
        response.setHspDiseno(3.85);

        when(service.calcular(any())).thenReturn(response);

        String body = """
            {
              "latitud": 4.6097,
              "longitud": -74.0817
            }
            """;

        mockMvc.perform(post("/api/v1/hsp/calcular")
                .contentType(JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.latitud").value(4.6097))
            .andExpect(jsonPath("$.hspDiseno").value(3.85));
    }

    @Test
    @DisplayName("POST /api/v1/hsp/calcular → 400 cuando el servicio lanza IllegalArgumentException")
    void calcular_conArgumentoInvalido_retorna400() throws Exception {
        when(service.calcular(any()))
            .thenThrow(new IllegalArgumentException("Coordenadas fuera de rango."));

        String body = """
            {
              "latitud": 999.0,
              "longitud": -74.0817
            }
            """;

        mockMvc.perform(post("/api/v1/hsp/calcular")
                .contentType(JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.message").value("Coordenadas fuera de rango."));
    }
}
