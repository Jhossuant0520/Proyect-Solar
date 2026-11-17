package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoriaProductoResponseDTO {

    private Long id;
    private String codigo;
    private String nombre;
    private boolean activo;
    private LocalDateTime fechaCreacion;

    public static CategoriaProductoResponseDTO fromEntity(CategoriaProducto categoria) {
        return CategoriaProductoResponseDTO.builder()
            .id(categoria.getId())
            .codigo(categoria.getCodigo())
            .nombre(categoria.getNombre())
            .activo(categoria.isActivo())
            .fechaCreacion(categoria.getFechaCreacion())
            .build();
    }
}
