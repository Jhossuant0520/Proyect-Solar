package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompraResponseDTO {

    private Long id;
    private String numero;
    private LocalDateTime fecha;
    private Long proveedorId;
    private String proveedorNombre;
    private BigDecimal subtotal;
    private BigDecimal descuento;
    private BigDecimal total;
    private EstadoCompra estado;
    private String observaciones;
    private LocalDateTime fechaCompletada;
    private LocalDateTime fechaAnulada;
    private String createdBy;
    private List<DetalleCompraResponseDTO> detalles;

    public static CompraResponseDTO fromEntity(Compra compra) {
        return CompraResponseDTO.builder()
            .id(compra.getId())
            .numero(compra.getNumero())
            .fecha(compra.getFecha())
            .proveedorId(compra.getProveedor() != null ? compra.getProveedor().getId() : null)
            .proveedorNombre(compra.getProveedor() != null ? compra.getProveedor().getNombre() : null)
            .subtotal(compra.getSubtotal())
            .descuento(compra.getDescuento())
            .total(compra.getTotal())
            .estado(compra.getEstado())
            .observaciones(compra.getObservaciones())
            .fechaCompletada(compra.getFechaCompletada())
            .fechaAnulada(compra.getFechaAnulada())
            .createdBy(compra.getCreatedBy())
            .detalles(compra.getDetalles().stream().map(DetalleCompraResponseDTO::fromEntity).toList())
            .build();
    }
}
