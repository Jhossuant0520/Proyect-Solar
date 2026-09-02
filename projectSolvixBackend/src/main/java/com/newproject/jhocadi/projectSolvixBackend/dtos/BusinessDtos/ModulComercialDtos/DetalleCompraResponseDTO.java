package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCompra;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleCompraResponseDTO {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private String categoriaCodigo;
    private Integer cantidad;
    private BigDecimal costoUnitario;
    private BigDecimal subtotal;
    private Integer cantidadDevuelta;

    public static DetalleCompraResponseDTO fromEntity(DetalleCompra detalle) {
        return DetalleCompraResponseDTO.builder()
            .id(detalle.getId())
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombre(detalle.getProductoNombre())
            .categoriaCodigo(detalle.getCategoriaCodigo())
            .cantidad(detalle.getCantidad())
            .costoUnitario(detalle.getCostoUnitario())
            .subtotal(detalle.getSubtotal())
            .cantidadDevuelta(detalle.getCantidadDevuelta())
            .build();
    }
}
