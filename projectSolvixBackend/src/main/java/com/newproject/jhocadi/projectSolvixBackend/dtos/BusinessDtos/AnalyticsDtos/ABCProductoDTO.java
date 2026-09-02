package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ABCProductoDTO {

    private Long productoId;
    private String nombre;
    private String categoriaCodigo;
    private BigDecimal ingresos;
    private BigDecimal participacion;
    private BigDecimal participacionAcumulada;

    /** A, B o C. */
    private String clasificacion;
}
