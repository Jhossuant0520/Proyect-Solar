package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoLineaCotizacionComercial;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleCotizacionComercialResponseDTO {

    private Long id;
    private TipoLineaCotizacionComercial tipo;
    private String descripcion;
    private BigDecimal cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal subtotal;
    private Long productoId;
    private String productoNombreSnapshot;
    private Boolean productoActivo;

    public static DetalleCotizacionComercialResponseDTO fromEntity(DetalleCotizacionComercial detalle) {
        return DetalleCotizacionComercialResponseDTO.builder()
            .id(detalle.getId())
            .tipo(detalle.getTipo())
            .descripcion(detalle.getDescripcion())
            .cantidad(detalle.getCantidad())
            .precioUnitario(detalle.getPrecioUnitario())
            .subtotal(detalle.getSubtotal())
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombreSnapshot(detalle.getProductoNombreSnapshot())
            .productoActivo(detalle.getProducto() != null ? detalle.getProducto().isActivo() : null)
            .build();
    }
}
