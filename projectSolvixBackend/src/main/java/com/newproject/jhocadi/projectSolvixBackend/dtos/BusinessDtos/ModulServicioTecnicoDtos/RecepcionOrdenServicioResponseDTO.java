package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.RecepcionOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecepcionOrdenServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private LocalDateTime fechaRecepcion;
    private String usuarioResponsable;
    private boolean clienteConfirmo;
    private String nombreCliente;
    private String documentoCliente;
    private String firmaUrl;
    private String observaciones;

    public static RecepcionOrdenServicioResponseDTO fromEntity(RecepcionOrdenServicio r) {
        return RecepcionOrdenServicioResponseDTO.builder()
            .id(r.getId())
            .ordenServicioId(r.getOrdenServicio() != null ? r.getOrdenServicio().getId() : null)
            .fechaRecepcion(r.getFechaRecepcion())
            .usuarioResponsable(r.getUsuarioResponsable())
            .clienteConfirmo(r.isClienteConfirmo())
            .nombreCliente(r.getNombreCliente())
            .documentoCliente(r.getDocumentoCliente())
            .firmaUrl(r.getFirmaUrl())
            .observaciones(r.getObservaciones())
            .build();
    }
}
