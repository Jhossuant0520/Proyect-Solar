package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleDevolucionVenta;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleDevolucionVentaResponseDTO {

    private Long id;
    private Long detalleVentaId;
    private Long productoId;
    private String productoNombre;
    private String categoriaCodigo;
    private Integer cantidad;
    private BigDecimal montoDevuelto;
    private BigDecimal costoUnitario;
    private boolean costoConocido;

    public static DetalleDevolucionVentaResponseDTO fromEntity(DetalleDevolucionVenta detalle) {
        return DetalleDevolucionVentaResponseDTO.builder()
            .id(detalle.getId())
            .detalleVentaId(detalle.getDetalleVenta() != null ? detalle.getDetalleVenta().getId() : null)
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombre(detalle.getDetalleVenta() != null ? detalle.getDetalleVenta().getProductoNombre() : null)
            .categoriaCodigo(detalle.getDetalleVenta() != null ? detalle.getDetalleVenta().getCategoriaCodigo() : null)
            .cantidad(detalle.getCantidad())
            .montoDevuelto(detalle.getMontoDevuelto())
            .costoUnitario(detalle.getCostoUnitario())
            .costoConocido(detalle.isCostoConocido())
            .build();
    }
}
