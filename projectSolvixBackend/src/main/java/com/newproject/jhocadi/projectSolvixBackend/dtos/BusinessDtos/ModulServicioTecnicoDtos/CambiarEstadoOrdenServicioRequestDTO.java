package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CambiarEstadoOrdenServicioRequestDTO {

    @NotNull(message = "El estado destino es obligatorio.")
    private EstadoOrdenServicio estado;
}
