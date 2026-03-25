package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CambiarPasswordDTO {

    @NotBlank
    private String passwordActual;

    @NotBlank
    @Size(min = 8, message = "La nueva contraseña debe tener mínimo 8 caracteres")
    private String passwordNueva;

    @NotBlank
    private String confirmarPasswordNueva;
}
