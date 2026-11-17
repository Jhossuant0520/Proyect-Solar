package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.AuthRateLimiter;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.ClientIpResolver;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService.PublicActionRateLimiter;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthEndpointRateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuthRateLimiter authRateLimiter;

    @Autowired
    private PublicActionRateLimiter publicActionRateLimiter;

    @Autowired
    private ClientIpResolver clientIpResolver;

    @Autowired
    private repositoryUsuario usuarioRepo;

    @Autowired
    private repositoryRolUsuario rolRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        authRateLimiter.reset();
        publicActionRateLimiter.reset();
        asegurarRolesBase();
    }

    private void asegurarRolesBase() {
        if (rolRepo.findByNombreRol("ADMIN").isEmpty()) {
            modelRolUsuario admin = new modelRolUsuario();
            admin.setNombreRol("ADMIN");
            admin.setDescripcionRol("Administrador");
            rolRepo.saveAndFlush(admin);
        }
        modelRolUsuario usuario = rolRepo.findByNombreRol("USUARIO").orElse(null);
        if (usuario == null) {
            usuario = new modelRolUsuario();
            usuario.setNombreRol("USUARIO");
            usuario.setDescripcionRol("Usuario normal");
            usuario = rolRepo.saveAndFlush(usuario);
        }
        if (!Integer.valueOf(2).equals(usuario.getIdRol())) {
            modelRolUsuario id2 = rolRepo.findById(2).orElse(null);
            if (id2 != null && !"USUARIO".equals(id2.getNombreRol())) {
                usuario.setNombreRol("USUARIO_MIG_" + usuario.getIdRol());
                rolRepo.saveAndFlush(usuario);
                id2.setNombreRol("USUARIO");
                rolRepo.saveAndFlush(id2);
            } else if (id2 == null) {
                usuario.setNombreRol("USUARIO_MIG_" + usuario.getIdRol());
                rolRepo.saveAndFlush(usuario);
                entityManager.createNativeQuery(
                        "INSERT INTO roles (id_rol, nombre_rol, descripcion_rol) VALUES (2, 'USUARIO', 'Usuario normal')")
                    .executeUpdate();
                entityManager.flush();
                entityManager.clear();
            }
        }
    }

    private modelUsuario seedUsuarioVerificado(String username, String email, String plainPassword) {
        modelRolUsuario rol = rolRepo.findById(2).orElseGet(() -> rolRepo.findByNombreRol("USUARIO").orElseThrow());
        return usuarioRepo.save(modelUsuario.builder()
            .nombreUsuario(username)
            .email(email)
            .passwordUsuario(passwordEncoder.encode(plainPassword))
            .activo(true)
            .emailVerificado(true)
            .rol(rol)
            .build());
    }

    @Test
    @DisplayName("trust-forwarded-headers=false en perfil test")
    void noConfiaEnXff() {
        assertThat(clientIpResolver.isTrustForwardedHeaders()).isFalse();
    }

    @Test
    @DisplayName("login legítimo funciona")
    void loginLegitimo() throws Exception {
        seedUsuarioVerificado("auth_ok", "auth_ok@test.local", "SecretPass1!");
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\":\"auth_ok\",\"passwordUsuario\":\"SecretPass1!\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.usuario").value("auth_ok"))
            .andExpect(jsonPath("$.rol").exists())
            .andExpect(jsonPath("$.passwordUsuario").doesNotExist());
    }

    @Test
    @DisplayName("login fallido dentro del límite → 401; exceso → 429")
    void loginRateLimit429() throws Exception {
        // test props: login max=5
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"nombreUsuario\":\"noexiste\",\"passwordUsuario\":\"bad\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Credenciales inválidas"));
        }
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\":\"noexiste\",\"passwordUsuario\":\"bad\"}"))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("X-Forwarded-For rotado no evade el límite de login")
    void xffNoEvadeLogin() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", "9.9.9." + i)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"nombreUsuario\":\"x\",\"passwordUsuario\":\"y\"}"))
                .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login")
                .header("X-Forwarded-For", "1.2.3.4")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\":\"x\",\"passwordUsuario\":\"y\"}"))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("registro legítimo → 201 y contrato de mensaje; sin rol ADMIN del cliente")
    void registroLegitimo() throws Exception {
        RegistroRequestDTO dto = new RegistroRequestDTO();
        dto.setNombreUsuario("reg_ok_6e");
        dto.setEmail("reg_ok_6e@test.local");
        dto.setPasswordUsuario("RegPass12!");

        mockMvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.mensaje").value(
                "Registro exitoso. Revisa tu correo para verificar tu cuenta."));

        modelUsuario creado = usuarioRepo.findByNombreUsuario("reg_ok_6e").orElseThrow();
        assertThat(creado.getRol().getNombreRol()).isEqualTo("USUARIO");
        assertThat(creado.getRol().getIdRol()).isEqualTo(2);
    }

    @Test
    @DisplayName("registro: cuerpo con rol ADMIN del cliente se ignora; rate limit por IP")
    void registroIgnoraRolYAplicaLimite() throws Exception {
        // test props: registro max=3
        for (int i = 0; i < 3; i++) {
            String body = """
                {"nombreUsuario":"reg_lim_%d","email":"reg_lim_%d@test.local","passwordUsuario":"RegPass12!","rol":"ADMIN","idRol":1}
                """.formatted(i, i);
            mockMvc.perform(post("/api/auth/registro")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                .andExpect(status().isCreated());
            modelUsuario u = usuarioRepo.findByNombreUsuario("reg_lim_" + i).orElseThrow();
            assertThat(u.getRol().getNombreRol()).isEqualTo("USUARIO");
        }
        mockMvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombreUsuario":"reg_lim_x","email":"reg_lim_x@test.local","passwordUsuario":"RegPass12!"}
                    """))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("reenviar-verificacion: mensaje genérico; exceso → 429; email inexistente no revela cuenta")
    void reenviarVerificacionRateLimit() throws Exception {
        // test props: reenviar max=2
        mockMvc.perform(post("/api/auth/reenviar-verificacion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"noexiste@test.local\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mensaje").value("Si el email existe, recibirás un nuevo enlace."));

        mockMvc.perform(post("/api/auth/reenviar-verificacion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"otro@test.local\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mensaje").value("Si el email existe, recibirás un nuevo enlace."));

        mockMvc.perform(post("/api/auth/reenviar-verificacion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"tercero@test.local\"}"))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("saturar reenvío no bloquea login")
    void reenviarNoBloqueaLogin() throws Exception {
        seedUsuarioVerificado("indep_login", "indep_login@test.local", "SecretPass1!");
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/auth/reenviar-verificacion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"x" + i + "@test.local\"}"))
                .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/auth/reenviar-verificacion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"blocked@test.local\"}"))
            .andExpect(status().isTooManyRequests());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreUsuario\":\"indep_login\",\"passwordUsuario\":\"SecretPass1!\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("auth rate limit no afecta endpoints admin ajenos")
    void noAfectaAdmin() throws Exception {
        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"nombreUsuario\":\"a\",\"passwordUsuario\":\"b\"}"));
        }
        mockMvc.perform(get("/api/roles")).andExpect(status().isOk());
        mockMvc.perform(get("/api/usuarios")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("saturar auth no satura rate limit de cotización (mapas separados)")
    void authNoSaturaCotizacionLimiter() {
        for (int i = 0; i < 10; i++) {
            try {
                authRateLimiter.checkLogin("10.20.30.40");
            } catch (Exception ignored) {
                // expected after limit
            }
        }
        // PublicActionRateLimiter test props max=5: debe aceptar la 1ª clave limpia
        publicActionRateLimiter.checkAndConsume("cot-accion:tok|10.20.30.40");
        assertThat(publicActionRateLimiter.size()).isEqualTo(1);
    }

    @Test
    @DisplayName("GET verificar-email sigue público (sin rate limit de mutación)")
    void verificarEmailPublico() throws Exception {
        mockMvc.perform(get("/api/auth/verificar-email").param("token", "token-inexistente"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.mensaje").value("Token inválido o expirado"));
    }
}
