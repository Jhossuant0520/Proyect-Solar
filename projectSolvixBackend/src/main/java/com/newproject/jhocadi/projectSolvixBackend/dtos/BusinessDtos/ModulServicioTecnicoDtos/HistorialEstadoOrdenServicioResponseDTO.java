package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.HistorialEstadoOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HistorialEstadoOrdenServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private EstadoOrdenServicio estadoAnterior;
    private EstadoOrdenServicio estadoNuevo;
    private String motivo;
    private String observacion;
    private String usuario;
    private LocalDateTime fechaCambio;

    public static HistorialEstadoOrdenServicioResponseDTO fromEntity(HistorialEstadoOrdenServicio h) {
        return HistorialEstadoOrdenServicioResponseDTO.builder()
            .id(h.getId())
            .ordenServicioId(h.getOrdenServicio() != null ? h.getOrdenServicio().getId() : null)
            .estadoAnterior(h.getEstadoAnterior())
            .estadoNuevo(h.getEstadoNuevo())
            .motivo(h.getMotivo())
            .observacion(h.getObservacion())
            .usuario(h.getUsuario())
            .fechaCambio(h.getFechaCambio())
            .build();
    }
}
