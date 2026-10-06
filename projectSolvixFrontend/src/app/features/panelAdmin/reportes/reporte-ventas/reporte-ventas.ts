import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { Agrupacion, ReporteVentasResumenDTO } from '../../../../core/models/reportes.models';
import { VentasSerieDTO } from '../../../../core/models/analytics.models';
import { PeriodoFiltro, PeriodoPreset } from '../../dashboard/models/dashboard.models';
import { PERIODO_PRESETS } from '../../dashboard/utils/dashboard-period';
import { formatMoney, formatPercent, formatQuantity } from '../../dashboard/utils/dashboard-format';
import { mapHttpError } from '../../venta/venta-ui';
import { AGRUPACIONES_REPORTE, aplicarPreset, periodoReporteInicial } from '../reportes-ui';

type VistaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-reporte-ventas',
  standalone: true,
  imports: [
    FormsModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ],
  templateUrl: './reporte-ventas.html',
  styleUrl: './reporte-ventas.scss'
})
export class ReporteVentasComponent implements OnInit {
  periodo: PeriodoFiltro = periodoReporteInicial();
  agrupacion: Agrupacion = 'MES';
  state: VistaEstado = 'loading';
  exportando = false;
  errorTitle = 'No pudimos cargar el reporte.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  reporte: ReporteVentasResumenDTO | null = null;

  readonly presets = PERIODO_PRESETS;
  readonly agrupaciones = AGRUPACIONES_REPORTE;
  readonly money = formatMoney;
  readonly percent = formatPercent;
  readonly qty = formatQuantity;

  constructor(
    private reportes: ReportesService,
    private feedback: SolvixFeedbackService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get kpis() {
    return this.reporte?.kpis ?? null;
  }

  get puntos(): VentasSerieDTO[] {
    return this.reporte?.serie?.puntos ?? [];
  }

  volver(): void {
    this.router.navigate(['/reportes']);
  }

  onPreset(preset: PeriodoPreset): void {
    this.periodo = aplicarPreset(preset, this.periodo);
    if (preset !== 'personalizado') {
      this.cargar();
    }
  }

  marcarPersonalizado(): void {
    this.periodo = { ...this.periodo, preset: 'personalizado' };
  }

  cargar(): void {
    this.state = 'loading';
    this.reportes.ventasResumen(this.periodo.desde, this.periodo.hasta, this.agrupacion).subscribe({
      next: dto => {
        this.reporte = dto;
        const pedidos = dto.kpis?.pedidos ?? 0;
        const haySerie = (dto.serie?.puntos?.length ?? 0) > 0;
        this.state = pedidos > 0 || haySerie ? 'ready' : 'empty';
      },
      error: err => {
        const mapped = mapHttpError(err, 'No pudimos cargar el reporte de ventas.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  exportar(): void {
    this.exportando = true;
    this.reportes.ventasExportar(this.periodo.desde, this.periodo.hasta, this.agrupacion).subscribe({
      next: blob => {
        this.reportes.descargarBlobComoArchivo(blob, 'ventas.csv');
        this.exportando = false;
        this.feedback.success('CSV de ventas descargado');
      },
      error: err => {
        this.exportando = false;
        this.feedback.error(mapHttpError(err, 'No pudimos exportar el CSV.').message);
      }
    });
  }
}
