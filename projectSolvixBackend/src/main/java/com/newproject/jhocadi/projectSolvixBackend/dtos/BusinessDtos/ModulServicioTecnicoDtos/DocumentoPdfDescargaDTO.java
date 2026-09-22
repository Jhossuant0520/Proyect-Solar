package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import org.springframework.core.io.Resource;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentoPdfDescargaDTO {

    private Resource resource;
    private String nombreArchivo;
    private String hashSha256;
}
