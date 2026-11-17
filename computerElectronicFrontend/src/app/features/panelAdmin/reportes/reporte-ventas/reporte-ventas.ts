import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CePageHeaderComponent } from '../../../../shared/components/ce-page-header/ce-page-header';
import { CeButtonComponent } from '../../../../shared/components/ce-button/ce-button';
import { CeSectionHeaderComponent } from '../../../../shared/components/ce-section-header/ce-section-header';
import { CeMetricCardComponent } from '../../../../shared/components/ce-metric-card/ce-metric-card';
import { CeLoadingStateComponent } from '../../../../shared/components/ce-loading-state/ce-loading-state';
import { CeEmptyStateComponent } from '../../../../shared/components/ce-empty-state/ce-empty-state';
import { CeErrorStateComponent } from '../../../../shared/components/ce-error-state/ce-error-state';
import { FeedbackService } from '../../../../shared/services/feedback.service';
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
    CePageHeaderComponent,
    CeButtonComponent,
    CeSectionHeaderComponent,
    CeMetricCardComponent,
    CeLoadingStateComponent,
    CeEmptyStateComponent,
    CeErrorStateComponent
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
    private feedback: FeedbackService,
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
