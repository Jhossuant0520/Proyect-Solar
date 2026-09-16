package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;

import lombok.Builder;
import lombok.Data;

/** Categoría visible en el catálogo público. Solo datos de vitrina. */
@Data
@Builder
public class CatalogoCategoriaResponseDTO {

    private Long id;
    private String codigo;
    private String nombre;

    public static CatalogoCategoriaResponseDTO fromEntity(CategoriaProducto categoria) {
        return CatalogoCategoriaResponseDTO.builder()
            .id(categoria.getId())
            .codigo(categoria.getCodigo())
            .nombre(categoria.getNombre())
            .build();
    }
}
