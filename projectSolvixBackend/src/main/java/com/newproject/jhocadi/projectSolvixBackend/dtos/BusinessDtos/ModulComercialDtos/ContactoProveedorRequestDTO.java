package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoContactoProveedor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContactoProveedorRequestDTO {

    private Long id;

    @NotBlank(message = "El nombre del contacto es obligatorio.")
    @Size(max = 150)
    private String nombre;

    @Size(max = 100)
    private String cargo;

    @Size(max = 40)
    private String telefono;

    @Size(max = 40)
    private String celular;

    @Email(message = "El email del contacto no es válido.")
    @Size(max = 150)
    private String email;

    private TipoContactoProveedor tipoContacto;

    private Boolean principal;

    private Boolean activo;
}
