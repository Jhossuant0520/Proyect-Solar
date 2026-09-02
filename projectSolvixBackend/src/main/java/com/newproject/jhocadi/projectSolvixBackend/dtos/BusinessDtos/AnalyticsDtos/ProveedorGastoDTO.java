package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProveedorGastoDTO {

    private Long proveedorId;
    private String nombre;
    private BigDecimal comprasBrutas;
    private BigDecimal devoluciones;
    private BigDecimal comprasNetas;
    private long ordenes;
    private BigDecimal participacion;
}
