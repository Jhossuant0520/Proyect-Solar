package com.newproject.jhocadi.projectSolvixBackend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("IllegalArgumentException → 400 Bad Request JSON")
    void illegalArgument_retorna400() {
        ServletWebRequest request = new ServletWebRequest(
            new MockHttpServletRequest("POST", "/api/v1/demanda-recibo/calcular"));

        ResponseEntity<ApiErrorResponse> response =
            handler.handleIllegalArgument(new IllegalArgumentException("Periodo inválido"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        ApiErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.status());
        assertEquals("Periodo inválido", body.message());
        assertEquals("/api/v1/demanda-recibo/calcular", body.path());
    }

    @Test
    @DisplayName("BusinessException → 400 Bad Request JSON")
    void businessException_retorna400() {
        ServletWebRequest request = new ServletWebRequest(
            new MockHttpServletRequest("POST", "/api/v1/hsp/calcular"));

        ResponseEntity<ApiErrorResponse> response =
            handler.handleBusiness(new BusinessException("Regla de negocio incumplida"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());

        ApiErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("Regla de negocio incumplida", body.message());
    }
}
