package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsultaOtPublicaDTO {

    private String numero;
    private String estadoPublico;
    private String equipoTipo;
    private String equipoMarca;
    private String equipoModelo;
    private String referenciaInterna;
    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaActualizacion;
    private String mensaje;
}
