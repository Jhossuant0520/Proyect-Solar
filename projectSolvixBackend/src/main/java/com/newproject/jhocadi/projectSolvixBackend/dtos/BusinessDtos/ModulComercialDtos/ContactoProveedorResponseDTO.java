package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ContactoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoContactoProveedor;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ContactoProveedorResponseDTO {

    private Long id;
    private String nombre;
    private String cargo;
    private String telefono;
    private String celular;
    private String email;
    private TipoContactoProveedor tipoContacto;
    private boolean principal;
    private boolean activo;
    private LocalDateTime fechaRegistro;
    private LocalDateTime fechaActualizacion;

    public static ContactoProveedorResponseDTO fromEntity(ContactoProveedor contacto) {
        return ContactoProveedorResponseDTO.builder()
            .id(contacto.getId())
            .nombre(contacto.getNombre())
            .cargo(contacto.getCargo())
            .telefono(contacto.getTelefono())
            .celular(contacto.getCelular())
            .email(contacto.getEmail())
            .tipoContacto(contacto.getTipoContacto())
            .principal(contacto.isPrincipal())
            .activo(contacto.isActivo())
            .fechaRegistro(contacto.getFechaRegistro())
            .fechaActualizacion(contacto.getFechaActualizacion())
            .build();
    }
}
