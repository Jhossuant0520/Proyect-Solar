package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;
import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * Clasificación ABC del catálogo.
 *
 * <p>Límites oficiales de SOLVIX, aplicados sobre la participación acumulada:
 * A hasta 80%, B por encima de 80% y hasta 95%, C el resto. El criterio por defecto es
 * INGRESOS; GANANCIA usa exactamente el mismo procedimiento sobre otra magnitud.
 */
@Data
@Builder
public class AnalisisABCDTO {

    private PeriodoDTO periodo;
    private CriterioRanking criterio;
    private BigDecimal limiteA;
    private BigDecimal limiteB;
    private BigDecimal total;
    private List<ABCProductoDTO> productos;
    private EstadoMetrica estado;
}
