package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

/**
 * Criterio de ordenamiento de un ranking de productos.
 *
 * <p>UNIDADES y GANANCIA responden preguntas distintas: el producto que más se mueve
 * casi nunca es el que más aporta. MARGEN ordena por rentabilidad relativa, que tampoco
 * equivale a contribución monetaria.
 */
public enum CriterioRanking {
    UNIDADES,
    INGRESOS,
    GANANCIA,
    MARGEN
}
