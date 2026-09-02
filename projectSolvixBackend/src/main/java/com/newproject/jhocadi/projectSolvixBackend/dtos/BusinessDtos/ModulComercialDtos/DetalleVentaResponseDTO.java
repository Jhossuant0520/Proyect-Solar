package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleVenta;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleVentaResponseDTO {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private String categoriaCodigo;
    private Integer cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal costoUnitario;
    private boolean costoConocido;
    private BigDecimal descuentoLinea;
    private BigDecimal subtotal;
    private Integer cantidadDevuelta;

    public static DetalleVentaResponseDTO fromEntity(DetalleVenta detalle) {
        return DetalleVentaResponseDTO.builder()
            .id(detalle.getId())
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombre(detalle.getProductoNombre())
            .categoriaCodigo(detalle.getCategoriaCodigo())
            .cantidad(detalle.getCantidad())
            .precioUnitario(detalle.getPrecioUnitario())
            .costoUnitario(detalle.getCostoUnitario())
            .costoConocido(detalle.isCostoConocido())
            .descuentoLinea(detalle.getDescuentoLinea())
            .subtotal(detalle.getSubtotal())
            .cantidadDevuelta(detalle.getCantidadDevuelta())
            .build();
    }
}
