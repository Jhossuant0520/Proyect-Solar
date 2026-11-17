package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RolWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.AuthRateLimiter;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.serviceRolUsuario;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ControllerRolUsuarioSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private repositoryRolUsuario rolRepo;

    @Autowired
    private repositoryUsuario usuarioRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private serviceRolUsuario rolService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private AuthRateLimiter authRateLimiter;

    private modelRolUsuario rolAdmin;
    private modelRolUsuario rolUsuario;

    @BeforeEach
    void setUpRoles() {
        authRateLimiter.reset();
        rolAdmin = rolRepo.findByNombreRol("ADMIN").orElseGet(() -> {
            modelRolUsuario r = new modelRolUsuario();
            r.setNombreRol("ADMIN");
            r.setDescripcionRol("Administrador");
            return rolRepo.save(r);
        });
        rolUsuario = rolRepo.findByNombreRol("USUARIO").orElseGet(() -> {
            modelRolUsuario r = new modelRolUsuario();
            r.setNombreRol("USUARIO");
            r.setDescripcionRol("Usuario normal");
            return rolRepo.save(r);
        });
    }

    /** Asegura el contrato histórico de registro: rol USUARIO con id_rol = 2. */
    private void asegurarRolUsuarioId2() {
        modelRolUsuario porNombre = rolRepo.findByNombreRol("USUARIO").orElse(null);
        modelRolUsuario id2 = rolRepo.findById(2).orElse(null);

        if (id2 != null && "USUARIO".equals(id2.getNombreRol())) {
            rolUsuario = id2;
            return;
        }

        if (porNombre != null && !Integer.valueOf(2).equals(porNombre.getIdRol())) {
            porNombre.setNombreRol("USUARIO_MIG_" + porNombre.getIdRol());
            rolRepo.saveAndFlush(porNombre);
        }

        if (id2 != null) {
            id2.setNombreRol("USUARIO");
            id2.setDescripcionRol("Usuario normal");
            rolUsuario = rolRepo.saveAndFlush(id2);
            return;
        }

        entityManager.createNativeQuery(
                "INSERT INTO roles (id_rol, nombre_rol, descripcion_rol) VALUES (2, 'USUARIO', 'Usuario normal')")
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();
        rolUsuario = rolRepo.findById(2).orElseThrow();
    }

    private modelUsuario seedUsuario(String username, String email, modelRolUsuario rol) {
        return usuarioRepo.save(modelUsuario.builder()
            .nombreUsuario(username)
            .email(email)
            .passwordUsuario(passwordEncoder.encode("Secret1!"))
            .activo(true)
            .emailVerificado(true)
            .rol(rol)
            .build());
    }

    @Test
    @DisplayName("sin autenticación → 401 en GET/POST /api/roles")
    void sinAuth401() throws Exception {
        mockMvc.perform(get("/api/roles")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreRol\":\"X\"}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/roles/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/roles/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("USUARIO → 403 al listar o crear roles; no puede modificar ni eliminar vía API")
    void usuarioSinAdmin403() throws Exception {
        RolWriteDTO dto = new RolWriteDTO();
        dto.setNombreRol("HACKER");
        dto.setDescripcionRol("intento");

        mockMvc.perform(get("/api/roles")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isForbidden());

        // Sin mapeo PUT/DELETE: autenticado sin ADMIN no administra; Spring responde 403
        // por @PreAuthorize de clase al resolver, o 405 si no hay handler. Aceptamos ambos
        // como denegación de administración.
        int putStatus = mockMvc.perform(put("/api/roles/{id}", rolUsuario.getIdRol())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andReturn()
            .getResponse()
            .getStatus();
        assertThat(putStatus).isIn(403, 404, 405);

        int deleteStatus = mockMvc.perform(delete("/api/roles/{id}", rolUsuario.getIdRol()))
            .andReturn()
            .getResponse()
            .getStatus();
        assertThat(deleteStatus).isIn(403, 404, 405);

        assertThat(rolRepo.findByNombreRol("HACKER")).isEmpty();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN puede listar y crear roles")
    void adminPuedeListarYCrear() throws Exception {
        mockMvc.perform(get("/api/roles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.nombreRol=='ADMIN')].idRol").exists())
            .andExpect(jsonPath("$[?(@.nombreRol=='USUARIO')].idRol").exists());

        RolWriteDTO dto = new RolWriteDTO();
        dto.setNombreRol("AUDITOR");
        dto.setDescripcionRol("Solo lectura operativa");

        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nombreRol").value("AUDITOR"))
            .andExpect(jsonPath("$.descripcionRol").value("Solo lectura operativa"))
            .andExpect(jsonPath("$.idRol").exists());

        assertThat(rolRepo.findByNombreRol("AUDITOR")).isPresent();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("crear rol ignora idRol enviado por el cliente")
    void crearIgnoraIdCliente() throws Exception {
        String body = """
            {
              "idRol": 999,
              "nombreRol": "SOPORTE",
              "descripcionRol": "mesa de ayuda",
              "nombre_rol": "ADMIN"
            }
            """;

        String json = mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nombreRol").value("SOPORTE"))
            .andExpect(jsonPath("$.idRol").value(org.hamcrest.Matchers.not(999)))
            .andReturn()
            .getResponse()
            .getContentAsString();

        int id = objectMapper.readTree(json).get("idRol").asInt();
        assertThat(id).isNotEqualTo(999);
        assertThat(rolRepo.findById(id).orElseThrow().getNombreRol()).isEqualTo("SOPORTE");
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("USUARIO no puede elevar privilegios creando rol ADMIN")
    void usuarioNoPuedeCrearRolAdmin() throws Exception {
        RolWriteDTO dto = new RolWriteDTO();
        dto.setNombreRol("ADMIN2");
        dto.setDescripcionRol("falso admin");

        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isForbidden());

        assertThat(rolRepo.findByNombreRol("ADMIN2")).isEmpty();
    }

    @Test
    @DisplayName("no se elimina rol con usuarios asignados (integridad)")
    void noEliminarRolConUsuarios() {
        modelUsuario u = seedUsuario("rol_bound", "rol_bound@test.local", rolUsuario);

        assertThatThrownBy(() -> rolService.eliminarRolSiSinUsuarios(rolUsuario.getIdRol()))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode().value()).isEqualTo(409);
            });

        assertThat(rolRepo.findById(rolUsuario.getIdRol())).isPresent();
        assertThat(usuarioRepo.findById(u.getIdUsuario())).isPresent();
        assertThat(u.getRol().getIdRol()).isEqualTo(rolUsuario.getIdRol());
    }

    @Test
    @DisplayName("sí se puede eliminar rol sin usuarios asignados (servicio)")
    void eliminarRolSinUsuariosOk() {
        modelRolUsuario temporal = new modelRolUsuario();
        temporal.setNombreRol("TEMP_VACIO");
        temporal.setDescripcionRol("sin usuarios");
        temporal = rolRepo.save(temporal);

        rolService.eliminarRolSiSinUsuarios(temporal.getIdRol());
        assertThat(rolRepo.findByNombreRol("TEMP_VACIO")).isEmpty();
    }

    @Test
    @DisplayName("registro público sigue asignando rol USUARIO en servidor sin llamar /api/roles")
    void registroPublicoSigueFuncionando() throws Exception {
        asegurarRolUsuarioId2();
        assertThat(rolRepo.findById(2).orElseThrow().getNombreRol()).isEqualTo("USUARIO");

        RegistroRequestDTO reg = new RegistroRequestDTO();
        reg.setNombreUsuario("reg_roles_6c");
        reg.setEmail("reg_roles_6c@test.local");
        reg.setPasswordUsuario("RegPass1!");

        mockMvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
            .andExpect(status().isCreated());

        modelUsuario creado = usuarioRepo.findByNombreUsuario("reg_roles_6c").orElseThrow();
        assertThat(creado.getRol().getIdRol()).isEqualTo(2);
        assertThat(creado.getRol().getNombreRol()).isEqualTo("USUARIO");
    }

    @Test
    @WithMockUser(roles = "USUARIO")
    @DisplayName("USUARIO no cambia su rol vía módulo de roles")
    void usuarioNoCambiaRolPropioViaRoles() throws Exception {
        modelUsuario u = seedUsuario("self_role", "self_role@test.local", rolUsuario);
        Integer rolAntes = u.getRol().getIdRol();

        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreRol\":\"ELEVADO\",\"descripcionRol\":\"x\"}"))
            .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/usuarios/{id}", u.getIdUsuario())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombreUsuario":"self_role","email":"self_role@test.local","activo":true,"idRol":%d}
                    """.formatted(rolAdmin.getIdRol())))
            .andExpect(status().isForbidden());

        modelUsuario after = usuarioRepo.findById(u.getIdUsuario()).orElseThrow();
        assertThat(after.getRol().getIdRol()).isEqualTo(rolAntes);
        assertThat(after.getRol().getNombreRol()).isEqualTo("USUARIO");
    }
}
