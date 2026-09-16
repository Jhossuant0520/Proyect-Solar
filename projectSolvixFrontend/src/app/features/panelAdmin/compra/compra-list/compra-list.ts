import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixMetricTone } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { CompraService } from '../../../../core/services/compra.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { CompraFiltros, CompraResponseDTO, EstadoCompra } from '../../../../core/models/compra.models';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { Agrupacion, PeriodoPreset, SeccionEstado } from '../../dashboard/models/dashboard.models';
import { formatMetricValue, labelEstadoMetrica, notaEstadoMetrica } from '../../dashboard/utils/dashboard-format';
import { PERIODO_PRESETS, periodoInicial, rangoDePreset, toQueryDesde, toQueryHasta } from '../../dashboard/utils/dashboard-period';
import { formatFechaVenta, formatImporte, mapHttpError } from '../../venta/venta-ui';
import { CompraGastoEvolutionComponent } from '../compra-gasto-evolution/compra-gasto-evolution';
import { CompraGastoProveedorComponent } from '../compra-gasto-proveedor/compra-gasto-proveedor';
import {
  CompraKpiVista,
  CompraSerieMetrica,
  CompraSeriePunto,
  ProveedorGastoVista,
  mapGastoPorProveedor,
  mapKpisCompras,
  mapSerieCompras,
  proveedorVisible,
  resumenProductosCompra
} from '../compra-mapper';
import { ESTADOS_COMPRA, labelEstadoCompra, permiteDevolucionCompra, toneEstadoCompra } from '../compra-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';
type AnalyticsEstado = 'loading' | 'ready' | 'error' | 'hidden';

@Component({
  selector: 'app-compra-list',
  standalone: true,
  templateUrl: './compra-list.html',
  styleUrl: './compra-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent,
    CompraGastoEvolutionComponent,
    CompraGastoProveedorComponent
  ]
})
export class CompraListComponent implements OnInit {
  compras: CompraResponseDTO[] = [];
  proveedores: ProveedorResponseDTO[] = [];
  kpis: CompraKpiVista[] = [];
  serie: CompraSeriePunto[] = [];
  gastoProveedores: ProveedorGastoVista[] = [];
  state: ListaEstado = 'loading';
  analyticsState: AnalyticsEstado = 'loading';
  serieState: SeccionEstado = 'loading';
  proveedorState: SeccionEstado = 'loading';
  errorTitle = 'No pudimos cargar las compras.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  searchNumero = '';
  filtroProveedorId: number | null = null;
  filtroEstado: EstadoCompra | '' = '';
  filtroPeriodo: PeriodoPreset | 'todas' = 'mes';
  agrupacion: Agrupacion = 'MES';
  serieMetrica: CompraSerieMetrica = 'comprasNetas';
  desde = '';
  hasta = '';

  readonly estados = ESTADOS_COMPRA;
  readonly periodos = [{ id: 'todas' as const, label: 'Todos los períodos' }, ...PERIODO_PRESETS.filter(item => item.id !== 'personalizado')];
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCompra;
  readonly estadoTone = toneEstadoCompra;
  readonly productos = resumenProductosCompra;
  readonly proveedor = proveedorVisible;
  readonly puedeDevolver = permiteDevolucionCompra;

  constructor(
    private compraService: CompraService,
    private proveedorService: ProveedorService,
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const inicial = periodoInicial();
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.proveedorService.listar(true).subscribe({
      next: proveedores => this.proveedores = proveedores
    });
    this.cargar();
  }

  get visibles(): CompraResponseDTO[] {
    const query = this.searchNumero.trim().toLowerCase();
    if (!query) {
      return this.compras;
    }
    return this.compras.filter(compra =>
      compra.numero.toLowerCase().includes(query)
      || (compra.proveedorNombre ?? '').toLowerCase().includes(query)
    );
  }

  get hayFiltros(): boolean {
    return Boolean(
      this.searchNumero.trim()
      || this.filtroProveedorId != null
      || this.filtroEstado
      || this.filtroPeriodo !== 'mes'
    );
  }

  get muestraAnalytics(): boolean {
    return this.analyticsState !== 'hidden';
  }

  cargar(): void {
    this.state = 'loading';
    this.compraService.listar(this.filtrosApi()).subscribe({
      next: compras => {
        this.compras = compras;
        this.state = compras.length === 0 && !this.hayFiltros ? 'empty' : 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar las compras.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
    this.cargarAnalytics();
  }

  cargarAnalytics(): void {
    if (this.filtroPeriodo === 'todas') {
      this.kpis = [];
      this.serie = [];
      this.gastoProveedores = [];
      this.analyticsState = 'hidden';
      this.serieState = 'empty';
      this.proveedorState = 'empty';
      return;
    }

    this.analyticsState = 'loading';
    this.serieState = 'loading';
    this.proveedorState = 'loading';

    this.analytics.compras(
      toQueryDesde(this.desde),
      toQueryHasta(this.hasta),
      this.agrupacion,
      this.filtroProveedorId ?? undefined
    ).subscribe({
      next: dto => {
        this.kpis = mapKpisCompras(dto);
        this.serie = mapSerieCompras(dto.serie);
        this.gastoProveedores = mapGastoPorProveedor(dto.gastoPorProveedor);
        this.analyticsState = 'ready';

        if (dto.estado === 'SIN_DATOS' || this.serie.length === 0) {
          this.serieState = 'empty';
        } else {
          this.serieState = 'ready';
        }

        if (dto.estado === 'SIN_DATOS' || this.gastoProveedores.length === 0) {
          this.proveedorState = 'empty';
        } else {
          this.proveedorState = 'ready';
        }
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar el resumen.');
        this.errorTitle = this.state === 'error' ? this.errorTitle : mapped.title;
        this.errorMessage = this.state === 'error' ? this.errorMessage : mapped.message;
        this.analyticsState = 'error';
        this.serieState = 'error';
        this.proveedorState = 'error';
      }
    });
  }

  onSearch(event: Event): void {
    this.searchNumero = (event.target as HTMLInputElement).value;
  }

  onProveedor(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroProveedorId = value ? Number(value) : null;
    this.cargar();
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as EstadoCompra | '';
    this.cargar();
  }

  onPeriodo(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PeriodoPreset | 'todas';
    this.filtroPeriodo = value;
    if (value !== 'todas') {
      const rango = rangoDePreset(value);
      this.desde = rango.desde;
      this.hasta = rango.hasta;
    }
    this.cargar();
  }

  onAgrupacion(agrupacion: Agrupacion): void {
    if (this.agrupacion === agrupacion) {
      return;
    }
    this.agrupacion = agrupacion;
    this.cargarAnalytics();
  }

  onSerieMetrica(metrica: CompraSerieMetrica): void {
    this.serieMetrica = metrica;
  }

  limpiarFiltros(): void {
    const inicial = periodoInicial();
    this.searchNumero = '';
    this.filtroProveedorId = null;
    this.filtroEstado = '';
    this.filtroPeriodo = 'mes';
    this.agrupacion = 'MES';
    this.serieMetrica = 'comprasNetas';
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.cargar();
  }

  nuevaCompra(): void {
    this.router.navigate(['/compras/nueva']);
  }

  verCompra(compra: CompraResponseDTO): void {
    this.router.navigate(['/compras', compra.id]);
  }

  registrarDevolucion(compra: CompraResponseDTO, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/compras', compra.id, 'devolucion']);
  }

  valorKpi(metric: CompraKpiVista): string {
    if (metric.estado === 'SIN_DATOS') {
      return labelEstadoMetrica(metric.estado);
    }
    if (metric.estado === 'VALOR_CERO') {
      return formatMetricValue(0, metric.formato, true);
    }
    return formatMetricValue(metric.value, metric.formato, true);
  }

  kpiIncompleto(metric: CompraKpiVista): boolean {
    return metric.estado === 'SIN_DATOS';
  }

  kpiTone(metric: CompraKpiVista): SolvixMetricTone {
    return metric.estado === 'SIN_DATOS' ? 'neutral' : 'neutral';
  }

  kpiNota(metric: CompraKpiVista): string {
    return notaEstadoMetrica(metric.estado);
  }

  private filtrosApi(): CompraFiltros {
    const filtros: CompraFiltros = {};
    if (this.filtroProveedorId != null) {
      filtros.proveedorId = this.filtroProveedorId;
    }
    if (this.filtroEstado) {
      filtros.estado = this.filtroEstado;
    }
    if (this.filtroPeriodo !== 'todas') {
      filtros.desde = toQueryDesde(this.desde);
      filtros.hasta = toQueryHasta(this.hasta);
    }
    return filtros;
  }
}
