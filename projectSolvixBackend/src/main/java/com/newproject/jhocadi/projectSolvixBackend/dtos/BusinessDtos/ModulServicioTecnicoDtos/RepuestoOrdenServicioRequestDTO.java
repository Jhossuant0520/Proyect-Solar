package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RepuestoOrdenServicioRequestDTO {

    /** Obligatorio al planificar. En PUT no debe cambiar el producto. */
    private Long productoId;

    @NotNull(message = "La cantidad planificada es obligatoria.")
    @Min(value = 1, message = "La cantidad planificada debe ser mayor que cero.")
    private Integer cantidadPlanificada;
}
