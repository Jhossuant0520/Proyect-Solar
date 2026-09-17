package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Nueva falla durante reparación → REQUIERE_APROBACION_ADICIONAL.
 * La cotización formal de ampliación queda para la fase 3.15.7.
 */
@Data
public class RegistrarNuevaFallaRequestDTO {

    @NotBlank(message = "Describe la nueva falla o situación detectada.")
    @Size(max = 500, message = "La descripción no puede superar 500 caracteres.")
    private String nuevaFalla;

    @Size(max = 1000, message = "La observación no puede superar 1000 caracteres.")
    private String observacion;
}
