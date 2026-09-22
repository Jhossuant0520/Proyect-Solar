package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsultaDocumentoPublicoDTO {

    private TipoDocumentoOrdenServicio tipoDocumento;
    private String tipoDocumentoEtiqueta;
    private String numeroOt;
    private LocalDateTime fechaGeneracion;
    private String mensaje;
}
