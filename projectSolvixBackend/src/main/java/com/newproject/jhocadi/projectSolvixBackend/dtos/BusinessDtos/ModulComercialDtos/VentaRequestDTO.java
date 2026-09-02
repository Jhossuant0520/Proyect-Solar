package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPago;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VentaRequestDTO {

    /** Si se omite, la venta se asocia al Consumidor final del sistema. */
    private Long clienteId;

    /** Fecha de negocio. Si se omite se usa la fecha actual. */
    private LocalDateTime fecha;

    private MetodoPago metodoPago;

    @DecimalMin(value = "0.0", inclusive = true, message = "El descuento no puede ser negativo.")
    private BigDecimal descuento;

    @Size(max = 1000)
    private String observaciones;

    @NotEmpty(message = "La venta debe tener al menos un producto.")
    @Valid
    private List<DetalleVentaRequestDTO> detalles;
}
