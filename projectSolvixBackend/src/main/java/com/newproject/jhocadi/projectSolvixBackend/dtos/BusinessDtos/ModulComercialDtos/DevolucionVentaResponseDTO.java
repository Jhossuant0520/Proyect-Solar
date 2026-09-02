package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DevolucionVentaResponseDTO {

    private Long id;
    private String numero;
    private LocalDateTime fecha;
    private Long ventaId;
    private String ventaNumero;
    /** Total histórico de la venta: no cambia por la devolución. */
    private BigDecimal ventaTotalOriginal;
    private EstadoVenta ventaEstado;
    private Long clienteId;
    private String clienteNombre;
    private MotivoDevolucion motivo;
    private EstadoDevolucionVenta estado;
    private MetodoReembolso metodoReembolso;
    private LocalDateTime fechaReembolso;
    private BigDecimal montoTotalDevuelto;
    private BigDecimal costoTotalDevuelto;
    private boolean costoCompletoConocido;
    private String observaciones;
    private String createdBy;
    private List<DetalleDevolucionVentaResponseDTO> detalles;

    public static DevolucionVentaResponseDTO fromEntity(DevolucionVenta devolucion) {
        var venta = devolucion.getVenta();

        return DevolucionVentaResponseDTO.builder()
            .id(devolucion.getId())
            .numero(devolucion.getNumero())
            .fecha(devolucion.getFecha())
            .ventaId(venta != null ? venta.getId() : null)
            .ventaNumero(venta != null ? venta.getNumero() : null)
            .ventaTotalOriginal(venta != null ? venta.getTotal() : null)
            .ventaEstado(venta != null ? venta.getEstado() : null)
            .clienteId(venta != null && venta.getCliente() != null ? venta.getCliente().getId() : null)
            .clienteNombre(venta != null && venta.getCliente() != null ? venta.getCliente().getNombre() : null)
            .motivo(devolucion.getMotivo())
            .estado(devolucion.getEstado())
            .metodoReembolso(devolucion.getMetodoReembolso())
            .fechaReembolso(devolucion.getFechaReembolso())
            .montoTotalDevuelto(devolucion.getMontoTotalDevuelto())
            .costoTotalDevuelto(devolucion.getCostoTotalDevuelto())
            .costoCompletoConocido(devolucion.isCostoCompletoConocido())
            .observaciones(devolucion.getObservaciones())
            .createdBy(devolucion.getCreatedBy())
            .detalles(devolucion.getDetalles().stream()
                .map(DetalleDevolucionVentaResponseDTO::fromEntity)
                .toList())
            .build();
    }
}
