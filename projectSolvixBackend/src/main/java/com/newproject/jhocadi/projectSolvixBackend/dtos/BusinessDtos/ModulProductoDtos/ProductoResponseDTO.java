package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductoResponseDTO {

    private Long id;
    private String nombre;
    private String marca;
    private CategoriaProducto categoria;
    private BigDecimal precio;
    private Integer cantidadStock;
    private String descripcion;
    private String imagenUrl;
    private boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    public static ProductoResponseDTO fromEntity(Producto producto) {
        return ProductoResponseDTO.builder()
            .id(producto.getId())
            .nombre(producto.getNombre())
            .marca(producto.getMarca())
            .categoria(producto.getCategoria())
            .precio(producto.getPrecio())
            .cantidadStock(producto.getCantidadStock())
            .descripcion(producto.getDescripcion())
            .imagenUrl(producto.getImagenUrl())
            .activo(producto.isActivo())
            .fechaCreacion(producto.getFechaCreacion())
            .fechaActualizacion(producto.getFechaActualizacion())
            .build();
    }
}
