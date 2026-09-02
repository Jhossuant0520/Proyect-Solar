package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DevolucionCompraResponseDTO {

    private Long id;
    private String numero;
    private LocalDateTime fecha;
    private Long compraId;
    private String compraNumero;
    /** Total histórico de la compra: no cambia por la devolución. */
    private BigDecimal compraTotalOriginal;
    private EstadoCompra compraEstado;
    private Long proveedorId;
    private String proveedorNombre;
    private MotivoDevolucionCompra motivo;
    private EstadoDevolucionCompra estado;
    private MetodoReembolso metodoReembolso;
    private LocalDateTime fechaReembolso;
    private BigDecimal montoTotalDevuelto;
    private BigDecimal costoTotalDevuelto;
    private boolean costoCompletoConocido;
    private String observaciones;
    private String createdBy;
    private List<DetalleDevolucionCompraResponseDTO> detalles;

    public static DevolucionCompraResponseDTO fromEntity(DevolucionCompra devolucion) {
        var compra = devolucion.getCompra();

        return DevolucionCompraResponseDTO.builder()
            .id(devolucion.getId())
            .numero(devolucion.getNumero())
            .fecha(devolucion.getFecha())
            .compraId(compra != null ? compra.getId() : null)
            .compraNumero(compra != null ? compra.getNumero() : null)
            .compraTotalOriginal(compra != null ? compra.getTotal() : null)
            .compraEstado(compra != null ? compra.getEstado() : null)
            .proveedorId(compra != null && compra.getProveedor() != null ? compra.getProveedor().getId() : null)
            .proveedorNombre(
                compra != null && compra.getProveedor() != null ? compra.getProveedor().getNombre() : null)
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
                .map(DetalleDevolucionCompraResponseDTO::fromEntity)
                .toList())
            .build();
    }
}
