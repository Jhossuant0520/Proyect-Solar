package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransicionOrdenServicioResponseDTO {

    private OrdenServicioResponseDTO orden;
    private EstadoOrdenServicio estadoAnterior;
    private EstadoOrdenServicio estadoNuevo;
    private String motivo;
    private String observacion;
    private String usuario;
    private LocalDateTime fechaCambio;
    private String mensaje;
}
