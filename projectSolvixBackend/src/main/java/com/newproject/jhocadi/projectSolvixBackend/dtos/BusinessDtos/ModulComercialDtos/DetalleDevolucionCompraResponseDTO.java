package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleDevolucionCompra;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleDevolucionCompraResponseDTO {

    private Long id;
    private Long detalleCompraId;
    private Long productoId;
    private String productoNombre;
    private String categoriaCodigo;
    private Integer cantidad;
    private BigDecimal montoDevuelto;
    private BigDecimal costoUnitario;
    private boolean costoConocido;

    public static DetalleDevolucionCompraResponseDTO fromEntity(DetalleDevolucionCompra detalle) {
        var detalleCompra = detalle.getDetalleCompra();

        return DetalleDevolucionCompraResponseDTO.builder()
            .id(detalle.getId())
            .detalleCompraId(detalleCompra != null ? detalleCompra.getId() : null)
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombre(detalleCompra != null ? detalleCompra.getProductoNombre() : null)
            .categoriaCodigo(detalleCompra != null ? detalleCompra.getCategoriaCodigo() : null)
            .cantidad(detalle.getCantidad())
            .montoDevuelto(detalle.getMontoDevuelto())
            .costoUnitario(detalle.getCostoUnitario())
            .costoConocido(detalle.isCostoConocido())
            .build();
    }
}
