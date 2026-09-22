package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DetalleCotizacionServicioRequestDTO {

    @NotNull(message = "El tipo de línea es obligatorio.")
    private TipoDetalleCotizacionServicio tipo;

    @Size(max = 255, message = "La descripción no puede superar 255 caracteres.")
    private String descripcion;

    @NotNull(message = "La cantidad es obligatoria.")
    @DecimalMin(value = "0.01", inclusive = true, message = "La cantidad debe ser mayor que cero.")
    private BigDecimal cantidad;

    @DecimalMin(value = "0.0", inclusive = true, message = "El precio unitario no puede ser negativo.")
    private BigDecimal precioUnitario;

    private Long productoId;

    private Long ordenServicioRepuestoId;
}
