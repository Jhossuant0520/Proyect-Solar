package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

public class ProductoImagenServiceTest {

    @TempDir
    Path tempDir;

    private ProductoImagenService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new ProductoImagenService(tempDir.toString());
        service.crearDirectorio();
    }

    @Test
    @DisplayName("guarda JPEG válido y devuelve URL relativa pública")
    void guardaJpeg() {
        MockMultipartFile file = jpegFile("foto.jpg");

        String url = service.guardarArchivo(file);

        assertThat(url).startsWith(ProductoImagenService.RUTA_PUBLICA_PREFIJO);
        assertThat(url).endsWith(".jpg");
        String nombre = service.extraerNombreLocal(url);
        assertThat(nombre).isNotNull();
        assertThat(Files.exists(tempDir.resolve(nombre))).isTrue();
    }

    @Test
    @DisplayName("rechaza archivo vacío")
    void rechazaVacio() {
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> service.guardarArchivo(file))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("rechaza MIME / firma no permitida")
    void rechazaMime() {
        MockMultipartFile file = new MockMultipartFile(
            "file", "malware.exe", "application/octet-stream", new byte[] { 0x4D, 0x5A, 0x00, 0x00 });

        assertThatThrownBy(() -> service.guardarArchivo(file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("JPG, PNG o WEBP");
    }

    @Test
    @DisplayName("rechaza archivo demasiado grande")
    void rechazaGrande() {
        byte[] bytes = new byte[(int) (2 * 1024 * 1024) + 10];
        bytes[0] = (byte) 0xFF;
        bytes[1] = (byte) 0xD8;
        bytes[2] = (byte) 0xFF;
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", bytes);

        assertThatThrownBy(() -> service.guardarArchivo(file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("2 MB");
    }

    @Test
    @DisplayName("no elimina URL externa")
    void noEliminaExterna() throws Exception {
        service.eliminarSiEsLocal("https://cdn.example.com/panel.jpg");
        try (var stream = Files.list(tempDir)) {
            assertThat(stream.count()).isZero();
        }
    }

    @Test
    @DisplayName("carga imagen guardada y rechaza path traversal")
    void cargaYSeguridad() {
        String url = service.guardarArchivo(jpegFile("a.jpg"));
        String nombre = service.extraerNombreLocal(url);

        Resource resource = service.cargar(nombre);
        assertThat(resource.exists()).isTrue();

        assertThatThrownBy(() -> service.cargar("../secret.jpg"))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.NOT_FOUND);
    }

    public static MockMultipartFile jpegFile(String name) {
        byte[] jpeg = new byte[] {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
            0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
            (byte) 0xFF, (byte) 0xD9
        };
        return new MockMultipartFile("file", name, "image/jpeg", jpeg);
    }
}
