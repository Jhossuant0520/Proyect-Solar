package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Registro de entrega digital (LISTO → ENTREGADO → CERRADO).
 */
@Data
public class RegistrarEntregaRequestDTO {

    /** Debe ser true: el cliente confirma la recepción. */
    private boolean clienteConfirmo;

    @Size(max = 150, message = "El nombre del cliente no puede superar 150 caracteres.")
    private String nombreCliente;

    @Size(max = 50, message = "El documento del cliente no puede superar 50 caracteres.")
    private String documentoCliente;

    @NotBlank(message = "La firma del cliente es obligatoria.")
    private String firmaBase64;

    @Size(max = 1000, message = "Las observaciones no pueden superar 1000 caracteres.")
    private String observaciones;

    @AssertTrue(message = "El cliente debe confirmar la recepción del equipo.")
    public boolean isClienteConfirmoValido() {
        return clienteConfirmo;
    }
}
