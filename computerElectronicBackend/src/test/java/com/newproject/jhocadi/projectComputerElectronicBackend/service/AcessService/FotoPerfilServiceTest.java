package com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class FotoPerfilServiceTest {

    @TempDir
    Path tempDir;

    private FotoPerfilService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new FotoPerfilService(tempDir.toString());
        service.crearDirectorio();
    }

    private MockMultipartFile jpeg(String name) {
        return new MockMultipartFile(name, name + ".jpg", MediaType.IMAGE_JPEG_VALUE, new byte[] {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x01, 0x02, 0x03
        });
    }

    @Test
    @DisplayName("guardar usa UUID no enumerable (no {id}.ext)")
    void guardarUsaUuid() {
        String url = service.guardar(42, jpeg("foto"), null);
        assertThat(url).startsWith(FotoPerfilService.RUTA_PUBLICA_PREFIJO);
        String nombre = url.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        assertThat(nombre).doesNotStartWith("42.");
        assertThat(nombre).matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.jpg$");
        assertThat(Files.exists(tempDir.resolve(nombre))).isTrue();
        assertThat(Files.exists(tempDir.resolve("42.jpg"))).isFalse();
    }

    @Test
    @DisplayName("cargar acepta UUID y rechaza path traversal / nombres inválidos")
    void cargarValidaNombre() throws Exception {
        String url = service.guardar(7, jpeg("a"), null);
        String nombre = url.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        assertThat(service.cargar(nombre).exists()).isTrue();

        // Legacy aún servible si el archivo existe
        Files.write(tempDir.resolve("3.jpg"), new byte[] { 1, 2, 3 });
        assertThat(service.cargar("3.jpg").exists()).isTrue();

        assertThatThrownBy(() -> service.cargar("../secret.jpg"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> service.cargar("not-a-uuid.jpg"))
            .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("reemplazo elimina foto anterior (UUID o legacy)")
    void reemplazoEliminaAnterior() throws Exception {
        Files.write(tempDir.resolve("9.jpg"), new byte[] { 9 });
        String primera = service.guardar(9, jpeg("p1"), "/api/cuenta/avatares/9.jpg");
        assertThat(Files.exists(tempDir.resolve("9.jpg"))).isFalse();

        String n1 = primera.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        String segunda = service.guardar(9, jpeg("p2"), primera);
        assertThat(Files.exists(tempDir.resolve(n1))).isFalse();
        String n2 = segunda.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        assertThat(Files.exists(tempDir.resolve(n2))).isTrue();
        assertThat(n1).isNotEqualTo(n2);
    }

    @Test
    @DisplayName("adivinar id secuencial no revela foto nueva (UUID)")
    void enumeracionPorIdNoRevelaFotoNueva() {
        String url = service.guardar(100, jpeg("x"), null);
        assertThat(url).doesNotContain("/100.");
        assertThatThrownBy(() -> service.cargar("100.jpg"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
        // El UUID real sí carga
        String real = url.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        assertThat(service.cargar(real).exists()).isTrue();
        // UUID inventado → 404
        assertThatThrownBy(() -> service.cargar(UUID.randomUUID() + ".jpg"))
            .isInstanceOf(ResponseStatusException.class);
    }
}
