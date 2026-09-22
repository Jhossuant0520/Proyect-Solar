package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegistrarEntregaResponseDTO {

    private OrdenServicioResponseDTO orden;
    private EntregaOrdenServicioResponseDTO entrega;
    private String mensaje;
}
