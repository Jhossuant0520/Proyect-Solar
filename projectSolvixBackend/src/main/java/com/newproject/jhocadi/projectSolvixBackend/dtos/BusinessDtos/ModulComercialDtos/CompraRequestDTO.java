package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompraRequestDTO {

    @NotNull(message = "El proveedor es obligatorio.")
    private Long proveedorId;

    private LocalDateTime fecha;

    @DecimalMin(value = "0.0", inclusive = true, message = "El descuento no puede ser negativo.")
    private BigDecimal descuento;

    @Size(max = 1000)
    private String observaciones;

    @NotEmpty(message = "La compra debe tener al menos un producto.")
    @Valid
    private List<DetalleCompraRequestDTO> detalles;
}
