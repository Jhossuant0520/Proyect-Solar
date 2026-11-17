package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;

import lombok.Builder;
import lombok.Data;

/**
 * Vista segura de usuario para API administrativa.
 * No incluye password hash ni tokens de verificación.
 */
@Data
@Builder
public class UsuarioResponseDTO {

    private Integer idUsuario;
    private String nombreUsuario;
    private String email;
    private boolean activo;
    private boolean emailVerificado;
    private LocalDateTime ultimoLogin;
    private LocalDateTime fechaCreacion;
    private String fotoUrl;
    private Integer idRol;
    private String nombreRol;

    public static UsuarioResponseDTO fromEntity(modelUsuario usuario) {
        modelRolUsuario rol = usuario.getRol();
        return UsuarioResponseDTO.builder()
            .idUsuario(usuario.getIdUsuario())
            .nombreUsuario(usuario.getNombreUsuario())
            .email(usuario.getEmail())
            .activo(usuario.isActivo())
            .emailVerificado(usuario.isEmailVerificado())
            .ultimoLogin(usuario.getUltimoLogin())
            .fechaCreacion(usuario.getFechaCreacion())
            .fotoUrl(usuario.getFotoUrl())
            .idRol(rol != null ? rol.getIdRol() : null)
            .nombreRol(rol != null ? rol.getNombreRol() : null)
            .build();
    }
}
