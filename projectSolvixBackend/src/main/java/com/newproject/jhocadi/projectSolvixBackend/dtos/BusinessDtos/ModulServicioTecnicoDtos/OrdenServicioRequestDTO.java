package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OrdenServicioRequestDTO {

    @NotNull(message = "El cliente es obligatorio.")
    private Long clienteId;

    @NotNull(message = "El equipo es obligatorio.")
    private Long equipoId;

    @Size(max = 2000)
    private String problemaReportado;

    @Size(max = 2000)
    private String diagnostico;

    @Size(max = 2000)
    private String trabajoRealizado;

    @Size(max = 1000)
    private String observaciones;
}
