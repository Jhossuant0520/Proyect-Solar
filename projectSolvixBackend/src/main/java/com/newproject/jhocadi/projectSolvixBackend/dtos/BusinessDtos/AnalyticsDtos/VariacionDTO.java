package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * Comparación de una métrica contra el período anterior equivalente.
 *
 * <p>{@code variacionPorcentual} es {@code null} cuando el período anterior no da base
 * de comparación. Devolver 0% o infinito en ese caso sería inventar información.
 */
@Data
@Builder
public class VariacionDTO {

    private BigDecimal actual;
    private BigDecimal anterior;
    private BigDecimal variacionPorcentual;
    private EstadoMetrica estado;
}
