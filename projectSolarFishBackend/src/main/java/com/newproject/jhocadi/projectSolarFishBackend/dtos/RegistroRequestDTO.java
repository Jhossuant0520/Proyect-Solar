package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistroRequestDTO {

    @NotBlank
    @Size(min = 3, max = 50)
    private String nombreUsuario;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "La contraseña debe tener mínimo 8 caracteres")
    private String passwordUsuario;
}
