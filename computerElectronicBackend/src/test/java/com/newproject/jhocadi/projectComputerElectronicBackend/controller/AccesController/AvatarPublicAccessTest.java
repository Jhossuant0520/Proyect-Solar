package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.JwtUtil;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.FotoPerfilService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AvatarPublicAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private repositoryUsuario usuarioRepo;

    @Autowired
    private repositoryRolUsuario rolRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private FotoPerfilService fotoPerfilService;

    @Value("${app.storage.account.photos-dir}")
    private String photosDir;

    private modelUsuario usuario;

    @BeforeEach
    void seed() throws Exception {
        Files.createDirectories(Path.of(photosDir));
        modelRolUsuario rol = rolRepo.findByNombreRol("USUARIO").orElseGet(() -> {
            modelRolUsuario r = new modelRolUsuario();
            r.setNombreRol("USUARIO");
            r.setDescripcionRol("Usuario");
            return rolRepo.save(r);
        });
        usuario = usuarioRepo.save(modelUsuario.builder()
            .nombreUsuario("avatar_user")
            .email("avatar_user@test.local")
            .passwordUsuario(passwordEncoder.encode("SecretPass1!"))
            .activo(true)
            .emailVerificado(true)
            .rol(rol)
            .build());
    }

    @Test
    @DisplayName("subir foto → URL UUID; GET público OK; GET por id secuencial 404")
    void fotoUuidNoEnumerablePorId() throws Exception {
        String token = jwtUtil.generateToken(usuario.getNombreUsuario(), "USUARIO");
        MockMultipartFile archivo = new MockMultipartFile(
            "archivo", "cara.jpg", MediaType.IMAGE_JPEG_VALUE,
            new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01, 0x02 });

        String body = mockMvc.perform(multipart("/api/cuenta/foto")
                .file(archivo)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fotoUrl").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();

        String fotoUrl = body.replaceAll("(?s).*\"fotoUrl\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        assertThat(fotoUrl).startsWith(FotoPerfilService.RUTA_PUBLICA_PREFIJO);
        assertThat(fotoUrl).doesNotContain("/" + usuario.getIdUsuario() + ".");

        String nombre = fotoUrl.substring(FotoPerfilService.RUTA_PUBLICA_PREFIJO.length());
        mockMvc.perform(get("/api/cuenta/avatares/" + nombre))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/cuenta/avatares/" + usuario.getIdUsuario() + ".jpg"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("path traversal en avatares públicos → 400/404 (rechazado)")
    void pathTraversalRechazado() throws Exception {
        int status = mockMvc.perform(get("/api/cuenta/avatares/../application.properties"))
            .andReturn()
            .getResponse()
            .getStatus();
        assertThat(status).isIn(400, 404);
    }
}
