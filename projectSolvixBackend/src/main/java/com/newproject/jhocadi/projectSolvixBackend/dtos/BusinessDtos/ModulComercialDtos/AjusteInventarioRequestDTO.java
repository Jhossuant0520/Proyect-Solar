package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AjusteInventarioRequestDTO {

    @NotNull(message = "El producto es obligatorio.")
    private Long productoId;

    /** Solo se aceptan AJUSTE_ENTRADA, AJUSTE_SALIDA o MERMA. */
    @NotNull(message = "El tipo de ajuste es obligatorio.")
    private TipoMovimientoInventario tipo;

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad debe ser mayor que cero.")
    private Integer cantidad;

    @Size(max = 500)
    private String observaciones;
}
