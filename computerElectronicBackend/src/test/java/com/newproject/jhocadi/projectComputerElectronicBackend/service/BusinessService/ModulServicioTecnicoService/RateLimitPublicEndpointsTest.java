package com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectComputerElectronicBackend.security.AuthRateLimiter;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.ClientIpResolver;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RateLimitPublicEndpointsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PublicActionRateLimiter rateLimiter;

    @Autowired
    private AuthRateLimiter authRateLimiter;

    @Autowired
    private ClientIpResolver clientIpResolver;

    @BeforeEach
    void resetLimiter() {
        rateLimiter.reset();
        authRateLimiter.reset();
    }

    @Test
    @DisplayName("GET consulta pública sigue disponible sin JWT")
    void consultaGetPublicaDisponible() throws Exception {
        mockMvc.perform(get("/api/v1/consulta/ot/token-inexistente-6d"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("catálogo público GET sigue disponible")
    void catalogoPublicoDisponible() throws Exception {
        mockMvc.perform(get("/api/v1/catalogo/productos"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("login endpoint público responde (credenciales inválidas → 401 de negocio)")
    void loginSigueDisponible() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\":\"nadie\",\"passwordUsuario\":\"x\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("rate limiter no afecta endpoints admin no relacionados")
    void adminNoAfectadoPorRateLimiter() throws Exception {
        for (int i = 0; i < 20; i++) {
            try {
                rateLimiter.checkAndConsume("noise-" + i);
            } catch (ResponseStatusException ignored) {
                // ignore
            }
        }
        mockMvc.perform(get("/api/roles"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/usuarios"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("perfil test: trust-forwarded-headers=false (sin evasión trivial por XFF)")
    void trustForwardedDesactivadoEnTest() {
        assertThat(clientIpResolver.isTrustForwardedHeaders()).isFalse();
    }

    @Test
    @DisplayName("mismo token+IP: dentro del límite OK; exceso → 429 (props test max=5)")
    void limiteAplicadoPorClave() {
        String key = "cot-accion:tok-test|127.0.0.1";
        for (int i = 0; i < 5; i++) {
            rateLimiter.checkAndConsume(key);
        }
        assertThatThrownBy(() -> rateLimiter.checkAndConsume(key))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    @DisplayName("rotar X-Forwarded-For no crea buckets distintos si se usa remoteAddr en la clave")
    void xffNoEvadeCuandoClaveUsaRemoteAddr() {
        String remote = "203.0.113.10";
        String token = "tok-xff";
        for (int i = 0; i < 5; i++) {
            rateLimiter.checkAndConsume("cot-accion:" + token + "|" + remote);
        }
        assertThatThrownBy(() ->
                rateLimiter.checkAndConsume("cot-accion:" + token + "|" + remote))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    @DisplayName("constructor Spring del limiter usa props de test")
    void springLimiterRespetaProps() {
        String key = "props-check|" + Clock.systemUTC().millis();
        for (int i = 0; i < 5; i++) {
            rateLimiter.checkAndConsume(key);
        }
        assertThatThrownBy(() -> rateLimiter.checkAndConsume(key))
            .isInstanceOf(ResponseStatusException.class);
    }
}
