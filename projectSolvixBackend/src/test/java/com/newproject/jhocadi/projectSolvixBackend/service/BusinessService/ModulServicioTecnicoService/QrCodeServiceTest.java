package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.google.zxing.EncodeHintType;

/**
 * Garantiza que ZXing (core + javase) está en el classpath de runtime/test
 * y que la generación QR no lanza NoClassDefFoundError.
 */
@SpringBootTest
@ActiveProfiles("test")
class QrCodeServiceTest {

    @Autowired
    private QrCodeService qrCodeService;

    @Test
    @DisplayName("classpath carga EncodeHintType (ZXing core)")
    void classpathTieneEncodeHintType() {
        assertThatCode(() -> Class.forName("com.google.zxing.EncodeHintType"))
            .doesNotThrowAnyException();
        assertThat(EncodeHintType.CHARACTER_SET).isNotNull();
        assertThatCode(() -> Class.forName("com.google.zxing.client.j2se.MatrixToImageWriter"))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("genera data URI PNG sin NoClassDefFoundError")
    void generaPngDataUri() {
        String uri = qrCodeService.generarPngDataUri("https://localhost/consulta/ot/abc123token");
        assertThat(uri).startsWith("data:image/png;base64,");
        assertThat(uri.length()).isGreaterThan(100);
    }
}
