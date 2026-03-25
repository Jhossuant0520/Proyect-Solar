package com.newproject.jhocadi.projectSolarFishBackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.CambiarPasswordDTO;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelRolUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryRolUsuario;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class serviceUsuario {

    private final repositoryUsuario usuarioRepo;
    private final repositoryRolUsuario rolRepo;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public void actualizarUltimoLogin(modelUsuario usuario) {
        usuarioRepo.save(usuario); // ya tiene el nuevo valor en el campo
    }
    

    public modelUsuario guardarUsuario(modelUsuario usuario) {
        if (usuario == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no puede ser nulo");
        }
        usuario.setPasswordUsuario(passwordEncoder.encode(usuario.getPasswordUsuario())); // Encriptar contraseña
        return usuarioRepo.save(usuario);
    }

    public Optional<modelUsuario> validarCredenciales(String nombreUsuario, String passwordPlano) {
        Optional<modelUsuario> optionalUsuario = usuarioRepo.findByNombreUsuario(nombreUsuario);

        if (optionalUsuario.isPresent()) {
            modelUsuario usuario = optionalUsuario.get();
            if (passwordEncoder.matches(passwordPlano, usuario.getPasswordUsuario())) {
                return Optional.of(usuario);
            }
        }

        return Optional.empty(); // credenciales inválidas
    }

    public modelUsuario registrarUsuario(RegistroRequestDTO dto) {
        if (usuarioRepo.findByNombreUsuario(dto.getNombreUsuario()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        if (usuarioRepo.findByEmail(dto.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado");
        }

        modelRolUsuario rol = rolRepo.findById(2)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol de usuario no configurado"));

        String token = UUID.randomUUID().toString();

        modelUsuario usuario = modelUsuario.builder()
                .nombreUsuario(dto.getNombreUsuario())
                .email(dto.getEmail())
                .passwordUsuario(passwordEncoder.encode(dto.getPasswordUsuario()))
                .activo(true)
                .emailVerificado(false)
                .tokenVerificacion(token)
                .tokenVerificacionExpiracion(LocalDateTime.now().plusHours(24))
                .rol(rol)
                .build();

        modelUsuario usuarioGuardado = usuarioRepo.save(usuario);
        emailService.enviarEmailVerificacion(dto.getEmail(), token);

        return usuarioGuardado;
    }

    public modelUsuario obtenerPorNombreUsuario(String nombreUsuario) {
        return usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    public void cambiarPassword(String nombreUsuario, CambiarPasswordDTO dto) {
        modelUsuario usuario = usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (!passwordEncoder.matches(dto.getPasswordActual(), usuario.getPasswordUsuario())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta");
        }

        if (!dto.getPasswordNueva().equals(dto.getConfirmarPasswordNueva())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las contraseñas nuevas no coinciden");
        }

        usuario.setPasswordUsuario(passwordEncoder.encode(dto.getPasswordNueva()));
        usuarioRepo.save(usuario);
    }
}
