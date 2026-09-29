package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import lombok.Builder;
import lombok.Data;

/**
 * Datos de contacto publicables del taller (los mismos del pie de los PDFs).
 * Campos vacíos viajan como null para que la UI no muestre huecos.
 */
@Data
@Builder
public class ContactoTallerPublicoDTO {

    private String empresa;
    private String telefono;
    private String whatsapp;
    private String direccion;
    private String sitioWeb;
}
