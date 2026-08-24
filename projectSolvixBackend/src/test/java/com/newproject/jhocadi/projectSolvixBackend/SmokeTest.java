package com.newproject.jhocadi.projectSolvixBackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Smoke test (MTP R6): verifica que el contexto de Spring Boot carga de forma limpia
 * usando H2 en memoria (sin MySQL obligatorio).
 */
@SpringBootTest
@ActiveProfiles("test")
class SmokeTest {

    @Test
    void contextLoads() {
        // Si el ApplicationContext no arranca, este test falla.
    }
}
