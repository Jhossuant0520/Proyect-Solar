package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentoOrdenServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private TipoDocumentoOrdenServicio tipoDocumento;
    private String tipoDocumentoEtiqueta;
    private Long cotizacionId;
    private Integer version;
    private String nombreArchivo;
    private String hashSha256;
    private LocalDateTime fechaGeneracion;
    private String usuarioGeneracion;
    private String tokenDocumento;

    public static DocumentoOrdenServicioResponseDTO fromEntity(DocumentoOrdenServicio d) {
        return DocumentoOrdenServicioResponseDTO.builder()
            .id(d.getId())
            .ordenServicioId(d.getOrdenServicio() != null ? d.getOrdenServicio().getId() : null)
            .tipoDocumento(d.getTipoDocumento())
            .tipoDocumentoEtiqueta(d.getTipoDocumento() != null ? d.getTipoDocumento().etiqueta() : null)
            .cotizacionId(d.getCotizacion() != null ? d.getCotizacion().getId() : null)
            .version(d.getVersion())
            .nombreArchivo(d.getNombreArchivo())
            .hashSha256(d.getHashSha256())
            .fechaGeneracion(d.getFechaGeneracion())
            .usuarioGeneracion(d.getUsuarioGeneracion())
            .tokenDocumento(d.getTokenDocumento())
            .build();
    }
}
