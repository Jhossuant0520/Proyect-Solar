package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DevolucionLineaDTO {

    @NotNull(message = "El detalle a devolver es obligatorio.")
    private Long detalleId;

    @NotNull(message = "La cantidad a devolver es obligatoria.")
    @Min(value = 1, message = "La cantidad a devolver debe ser mayor que cero.")
    private Integer cantidad;
}
