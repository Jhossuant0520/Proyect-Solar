package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.DashboardResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.SerieTemporalDTO;

import lombok.Builder;
import lombok.Data;

/**
 * Empaqueta KPIs de ventas + serie temporal ya calculados por Analytics.
 * No añade fórmulas propias.
 */
@Data
@Builder
public class ReporteVentasResumenDTO {

    private DashboardResumenDTO kpis;
    private SerieTemporalDTO serie;
}
