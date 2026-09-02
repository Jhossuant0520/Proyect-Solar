package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DireccionMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MovimientoInventarioResponseDTO {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private TipoMovimientoInventario tipo;
    private DireccionMovimiento direccion;
    private Integer cantidad;
    private Integer stockAnterior;
    private Integer stockNuevo;
    private BigDecimal costoUnitario;

    /** Costo vigente del producto tras el movimiento. Base de la valuación histórica. */
    private BigDecimal costoProductoResultante;

    private LocalDateTime fecha;
    private ReferenciaMovimiento referenciaTipo;
    private Long referenciaId;
    private String usuarioRegistro;
    private String observaciones;

    public static MovimientoInventarioResponseDTO fromEntity(MovimientoInventario movimiento) {
        return MovimientoInventarioResponseDTO.builder()
            .id(movimiento.getId())
            .productoId(movimiento.getProducto() != null ? movimiento.getProducto().getId() : null)
            .productoNombre(movimiento.getProducto() != null ? movimiento.getProducto().getNombre() : null)
            .tipo(movimiento.getTipo())
            .direccion(movimiento.getDireccion())
            .cantidad(movimiento.getCantidad())
            .stockAnterior(movimiento.getStockAnterior())
            .stockNuevo(movimiento.getStockNuevo())
            .costoUnitario(movimiento.getCostoUnitario())
            .costoProductoResultante(movimiento.getCostoProductoResultante())
            .fecha(movimiento.getFecha())
            .referenciaTipo(movimiento.getReferenciaTipo())
            .referenciaId(movimiento.getReferenciaId())
            .usuarioRegistro(movimiento.getUsuarioRegistro())
            .observaciones(movimiento.getObservaciones())
            .build();
    }
}
