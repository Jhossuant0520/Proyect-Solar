package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DetalleCompraRequestDTO {

    @NotNull(message = "El producto es obligatorio.")
    private Long productoId;

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad debe ser mayor que cero.")
    private Integer cantidad;

    @NotNull(message = "El costo unitario es obligatorio.")
    @DecimalMin(value = "0.0", inclusive = true, message = "El costo unitario no puede ser negativo.")
    private BigDecimal costoUnitario;

    @Size(max = 80)
    private String referenciaProveedor;

    @DecimalMin(value = "0.0", inclusive = true, message = "El porcentaje de impuesto no puede ser negativo.")
    private BigDecimal porcentajeImpuesto;

    /**
     * Ignorado en alta (FASE 3.15.11-C).
     * El backend calcula {@code valorImpuesto} desde porcentaje × subtotal de línea.
     * Conservado en el DTO solo por compatibilidad de deserialización.
     */
    @Deprecated
    @DecimalMin(value = "0.0", inclusive = true, message = "El valor de impuesto no puede ser negativo.")
    private BigDecimal valorImpuesto;
}
