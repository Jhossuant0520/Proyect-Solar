package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.CambiarPasswordDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.JwtUtil;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CuentaSecurityContextTest {

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

    @Autowired
    private JwtUtil jwtUtil;

    private modelUsuario usuario;

    @BeforeEach
    void seed() {
        modelRolUsuario rol = rolRepo.findByNombreRol("USUARIO").orElseGet(() -> {
            modelRolUsuario r = new modelRolUsuario();
            r.setNombreRol("USUARIO");
            r.setDescripcionRol("Usuario");
            return rolRepo.save(r);
        });
        usuario = usuarioRepo.save(modelUsuario.builder()
            .nombreUsuario("cuenta_ctx_user")
            .email("cuenta_ctx_user@test.local")
            .passwordUsuario(passwordEncoder.encode("SecretPass1!"))
            .activo(true)
            .emailVerificado(true)
            .rol(rol)
            .fotoUrl(null)
            .build());
    }

    @Test
    @DisplayName("sin autenticación → 401 en /api/cuenta/mis-datos")
    void sinAuth401() throws Exception {
        mockMvc.perform(get("/api/cuenta/mis-datos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT válido → mis-datos usa identidad del SecurityContext")
    void misDatosConJwtOk() throws Exception {
        String token = jwtUtil.generateToken(usuario.getNombreUsuario(), "USUARIO");

        mockMvc.perform(get("/api/cuenta/mis-datos")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombreUsuario").value("cuenta_ctx_user"))
            .andExpect(jsonPath("$.email").value("cuenta_ctx_user@test.local"))
            .andExpect(jsonPath("$.fotoUrl").value(nullValue()));
    }

    @Test
    @DisplayName("JWT válido → cambiar-password opera sobre el usuario autenticado")
    void cambiarPasswordConJwtOk() throws Exception {
        String token = jwtUtil.generateToken(usuario.getNombreUsuario(), "USUARIO");
        CambiarPasswordDTO dto = new CambiarPasswordDTO();
        dto.setPasswordActual("SecretPass1!");
        dto.setPasswordNueva("NuevaPass2!");
        dto.setConfirmarPasswordNueva("NuevaPass2!");

        mockMvc.perform(put("/api/cuenta/cambiar-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mensaje").value("Contraseña actualizada correctamente"));
    }
}
