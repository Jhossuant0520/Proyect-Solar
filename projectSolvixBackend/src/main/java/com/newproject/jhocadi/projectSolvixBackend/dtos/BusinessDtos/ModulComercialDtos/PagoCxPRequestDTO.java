package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPagoCxP;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PagoCxPRequestDTO {

    @NotNull(message = "El valor del pago es obligatorio.")
    @DecimalMin(value = "0.01", message = "El valor del pago debe ser mayor que cero.")
    private BigDecimal valor;

    private LocalDateTime fecha;

    @NotNull(message = "El método de pago es obligatorio.")
    private MetodoPagoCxP metodoPago;

    @Size(max = 120)
    private String referencia;

    @Size(max = 1000)
    private String observacion;
}
