package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;

/** Punto de la serie temporal de ventas. La fecha identifica el inicio del bucket. */
@Data
@Builder
public class VentasSerieDTO {

    private LocalDate fecha;
    private String etiqueta;
    private BigDecimal ventas;
    private BigDecimal devoluciones;
    private BigDecimal ventasNetas;
    private BigDecimal ganancia;
    private long pedidos;
}
