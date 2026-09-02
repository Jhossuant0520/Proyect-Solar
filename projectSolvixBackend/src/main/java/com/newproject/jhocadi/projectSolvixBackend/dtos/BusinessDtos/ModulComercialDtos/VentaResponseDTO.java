package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPago;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VentaResponseDTO {

    private Long id;
    private String numero;
    private LocalDateTime fecha;
    private Long clienteId;
    private String clienteNombre;
    private boolean clienteConsumidorFinal;
    private BigDecimal subtotal;
    private BigDecimal descuento;
    private BigDecimal total;
    private EstadoVenta estado;
    private MetodoPago metodoPago;
    private String observaciones;
    private LocalDateTime fechaCompletada;
    private LocalDateTime fechaAnulada;
    private String createdBy;
    private List<DetalleVentaResponseDTO> detalles;

    public static VentaResponseDTO fromEntity(Venta venta) {
        return VentaResponseDTO.builder()
            .id(venta.getId())
            .numero(venta.getNumero())
            .fecha(venta.getFecha())
            .clienteId(venta.getCliente() != null ? venta.getCliente().getId() : null)
            .clienteNombre(venta.getCliente() != null ? venta.getCliente().getNombre() : null)
            .clienteConsumidorFinal(venta.getCliente() != null && venta.getCliente().esConsumidorFinal())
            .subtotal(venta.getSubtotal())
            .descuento(venta.getDescuento())
            .total(venta.getTotal())
            .estado(venta.getEstado())
            .metodoPago(venta.getMetodoPago())
            .observaciones(venta.getObservaciones())
            .fechaCompletada(venta.getFechaCompletada())
            .fechaAnulada(venta.getFechaAnulada())
            .createdBy(venta.getCreatedBy())
            .detalles(venta.getDetalles().stream().map(DetalleVentaResponseDTO::fromEntity).toList())
            .build();
    }
}
