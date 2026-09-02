package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DetalleVentaRequestDTO {

    @NotNull(message = "El producto es obligatorio.")
    private Long productoId;

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad debe ser mayor que cero.")
    private Integer cantidad;

    /** Si se omite se toma el precio de venta vigente del producto. */
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio unitario no puede ser negativo.")
    private BigDecimal precioUnitario;

    @DecimalMin(value = "0.0", inclusive = true, message = "El descuento no puede ser negativo.")
    private BigDecimal descuentoLinea;
}
