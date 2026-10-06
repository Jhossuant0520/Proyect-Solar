package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCuentaPorPagar;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CuentaPorPagarResponseDTO {

    private Long id;
    private Long compraId;
    private String compraNumero;
    private Long proveedorId;
    private String proveedorNombre;
    private String moneda;
    private BigDecimal saldoInicial;
    private BigDecimal totalDevoluciones;
    private BigDecimal totalPagado;
    private BigDecimal saldoPendiente;
    private LocalDateTime fechaVencimiento;
    private EstadoCuentaPorPagar estado;
    /** Derivado: saldo &gt; 0, no pagada/anulada y ahora &gt; fechaVencimiento. */
    private boolean vencida;
    private LocalDateTime createdAt;
    private String createdBy;
    private List<PagoCxPResponseDTO> pagos;

    public static CuentaPorPagarResponseDTO fromEntity(CuentaPorPagar cxp, boolean incluirPagos) {
        List<PagoCxPResponseDTO> pagosDto = null;
        if (incluirPagos && cxp.getPagos() != null) {
            pagosDto = cxp.getPagos().stream()
                .sorted((a, b) -> {
                    int c = a.getFecha().compareTo(b.getFecha());
                    if (c != 0) {
                        return c;
                    }
                    return Long.compare(
                        a.getId() != null ? a.getId() : 0L,
                        b.getId() != null ? b.getId() : 0L);
                })
                .map(PagoCxPResponseDTO::fromEntity)
                .toList();
        }

        return CuentaPorPagarResponseDTO.builder()
            .id(cxp.getId())
            .compraId(cxp.getCompra() != null ? cxp.getCompra().getId() : null)
            .compraNumero(cxp.getCompraNumero())
            .proveedorId(cxp.getProveedor() != null ? cxp.getProveedor().getId() : null)
            .proveedorNombre(cxp.getProveedorNombre())
            .moneda(cxp.getMoneda())
            .saldoInicial(cxp.getSaldoInicial())
            .totalDevoluciones(cxp.getTotalDevoluciones())
            .totalPagado(cxp.getTotalPagado())
            .saldoPendiente(cxp.getSaldoPendiente())
            .fechaVencimiento(cxp.getFechaVencimiento())
            .estado(cxp.getEstado())
            .vencida(esVencida(cxp))
            .createdAt(cxp.getCreatedAt())
            .createdBy(cxp.getCreatedBy())
            .pagos(pagosDto)
            .build();
    }

    public static boolean esVencida(CuentaPorPagar cxp) {
        if (cxp.getEstado() == EstadoCuentaPorPagar.PAGADA
                || cxp.getEstado() == EstadoCuentaPorPagar.ANULADA) {
            return false;
        }
        if (cxp.getFechaVencimiento() == null) {
            return false;
        }
        if (cxp.getSaldoPendiente() == null || cxp.getSaldoPendiente().signum() <= 0) {
            return false;
        }
        return LocalDateTime.now().isAfter(cxp.getFechaVencimiento());
    }
}
