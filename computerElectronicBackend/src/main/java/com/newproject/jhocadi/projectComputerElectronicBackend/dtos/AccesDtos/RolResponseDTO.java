package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RolResponseDTO {

    private Integer idRol;
    private String nombreRol;
    private String descripcionRol;

    public static RolResponseDTO fromEntity(modelRolUsuario rol) {
        return RolResponseDTO.builder()
            .idRol(rol.getIdRol())
            .nombreRol(rol.getNombreRol())
            .descripcionRol(rol.getDescripcionRol())
            .build();
    }
}
