package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.DisponibilidadCatalogo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import lombok.Builder;
import lombok.Data;

/**
 * Contrato público del catálogo. No incluye costo, stock numérico, código de barras
 * ni metadatos administrativos.
 */
@Data
@Builder
public class CatalogoProductoResponseDTO {

    private Long id;
    private String nombre;
    private String marca;
    private String descripcion;
    private BigDecimal precioVentaActual;
    private String imagenUrl;
    private Long categoriaId;
    private String categoriaNombre;
    private DisponibilidadCatalogo disponibilidad;

    public static CatalogoProductoResponseDTO fromEntity(Producto producto) {
        int stock = producto.getStockActual() != null ? producto.getStockActual() : 0;
        return CatalogoProductoResponseDTO.builder()
            .id(producto.getId())
            .nombre(producto.getNombre())
            .marca(producto.getMarca())
            .descripcion(producto.getDescripcion())
            .precioVentaActual(producto.getPrecioVentaActual())
            .imagenUrl(producto.getImagenUrl())
            .categoriaId(producto.getCategoria() != null ? producto.getCategoria().getId() : null)
            .categoriaNombre(producto.getCategoria() != null ? producto.getCategoria().getNombre() : null)
            .disponibilidad(stock > 0 ? DisponibilidadCatalogo.DISPONIBLE : DisponibilidadCatalogo.AGOTADO)
            .build();
    }
}
