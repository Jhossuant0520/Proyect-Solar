package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoAjusteCosto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Corrección explícita del costo vigente de un producto. No mueve stock. */
@Data
public class AjusteCostoRequestDTO {

    @NotNull(message = "El producto es obligatorio.")
    private Long productoId;

    @NotNull(message = "El costo nuevo es obligatorio.")
    @DecimalMin(value = "0.0", message = "El costo no puede ser negativo.")
    private BigDecimal costoNuevo;

    @NotNull(message = "El motivo del ajuste de costo es obligatorio.")
    private MotivoAjusteCosto motivo;

    @Size(max = 500)
    private String observaciones;
}
