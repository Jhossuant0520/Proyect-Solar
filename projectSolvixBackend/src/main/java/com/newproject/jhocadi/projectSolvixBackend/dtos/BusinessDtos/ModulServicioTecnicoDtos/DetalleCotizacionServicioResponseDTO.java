package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DetalleCotizacionServicioResponseDTO {

    private Long id;
    private TipoDetalleCotizacionServicio tipo;
    private String descripcion;
    private BigDecimal cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal subtotal;
    private Long productoId;
    private String productoNombreSnapshot;
    private Long ordenServicioRepuestoId;

    public static DetalleCotizacionServicioResponseDTO fromEntity(DetalleCotizacionServicio detalle) {
        return DetalleCotizacionServicioResponseDTO.builder()
            .id(detalle.getId())
            .tipo(detalle.getTipo())
            .descripcion(detalle.getDescripcion())
            .cantidad(detalle.getCantidad())
            .precioUnitario(detalle.getPrecioUnitario())
            .subtotal(detalle.getSubtotal())
            .productoId(detalle.getProducto() != null ? detalle.getProducto().getId() : null)
            .productoNombreSnapshot(detalle.getProductoNombreSnapshot())
            .ordenServicioRepuestoId(
                detalle.getOrdenServicioRepuesto() != null
                    ? detalle.getOrdenServicioRepuesto().getId()
                    : null)
            .build();
    }
}
