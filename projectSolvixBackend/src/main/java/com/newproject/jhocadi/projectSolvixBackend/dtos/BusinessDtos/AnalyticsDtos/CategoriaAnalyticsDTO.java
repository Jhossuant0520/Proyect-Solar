package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * Desempeño de una categoría. Se agrupa por el código congelado en la línea de venta,
 * no por la categoría actual del producto: si un producto cambia de categoría hoy, las
 * ventas de ayer siguen contando donde se hicieron.
 */
@Data
@Builder
public class CategoriaAnalyticsDTO {

    private Long categoriaId;
    private String codigo;
    private String nombre;
    private BigDecimal ventas;
    private long unidades;
    private long pedidos;
    private BigDecimal costo;
    private BigDecimal ganancia;
    private BigDecimal margen;
    private BigDecimal participacion;
    private EstadoMetrica estadoGanancia;
}
