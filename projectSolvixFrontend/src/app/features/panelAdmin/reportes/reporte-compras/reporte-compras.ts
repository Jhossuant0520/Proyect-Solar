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
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { Agrupacion, CompraAnalyticsDTO } from '../../../../core/models/reportes.models';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { ProductoCompradoDTO, ProveedorGastoDTO, VentasSerieDTO } from '../../../../core/models/analytics.models';
import { PeriodoFiltro, PeriodoPreset } from '../../dashboard/models/dashboard.models';
import { PERIODO_PRESETS } from '../../dashboard/utils/dashboard-period';
import { formatMoney, formatPercent, formatQuantity } from '../../dashboard/utils/dashboard-format';
import { mapHttpError } from '../../venta/venta-ui';
import { AGRUPACIONES_REPORTE, aplicarPreset, periodoReporteInicial } from '../reportes-ui';

type VistaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-reporte-compras',
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
  templateUrl: './reporte-compras.html',
  styleUrl: './reporte-compras.scss'
})
export class ReporteComprasComponent implements OnInit {
  periodo: PeriodoFiltro = periodoReporteInicial();
  agrupacion: Agrupacion = 'MES';
  proveedorId: number | null = null;
  proveedores: ProveedorResponseDTO[] = [];
  state: VistaEstado = 'loading';
  exportando = false;
  errorTitle = 'No pudimos cargar el reporte.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  reporte: CompraAnalyticsDTO | null = null;

  readonly presets = PERIODO_PRESETS;
  readonly agrupaciones = AGRUPACIONES_REPORTE;
  readonly money = formatMoney;
  readonly percent = formatPercent;
  readonly qty = formatQuantity;

  constructor(
    private reportes: ReportesService,
    private proveedorService: ProveedorService,
    private feedback: SolvixFeedbackService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.proveedorService.listar(true).subscribe({
      next: lista => (this.proveedores = lista),
      error: () => (this.proveedores = [])
    });
    this.cargar();
  }

  get gastoProveedor(): ProveedorGastoDTO[] {
    return this.reporte?.gastoPorProveedor ?? [];
  }

  get productos(): ProductoCompradoDTO[] {
    return this.reporte?.productosComprados ?? [];
  }

  get serie(): VentasSerieDTO[] {
    return this.reporte?.serie ?? [];
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
      .comprasResumen(this.periodo.desde, this.periodo.hasta, this.agrupacion, this.proveedorId)
      .subscribe({
        next: dto => {
          this.reporte = dto;
          this.state = (dto.ordenes ?? 0) > 0 || (dto.devolucionesCompra ?? 0) > 0 ? 'ready' : 'empty';
        },
        error: err => {
          const mapped = mapHttpError(err, 'No pudimos cargar el reporte de compras.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  exportar(): void {
    this.exportando = true;
    this.reportes
      .comprasExportar(this.periodo.desde, this.periodo.hasta, this.agrupacion, this.proveedorId)
      .subscribe({
        next: blob => {
          this.reportes.descargarBlobComoArchivo(blob, 'compras.csv');
          this.exportando = false;
          this.feedback.success('CSV de compras descargado');
        },
        error: err => {
          this.exportando = false;
          this.feedback.error(mapHttpError(err, 'No pudimos exportar el CSV.').message);
        }
      });
  }
}
