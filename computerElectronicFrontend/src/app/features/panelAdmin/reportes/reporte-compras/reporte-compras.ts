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
    CePageHeaderComponent,
    CeButtonComponent,
    CeSectionHeaderComponent,
    CeMetricCardComponent,
    CeLoadingStateComponent,
    CeEmptyStateComponent,
    CeErrorStateComponent
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
    private feedback: FeedbackService,
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
