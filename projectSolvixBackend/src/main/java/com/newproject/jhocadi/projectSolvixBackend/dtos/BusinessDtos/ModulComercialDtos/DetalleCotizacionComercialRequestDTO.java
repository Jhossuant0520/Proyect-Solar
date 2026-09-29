package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoLineaCotizacionComercial;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DetalleCotizacionComercialRequestDTO {

    @NotNull(message = "El tipo de línea es obligatorio.")
    private TipoLineaCotizacionComercial tipo;

    @Size(max = 255, message = "La descripción no puede superar 255 caracteres.")
    private String descripcion;

    @NotNull(message = "La cantidad es obligatoria.")
    @DecimalMin(value = "0.01", inclusive = true, message = "La cantidad debe ser mayor que cero.")
    private BigDecimal cantidad;

    /** Si se omite en una línea PRODUCTO se toma el precio de venta vigente. */
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio unitario no puede ser negativo.")
    private BigDecimal precioUnitario;

    private Long productoId;
}
