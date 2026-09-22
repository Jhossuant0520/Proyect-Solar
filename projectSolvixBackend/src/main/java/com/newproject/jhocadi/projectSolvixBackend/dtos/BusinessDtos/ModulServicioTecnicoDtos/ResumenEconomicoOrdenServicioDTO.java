package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResumenEconomicoOrdenServicioDTO {

    private Long ordenServicioId;
    private BigDecimal totalAutorizado;
    private BigDecimal subtotalRepuestosAprobados;
    private BigDecimal subtotalManoObraAprobados;
    private BigDecimal subtotalOtrosAprobados;
}
