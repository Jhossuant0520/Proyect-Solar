package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProveedorResponseDTO {

    private Long id;
    private String nombre;
    private String documento;
    private String contacto;
    private String email;
    private String telefono;
    private String notas;
    private boolean activo;
    private LocalDateTime fechaRegistro;

    public static ProveedorResponseDTO fromEntity(Proveedor proveedor) {
        return ProveedorResponseDTO.builder()
            .id(proveedor.getId())
            .nombre(proveedor.getNombre())
            .documento(proveedor.getDocumento())
            .contacto(proveedor.getContacto())
            .email(proveedor.getEmail())
            .telefono(proveedor.getTelefono())
            .notas(proveedor.getNotas())
            .activo(proveedor.isActivo())
            .fechaRegistro(proveedor.getFechaRegistro())
            .build();
    }
}
