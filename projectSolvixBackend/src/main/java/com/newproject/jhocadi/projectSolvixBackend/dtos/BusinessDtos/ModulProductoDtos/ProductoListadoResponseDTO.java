package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import lombok.Builder;
import lombok.Data;

/**
 * Respuesta resumida del listado administrativo de productos.
 * No incluye costo: el costo solo se expone en detalle / creación / actualización.
 */
@Data
@Builder
public class ProductoListadoResponseDTO {

    private Long id;
    private String nombre;
    private String marca;
    /** null cuando el producto no tiene código de barras registrado. */
    private String codigoBarras;
    private Long categoriaId;
    private String categoriaCodigo;
    private String categoriaNombre;
    private BigDecimal precioVentaActual;
    private Integer stockActual;
    private String descripcion;
    private String imagenUrl;
    private boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    public static ProductoListadoResponseDTO fromEntity(Producto producto) {
        return ProductoListadoResponseDTO.builder()
            .id(producto.getId())
            .nombre(producto.getNombre())
            .marca(producto.getMarca())
            .codigoBarras(producto.getCodigoBarras())
            .categoriaId(producto.getCategoria() != null ? producto.getCategoria().getId() : null)
            .categoriaCodigo(producto.getCategoria() != null ? producto.getCategoria().getCodigo() : null)
            .categoriaNombre(producto.getCategoria() != null ? producto.getCategoria().getNombre() : null)
            .precioVentaActual(producto.getPrecioVentaActual())
            .stockActual(producto.getStockActual())
            .descripcion(producto.getDescripcion())
            .imagenUrl(producto.getImagenUrl())
            .activo(producto.isActivo())
            .fechaCreacion(producto.getFechaCreacion())
            .fechaActualizacion(producto.getFechaActualizacion())
            .build();
    }
}
