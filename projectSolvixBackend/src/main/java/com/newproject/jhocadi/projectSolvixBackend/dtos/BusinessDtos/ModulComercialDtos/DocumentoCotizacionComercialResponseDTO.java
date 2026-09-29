package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DocumentoCotizacionComercial;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentoCotizacionComercialResponseDTO {

    private Long id;
    private Long cotizacionId;
    private int version;
    private String nombreArchivo;
    private String hashSha256;
    private LocalDateTime fechaGeneracion;
    private String usuarioGeneracion;

    public static DocumentoCotizacionComercialResponseDTO fromEntity(DocumentoCotizacionComercial doc) {
        return DocumentoCotizacionComercialResponseDTO.builder()
            .id(doc.getId())
            .cotizacionId(doc.getCotizacion() != null ? doc.getCotizacion().getId() : null)
            .version(doc.getVersion())
            .nombreArchivo(doc.getNombreArchivo())
            .hashSha256(doc.getHashSha256())
            .fechaGeneracion(doc.getFechaGeneracion())
            .usuarioGeneracion(doc.getUsuarioGeneracion())
            .build();
    }
}
