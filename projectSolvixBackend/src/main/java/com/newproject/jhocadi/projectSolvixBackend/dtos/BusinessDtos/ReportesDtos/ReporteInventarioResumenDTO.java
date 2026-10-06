package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.AnalisisABCDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.InventarioKpiDTO;

import lombok.Builder;
import lombok.Data;

/**
 * Empaqueta KPIs de inventario + ABC opcional ya calculados por Analytics.
 */
@Data
@Builder
public class ReporteInventarioResumenDTO {

    private InventarioKpiDTO kpis;
    private AnalisisABCDTO abc;
}
