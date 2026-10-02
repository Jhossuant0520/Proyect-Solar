package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Credenciales de correspondencia de identidad para acciones públicas de cotización.
 */
@Data
public class AccionPublicaCotizacionRequestDTO {

    @NotBlank(message = "El número de documento es obligatorio.")
    @Size(max = 40)
    private String numeroDocumento;

    @NotBlank(message = "El teléfono es obligatorio.")
    @Size(max = 40)
    private String telefono;

    /** Observación opcional al rechazar. */
    @Size(max = 1000)
    private String observacion;
}
