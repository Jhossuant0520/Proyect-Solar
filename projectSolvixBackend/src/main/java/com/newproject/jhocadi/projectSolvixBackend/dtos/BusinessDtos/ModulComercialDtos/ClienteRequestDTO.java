package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClienteRequestDTO {

    @NotBlank(message = "El nombre del cliente es obligatorio.")
    @Size(max = 150)
    private String nombre;

    /** Si se omite se asume PERSONA. CONSUMIDOR_FINAL es gestionado por el sistema. */
    private TipoCliente tipoCliente;

    private TipoDocumento tipoDocumento;

    @Size(max = 40)
    private String numeroDocumento;

    @Email(message = "El email no es válido.")
    @Size(max = 150)
    private String email;

    @Size(max = 40)
    private String telefono;

    @Size(max = 500)
    private String notas;

    private Boolean activo;
}
