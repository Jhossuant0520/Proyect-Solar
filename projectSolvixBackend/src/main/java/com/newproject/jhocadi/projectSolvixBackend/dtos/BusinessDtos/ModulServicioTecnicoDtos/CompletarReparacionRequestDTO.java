package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Completar reparación de forma atómica (EN_REPARACION → LISTO).
 */
@Data
public class CompletarReparacionRequestDTO {

    @NotBlank(message = "El trabajo realizado es obligatorio.")
    @Size(max = 2000, message = "El trabajo realizado no puede superar 2000 caracteres.")
    private String trabajoRealizado;

    @Size(max = 1000, message = "Las observaciones no pueden superar 1000 caracteres.")
    private String observaciones;
}
