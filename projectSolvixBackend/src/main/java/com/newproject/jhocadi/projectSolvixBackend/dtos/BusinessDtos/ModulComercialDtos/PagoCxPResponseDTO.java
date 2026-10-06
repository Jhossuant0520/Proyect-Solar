package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPagoCxP;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.PagoCxP;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PagoCxPResponseDTO {

    private Long id;
    private BigDecimal valor;
    private LocalDateTime fecha;
    private MetodoPagoCxP metodoPago;
    private String referencia;
    private String observacion;
    private LocalDateTime anuladoAt;
    private LocalDateTime createdAt;
    private String createdBy;

    public static PagoCxPResponseDTO fromEntity(PagoCxP pago) {
        return PagoCxPResponseDTO.builder()
            .id(pago.getId())
            .valor(pago.getValor())
            .fecha(pago.getFecha())
            .metodoPago(pago.getMetodoPago())
            .referencia(pago.getReferencia())
            .observacion(pago.getObservacion())
            .anuladoAt(pago.getAnuladoAt())
            .createdAt(pago.getCreatedAt())
            .createdBy(pago.getCreatedBy())
            .build();
    }
}
