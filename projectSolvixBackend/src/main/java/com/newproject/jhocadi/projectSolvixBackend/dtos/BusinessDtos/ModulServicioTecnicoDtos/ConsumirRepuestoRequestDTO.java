package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConsumirRepuestoRequestDTO {

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad a consumir debe ser mayor que cero.")
    private Integer cantidad;
}
