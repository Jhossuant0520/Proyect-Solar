package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProveedorRequestDTO {

    @NotBlank(message = "El nombre del proveedor es obligatorio.")
    @Size(max = 150)
    private String nombre;

    @Size(max = 40)
    private String documento;

    @Size(max = 150)
    private String contacto;

    @Email(message = "El email no es válido.")
    @Size(max = 150)
    private String email;

    @Size(max = 40)
    private String telefono;

    @Size(max = 500)
    private String notas;

    private Boolean activo;
}
