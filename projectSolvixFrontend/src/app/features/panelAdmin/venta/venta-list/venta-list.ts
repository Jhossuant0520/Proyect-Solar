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
import { ClienteService } from '../../../../core/services/cliente.service';
import { VentaService } from '../../../../core/services/venta.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EstadoVenta, VentaFiltros, VentaResponseDTO } from '../../../../core/models/venta.models';
import { DashboardMetricVista, PeriodoPreset } from '../../dashboard/models/dashboard.models';
import { formatMetricValue, etiquetaComparacion, labelEstadoMetrica, notaEstadoMetrica } from '../../dashboard/utils/dashboard-format';
import { PERIODO_PRESETS, periodoInicial, rangoDePreset, toQueryDesde, toQueryHasta } from '../../dashboard/utils/dashboard-period';
import { clienteVisible, mapKpisVentas, resumenProductos } from '../venta-mapper';
import {
  ESTADOS_VENTA,
  formatFechaVenta,
  formatImporte,
  labelEstadoVenta,
  mapHttpError,
  toneEstadoVenta
} from '../venta-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';
type KpiEstado = 'loading' | 'ready' | 'error' | 'hidden';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  templateUrl: './venta-list.html',
  styleUrl: './venta-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class VentaListComponent implements OnInit {
  ventas: VentaResponseDTO[] = [];
  clientes: ClienteResponseDTO[] = [];
  kpis: DashboardMetricVista[] = [];
  state: ListaEstado = 'loading';
  kpiState: KpiEstado = 'loading';
  errorTitle = 'No pudimos cargar las ventas.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  searchNumero = '';
  filtroClienteId: number | null = null;
  filtroEstado: EstadoVenta | '' = '';
  filtroPeriodo: PeriodoPreset | 'todas' = 'mes';
  desde = '';
  hasta = '';

  readonly estados = ESTADOS_VENTA;
  readonly periodos = [{ id: 'todas' as const, label: 'Todos los períodos' }, ...PERIODO_PRESETS.filter(item => item.id !== 'personalizado')];
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoVenta;
  readonly estadoTone = toneEstadoVenta;
  readonly productos = resumenProductos;
  readonly cliente = clienteVisible;

  constructor(
    private ventaService: VentaService,
    private clienteService: ClienteService,
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const inicial = periodoInicial();
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.clienteService.listar(true).subscribe({
      next: clientes => this.clientes = clientes
    });
    this.cargar();
  }

  get visibles(): VentaResponseDTO[] {
    const query = this.searchNumero.trim().toLowerCase();
    if (!query) {
      return this.ventas;
    }
    return this.ventas.filter(venta =>
      venta.numero.toLowerCase().includes(query)
      || (venta.clienteNombre ?? '').toLowerCase().includes(query)
    );
  }

  get hayFiltros(): boolean {
    return Boolean(
      this.searchNumero.trim()
      || this.filtroClienteId != null
      || this.filtroEstado
      || this.filtroPeriodo !== 'mes'
    );
  }

  cargar(): void {
    this.state = 'loading';
    this.ventaService.listar(this.filtrosApi()).subscribe({
      next: ventas => {
        this.ventas = ventas;
        this.state = ventas.length === 0 && !this.hayFiltros ? 'empty' : 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar las ventas.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
    this.cargarKpis();
  }

  cargarKpis(): void {
    if (this.filtroPeriodo === 'todas') {
      this.kpis = [];
      this.kpiState = 'hidden';
      return;
    }
    this.kpiState = 'loading';
    this.analytics.resumen(toQueryDesde(this.desde), toQueryHasta(this.hasta)).subscribe({
      next: dto => {
        this.kpis = mapKpisVentas(dto);
        this.kpiState = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar el resumen.');
        this.errorTitle = this.state === 'error' ? this.errorTitle : mapped.title;
        this.errorMessage = this.state === 'error' ? this.errorMessage : mapped.message;
        this.kpiState = 'error';
      }
    });
  }

  onSearch(event: Event): void {
    this.searchNumero = (event.target as HTMLInputElement).value;
  }

  onCliente(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroClienteId = value ? Number(value) : null;
    this.cargar();
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as EstadoVenta | '';
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

  limpiarFiltros(): void {
    const inicial = periodoInicial();
    this.searchNumero = '';
    this.filtroClienteId = null;
    this.filtroEstado = '';
    this.filtroPeriodo = 'mes';
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.cargar();
  }

  nuevaVenta(): void {
    this.router.navigate(['/ventas/nueva']);
  }

  verVenta(venta: VentaResponseDTO): void {
    this.router.navigate(['/ventas', venta.id]);
  }

  valorKpi(metric: DashboardMetricVista): string {
    if (metric.estado === 'COSTO_INCOMPLETO' && metric.value == null) {
      return labelEstadoMetrica(metric.estado);
    }
    if (metric.estado === 'SIN_DATOS' || metric.estado === 'SIN_VENTAS_RECIENTES') {
      return labelEstadoMetrica(metric.estado);
    }
    if (metric.estado === 'VALOR_CERO') {
      return formatMetricValue(0, metric.formato, metric.compact);
    }
    return formatMetricValue(metric.value, metric.formato, metric.compact);
  }

  kpiIncompleto(metric: DashboardMetricVista): boolean {
    return metric.estado === 'COSTO_INCOMPLETO' && metric.value == null;
  }

  kpiTone(metric: DashboardMetricVista): SolvixMetricTone {
    return metric.estado === 'COSTO_INCOMPLETO' ? 'warning' : 'neutral';
  }

  kpiNota(metric: DashboardMetricVista): string {
    return notaEstadoMetrica(metric.estado);
  }

  kpiComparacion(metric: DashboardMetricVista): string {
    return etiquetaComparacion(metric.variation?.estado);
  }

  private filtrosApi(): VentaFiltros {
    const filtros: VentaFiltros = {};
    if (this.filtroClienteId != null) {
      filtros.clienteId = this.filtroClienteId;
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
