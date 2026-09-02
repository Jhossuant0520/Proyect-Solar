package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductoCompradoDTO {

    private Long productoId;
    private String nombre;
    private long unidades;
    private long unidadesDevueltas;
    private BigDecimal costoCompras;
    private BigDecimal costoDevuelto;
    private BigDecimal costoNeto;
}
