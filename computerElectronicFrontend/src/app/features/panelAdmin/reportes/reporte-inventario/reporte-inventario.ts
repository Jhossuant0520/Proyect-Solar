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
import { CriterioRanking, ReporteInventarioResumenDTO } from '../../../../core/models/reportes.models';
import { ABCProductoDTO } from '../../../../core/models/analytics.models';
import { PeriodoFiltro, PeriodoPreset } from '../../dashboard/models/dashboard.models';
import { PERIODO_PRESETS } from '../../dashboard/utils/dashboard-period';
import { formatMoney, formatPercent, formatQuantity, formatRatio } from '../../dashboard/utils/dashboard-format';
import { mapHttpError } from '../../venta/venta-ui';
import { aplicarPreset, periodoReporteInicial } from '../reportes-ui';

type VistaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-reporte-inventario',
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
  templateUrl: './reporte-inventario.html',
  styleUrl: './reporte-inventario.scss'
})
export class ReporteInventarioComponent implements OnInit {
  periodo: PeriodoFiltro = periodoReporteInicial();
  criterio: CriterioRanking = 'INGRESOS';
  incluirAbc = true;
  state: VistaEstado = 'loading';
  exportando = false;
  errorTitle = 'No pudimos cargar el reporte.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  reporte: ReporteInventarioResumenDTO | null = null;

  readonly presets = PERIODO_PRESETS;
  readonly criterios: { id: CriterioRanking; label: string }[] = [
    { id: 'INGRESOS', label: 'Ingresos' },
    { id: 'GANANCIA', label: 'Ganancia' },
    { id: 'UNIDADES', label: 'Unidades' },
    { id: 'MARGEN', label: 'Margen' }
  ];
  readonly money = formatMoney;
  readonly percent = formatPercent;
  readonly qty = formatQuantity;
  readonly ratio = formatRatio;

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

  get abcProductos(): ABCProductoDTO[] {
    return this.reporte?.abc?.productos ?? [];
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
    this.reportes
      .inventarioResumen(this.periodo.desde, this.periodo.hasta, {
        criterio: this.criterio,
        incluirAbc: this.incluirAbc
      })
      .subscribe({
        next: dto => {
          this.reporte = dto;
          const stock = dto.kpis?.stockTotal ?? 0;
          this.state = stock > 0 || (dto.abc?.productos?.length ?? 0) > 0 ? 'ready' : 'empty';
        },
        error: err => {
          const mapped = mapHttpError(err, 'No pudimos cargar el reporte de inventario.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  exportar(): void {
    this.exportando = true;
    this.reportes
      .inventarioExportar(this.periodo.desde, this.periodo.hasta, {
        criterio: this.criterio,
        incluirAbc: this.incluirAbc
      })
      .subscribe({
        next: blob => {
          this.reportes.descargarBlobComoArchivo(blob, 'inventario.csv');
          this.exportando = false;
          this.feedback.success('CSV de inventario descargado');
        },
        error: err => {
          this.exportando = false;
          this.feedback.error(mapHttpError(err, 'No pudimos exportar el CSV.').message);
        }
      });
  }
}
