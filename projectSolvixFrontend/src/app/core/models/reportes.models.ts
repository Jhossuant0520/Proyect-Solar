/**
 * Contratos de Reportes (FASE 3.15.12-B.2).
 * Espejo de los DTOs del Report API — sin fórmulas locales.
 */

import {
  Agrupacion,
  AnalisisABCDTO,
  CompraAnalyticsDTO,
  CriterioRanking,
  DashboardResumenDTO,
  InventarioKpiDTO,
  SerieTemporalDTO
} from './analytics.models';

export type { Agrupacion, CompraAnalyticsDTO, CriterioRanking };

export interface ReporteVentasResumenDTO {
  kpis: DashboardResumenDTO | null;
  serie: SerieTemporalDTO | null;
}

export interface ReporteInventarioResumenDTO {
  kpis: InventarioKpiDTO | null;
  abc: AnalisisABCDTO | null;
}

export interface ReporteFiltrosBase {
  desde: string;
  hasta: string;
  agrupacion?: Agrupacion;
  proveedorId?: number;
  umbralStockCritico?: number;
  criterio?: CriterioRanking;
  incluirAbc?: boolean;
}
