package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.UsuarioAdminWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ControllerUsuarioSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private repositoryUsuario usuarioRepo;

    @Autowired
    private repositoryRolUsuario rolRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    private modelRolUsuario rolAdmin;
    private modelRolUsuario rolUsuario;

    @BeforeEach
    void setUpRoles() {
        rolAdmin = rolRepo.findAll().stream()
            .filter(r -> "ADMIN".equals(r.getNombreRol()))
            .findFirst()
            .orElseGet(() -> {
                modelRolUsuario r = new modelRolUsuario();
                r.setNombreRol("ADMIN");
                r.setDescripcionRol("Administrador");
                return rolRepo.save(r);
            });
        rolUsuario = rolRepo.findAll().stream()
            .filter(r -> "USUARIO".equals(r.getNombreRol()))
            .findFirst()
            .orElseGet(() -> {
                modelRolUsuario r = new modelRolUsuario();
                r.setNombreRol("USUARIO");
                r.setDescripcionRol("Usuario normal");
                return rolRepo.save(r);
            });
    }

    private modelUsuario seedUsuario(String username, String email, String plainPassword, modelRolUsuario rol) {
        modelUsuario u = modelUsuario.builder()
            .nombreUsuario(username)
            .email(email)
            .passwordUsuario(passwordEncoder.encode(plainPassword))
            .activo(true)
            .emailVerificado(true)
            .rol(rol)
            .build();
        return usuarioRepo.save(u);
    }

    private UsuarioAdminWriteDTO writeDto(String username, String email, String password, Integer idRol) {
        UsuarioAdminWriteDTO dto = new UsuarioAdminWriteDTO();
        dto.setNombreUsuario(username);
        dto.setEmail(email);
        dto.setPasswordUsuario(password);
        dto.setActivo(true);
        dto.setIdRol(idRol);
        return dto;
    }

    @Test
    @DisplayName("sin autenticación → 401 en CRUD usuarios")
    void sinAuth401() throws Exception {
        mockMvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/usuarios/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/usuarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/usuarios/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/usuarios/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("autenticado sin ADMIN → 403 en CRUD usuarios")
    void usuarioSinAdmin403() throws Exception {
        modelUsuario seed = seedUsuario("user_plain", "user_plain@test.local", "Secret1!", rolUsuario);
        String body = objectMapper.writeValueAsString(
            writeDto("otro", "otro@test.local", "Secret1!", rolUsuario.getIdRol()));

        mockMvc.perform(get("/api/usuarios")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/usuarios/{id}", seed.getIdUsuario())).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/usuarios/{id}", seed.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/usuarios/{id}", seed.getIdUsuario())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN puede listar, consultar, crear, actualizar y eliminar")
    void adminPuedeCrud() throws Exception {
        modelUsuario seed = seedUsuario("seed_admin_crud", "seed_admin@test.local", "OldPass1!", rolUsuario);

        mockMvc.perform(get("/api/usuarios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.nombreUsuario=='seed_admin_crud')].idUsuario").exists());

        mockMvc.perform(get("/api/usuarios/{id}", seed.getIdUsuario()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombreUsuario").value("seed_admin_crud"))
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist())
            .andExpect(jsonPath("$.tokenVerificacion").doesNotExist());

        String createBody = objectMapper.writeValueAsString(
            writeDto("nuevo_admin_user", "nuevo_admin@test.local", "NewPass1!", rolUsuario.getIdRol()));

        String createdJson = mockMvc.perform(post("/api/usuarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nombreUsuario").value("nuevo_admin_user"))
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist())
            .andExpect(jsonPath("$.nombreRol").value("USUARIO"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        Integer createdId = objectMapper.readTree(createdJson).get("idUsuario").asInt();

        UsuarioAdminWriteDTO update = writeDto("nuevo_admin_user", "nuevo_admin@test.local", null, rolAdmin.getIdRol());
        update.setActivo(false);
        mockMvc.perform(put("/api/usuarios/{id}", createdId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activo").value(false))
            .andExpect(jsonPath("$.nombreRol").value("ADMIN"))
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist());

        mockMvc.perform(delete("/api/usuarios/{id}", createdId))
            .andExpect(status().isNoContent());

        assertThat(usuarioRepo.findById(createdId)).isEmpty();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("crear almacena password con BCrypt; respuesta sin hash")
    void crearUsaBcryptYNoExponeHash() throws Exception {
        String plain = "BcryptPass1!";
        String body = objectMapper.writeValueAsString(
            writeDto("bcrypt_user", "bcrypt@test.local", plain, rolUsuario.getIdRol()));

        String json = mockMvc.perform(post("/api/usuarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist())
            .andExpect(jsonPath("$.tokenVerificacion").doesNotExist())
            .andExpect(jsonPath("$.tokenVerificacionExpiracion").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString();

        Integer id = objectMapper.readTree(json).get("idUsuario").asInt();
        modelUsuario saved = usuarioRepo.findById(id).orElseThrow();
        assertThat(saved.getPasswordUsuario()).isNotEqualTo(plain);
        assertThat(passwordEncoder.matches(plain, saved.getPasswordUsuario())).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("actualizar sin password conserva el hash actual")
    void actualizarSinPasswordConservaHash() throws Exception {
        String originalPlain = "KeepMe1!";
        modelUsuario seed = seedUsuario("keep_pass", "keep_pass@test.local", originalPlain, rolUsuario);
        String hashBefore = seed.getPasswordUsuario();

        UsuarioAdminWriteDTO dto = writeDto("keep_pass", "keep_pass@test.local", null, rolUsuario.getIdRol());
        mockMvc.perform(put("/api/usuarios/{id}", seed.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isOk());

        modelUsuario after = usuarioRepo.findById(seed.getIdUsuario()).orElseThrow();
        assertThat(after.getPasswordUsuario()).isEqualTo(hashBefore);
        assertThat(passwordEncoder.matches(originalPlain, after.getPasswordUsuario())).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("actualizar con password nueva la cifra con BCrypt")
    void actualizarConPasswordUsaBcrypt() throws Exception {
        modelUsuario seed = seedUsuario("chg_pass", "chg_pass@test.local", "OldPass1!", rolUsuario);
        String newPlain = "BrandNew2!";

        UsuarioAdminWriteDTO dto = writeDto("chg_pass", "chg_pass@test.local", newPlain, rolUsuario.getIdRol());
        mockMvc.perform(put("/api/usuarios/{id}", seed.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist());

        modelUsuario after = usuarioRepo.findById(seed.getIdUsuario()).orElseThrow();
        assertThat(after.getPasswordUsuario()).isNotEqualTo(newPlain);
        assertThat(passwordEncoder.matches(newPlain, after.getPasswordUsuario())).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("rol solo cambia vía idRol del servidor; objeto rol anidado del cliente se ignora")
    void rolSoloViaIdRolServidor() throws Exception {
        modelUsuario seed = seedUsuario("role_user", "role_user@test.local", "RolePass1!", rolUsuario);

        String malicious = """
            {
              "nombreUsuario": "role_user",
              "email": "role_user@test.local",
              "activo": true,
              "idRol": %d,
              "rol": { "idRol": %d, "nombreRol": "ADMIN" }
            }
            """.formatted(rolUsuario.getIdRol(), rolAdmin.getIdRol());

        mockMvc.perform(put("/api/usuarios/{id}", seed.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content(malicious))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombreRol").value("USUARIO"))
            .andExpect(jsonPath("$.idRol").value(rolUsuario.getIdRol()));

        modelUsuario after = usuarioRepo.findById(seed.getIdUsuario()).orElseThrow();
        assertThat(after.getRol().getNombreRol()).isEqualTo("USUARIO");
        assertThat(after.getRol().getIdRol()).isEqualTo(rolUsuario.getIdRol());
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("usuario sin ADMIN no puede elevar roles vía PUT")
    void sinAdminNoPuedeCambiarRol() throws Exception {
        modelUsuario seed = seedUsuario("no_elevate", "no_elevate@test.local", "Secret1!", rolUsuario);
        UsuarioAdminWriteDTO dto = writeDto("no_elevate", "no_elevate@test.local", null, rolAdmin.getIdRol());

        mockMvc.perform(put("/api/usuarios/{id}", seed.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isForbidden());

        modelUsuario after = usuarioRepo.findById(seed.getIdUsuario()).orElseThrow();
        assertThat(after.getRol().getNombreRol()).isEqualTo("USUARIO");
    }
}
