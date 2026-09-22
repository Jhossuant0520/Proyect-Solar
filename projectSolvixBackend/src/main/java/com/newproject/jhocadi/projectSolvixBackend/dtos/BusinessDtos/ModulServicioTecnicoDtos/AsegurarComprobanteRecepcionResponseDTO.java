package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import lombok.Builder;
import lombok.Data;

/**
 * Respuesta del POST idempotente de comprobante de recepción.
 * {@code ready=true} implica que {@code documento} está disponible para Ver/Descargar.
 */
@Data
@Builder
public class AsegurarComprobanteRecepcionResponseDTO {

    private OutcomeAsegurarComprobante status;
    private boolean ready;
    private DocumentoOrdenServicioResponseDTO documento;
}
