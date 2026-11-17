package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Alta/edición administrativa de usuario.
 * {@code passwordUsuario} es obligatorio en creación; en actualización, vacío/nulo conserva el hash actual.
 * El rol se toma solo de {@code idRol} resuelto en servidor (no se confía en un objeto rol del cliente).
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UsuarioAdminWriteDTO {

    @NotBlank
    private String nombreUsuario;

    @NotBlank
    @Email
    private String email;

    /** Plano. Obligatorio al crear; opcional al actualizar. */
    private String passwordUsuario;

    @NotNull
    private Boolean activo;

    @NotNull
    private Integer idRol;
}
