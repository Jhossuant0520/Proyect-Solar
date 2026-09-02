package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * Desempeño de un producto en el período. Todas las magnitudes son netas de devolución:
 * lo que se devolvió no se vendió.
 */
@Data
@Builder
public class ProductoRankingDTO {

    private Long productoId;
    private String nombre;
    private String categoriaCodigo;
    private String categoriaNombre;
    private long unidades;
    private BigDecimal ingresos;
    private BigDecimal costo;
    private BigDecimal ganancia;
    private BigDecimal margen;
    private Integer stockActual;
    private EstadoMetrica estadoGanancia;
}
