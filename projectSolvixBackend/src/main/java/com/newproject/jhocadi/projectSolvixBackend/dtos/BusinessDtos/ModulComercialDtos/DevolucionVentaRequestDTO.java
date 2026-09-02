package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DevolucionVentaRequestDTO {

    @NotEmpty(message = "Debe indicar al menos una línea a devolver.")
    @Valid
    private List<DevolucionLineaDTO> lineas;

    @NotNull(message = "El motivo de la devolución es obligatorio.")
    private MotivoDevolucion motivo;

    /** Si se informa, la devolución queda como REEMBOLSADA. */
    private MetodoReembolso metodoReembolso;

    /** Fecha de negocio. Si se omite se usa la fecha actual. */
    private LocalDateTime fecha;

    @Size(max = 1000)
    private String observaciones;
}
