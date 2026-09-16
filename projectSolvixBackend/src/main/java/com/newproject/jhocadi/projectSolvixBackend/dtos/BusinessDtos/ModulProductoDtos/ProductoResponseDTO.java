package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductoResponseDTO {

    private Long id;
    private String nombre;
    private String marca;
    /** null cuando el producto no tiene código de barras registrado. */
    private String codigoBarras;
    private Long categoriaId;
    private String categoriaCodigo;
    private String categoriaNombre;
    private BigDecimal precioVentaActual;
    private BigDecimal costoActual;
    /** false cuando el producto aún no tiene un costo real registrado. */
    private boolean costoConocido;
    private Integer stockActual;
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
            .codigoBarras(producto.getCodigoBarras())
            .categoriaId(producto.getCategoria() != null ? producto.getCategoria().getId() : null)
            .categoriaCodigo(producto.getCategoria() != null ? producto.getCategoria().getCodigo() : null)
            .categoriaNombre(producto.getCategoria() != null ? producto.getCategoria().getNombre() : null)
            .precioVentaActual(producto.getPrecioVentaActual())
            .costoActual(producto.getCostoActual())
            .costoConocido(producto.tieneCostoConocido())
            .stockActual(producto.getStockActual())
            .descripcion(producto.getDescripcion())
            .imagenUrl(producto.getImagenUrl())
            .activo(producto.isActivo())
            .fechaCreacion(producto.getFechaCreacion())
            .fechaActualizacion(producto.getFechaActualizacion())
            .build();
    }
}
