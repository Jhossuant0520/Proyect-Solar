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
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
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
    private feedback: SolvixFeedbackService,
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
