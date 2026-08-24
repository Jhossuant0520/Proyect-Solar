package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulDemandaReciboCon;

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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.ResponseDemandaRecibo;
import com.newproject.jhocadi.projectSolvixBackend.exception.GlobalExceptionHandler;
import com.newproject.jhocadi.projectSolvixBackend.security.JwtAuthFilter;
import com.newproject.jhocadi.projectSolvixBackend.security.JwtUtil;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulDemandaReciboService.ServiceDemandaRecibo;

@WebMvcTest(controllers = ControllerDemandaRecibo.class)
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
class ControllerDemandaReciboTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ServiceDemandaRecibo serviceDemandaRecibo;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("POST /api/v1/demanda-recibo/calcular → 200 con payload válido")
    void calcular_conPayloadValido_retorna200() throws Exception {
        ResponseDemandaRecibo response = new ResponseDemandaRecibo();
        response.setModoCalculoConsumoBase("PROMEDIO_DIRECTO");
        response.setEnergiaDiariaWhFinal(1500.0);

        when(serviceDemandaRecibo.calcularDemandaEnergetica(any())).thenReturn(response);

        String body = """
            {
              "modoCalculoConsumoBase": "PROMEDIO_DIRECTO",
              "consumoPromedioDirectoKwh": 250.0,
              "precioKwhCop": 850.0,
              "porcentajeCobertura": 100.0,
              "anioInicio": 2025,
              "mesInicio": 1,
              "anioFin": 2025,
              "mesFin": 6
            }
            """;

        mockMvc.perform(post("/api/v1/demanda-recibo/calcular")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.modoCalculoConsumoBase").value("PROMEDIO_DIRECTO"))
            .andExpect(jsonPath("$.energiaDiariaWhFinal").value(1500.0));
    }

    @Test
    @DisplayName("POST /api/v1/demanda-recibo/calcular → 400 cuando el servicio lanza IllegalArgumentException")
    void calcular_conReglaDeNegocioInvalida_retorna400() throws Exception {
        when(serviceDemandaRecibo.calcularDemandaEnergetica(any()))
            .thenThrow(new IllegalArgumentException("El periodo de fechas es inválido."));

        String body = """
            {
              "modoCalculoConsumoBase": "PROMEDIO_DIRECTO",
              "consumoPromedioDirectoKwh": 250.0,
              "precioKwhCop": 850.0,
              "porcentajeCobertura": 100.0,
              "anioInicio": 2025,
              "mesInicio": 12,
              "anioFin": 2025,
              "mesFin": 1
            }
            """;

        mockMvc.perform(post("/api/v1/demanda-recibo/calcular")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.message").value("El periodo de fechas es inválido."));
    }

    @Test
    @DisplayName("POST /api/v1/demanda-recibo/calcular → 400 por validación Bean Validation")
    void calcular_conPayloadIncompleto_retorna400() throws Exception {
        String body = """
            {
              "modoCalculoConsumoBase": "PROMEDIO_DIRECTO"
            }
            """;

        mockMvc.perform(post("/api/v1/demanda-recibo/calcular")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
    }
}
