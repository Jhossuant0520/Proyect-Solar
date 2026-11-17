package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Alta administrativa de rol.
 * No acepta {@code idRol}: el identificador lo genera el servidor.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RolWriteDTO {

    @NotBlank
    private String nombreRol;

    private String descripcionRol;
}
