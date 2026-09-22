package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EntregaOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EntregaOrdenServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private LocalDateTime fechaEntrega;
    private String usuarioResponsable;
    private boolean clienteConfirmo;
    private String nombreCliente;
    private String documentoCliente;
    private String firmaUrl;
    private String observaciones;

    public static EntregaOrdenServicioResponseDTO fromEntity(EntregaOrdenServicio e) {
        return EntregaOrdenServicioResponseDTO.builder()
            .id(e.getId())
            .ordenServicioId(e.getOrdenServicio() != null ? e.getOrdenServicio().getId() : null)
            .fechaEntrega(e.getFechaEntrega())
            .usuarioResponsable(e.getUsuarioResponsable())
            .clienteConfirmo(e.isClienteConfirmo())
            .nombreCliente(e.getNombreCliente())
            .documentoCliente(e.getDocumentoCliente())
            .firmaUrl(e.getFirmaUrl())
            .observaciones(e.getObservaciones())
            .build();
    }
}
