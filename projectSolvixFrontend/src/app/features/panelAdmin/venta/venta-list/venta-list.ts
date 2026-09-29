import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixMetricTone } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { ClienteBuscadorComponent } from '../../cliente/cliente-buscador/cliente-buscador';
import { AnalyticsService } from '../../../../core/services/analytics.service';
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

export const TAMANO_PAGINA_VENTAS = 20;
export const DEBOUNCE_BUSQUEDA_VENTAS_MS = 300;

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
    SolvixErrorStateComponent,
    ClienteBuscadorComponent
  ]
})
export class VentaListComponent implements OnInit, OnDestroy {
  ventas: VentaResponseDTO[] = [];
  kpis: DashboardMetricVista[] = [];
  state: ListaEstado = 'loading';
  kpiState: KpiEstado = 'loading';
  errorTitle = 'No pudimos cargar las ventas.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  searchNumero = '';
  filtroCliente: ClienteResponseDTO | null = null;
  filtroEstado: EstadoVenta | '' = '';
  filtroPeriodo: PeriodoPreset | 'todas' = 'mes';
  desde = '';
  hasta = '';
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;

  readonly estados = ESTADOS_VENTA;
  readonly periodos = [{ id: 'todas' as const, label: 'Todos los períodos' }, ...PERIODO_PRESETS.filter(item => item.id !== 'personalizado')];
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoVenta;
  readonly estadoTone = toneEstadoVenta;
  readonly productos = resumenProductos;
  readonly cliente = clienteVisible;

  private readonly busquedas = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private ventaService: VentaService,
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const inicial = periodoInicial();
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.sub = this.busquedas
      .pipe(debounceTime(DEBOUNCE_BUSQUEDA_VENTAS_MS), distinctUntilChanged())
      .subscribe(() => {
        this.pagina = 0;
        this.cargar();
      });
    this.cargar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get hayFiltros(): boolean {
    return Boolean(
      this.searchNumero.trim()
      || this.filtroCliente != null
      || this.filtroEstado
      || this.filtroPeriodo !== 'mes'
    );
  }

  get hayAnterior(): boolean {
    return this.pagina > 0;
  }

  get haySiguiente(): boolean {
    return this.pagina + 1 < this.totalPaginas;
  }

  cargar(): void {
    this.state = 'loading';
    this.ventaService.listar(this.filtrosApi()).subscribe({
      next: pagina => {
        this.ventas = pagina.contenido;
        this.totalPaginas = pagina.totalPaginas;
        this.totalElementos = pagina.totalElementos;
        this.state = pagina.totalElementos === 0 && !this.hayFiltros ? 'empty' : 'ready';
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
    this.busquedas.next(this.searchNumero.trim());
  }

  onCliente(cliente: ClienteResponseDTO | null): void {
    this.filtroCliente = cliente;
    this.pagina = 0;
    this.cargar();
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as EstadoVenta | '';
    this.pagina = 0;
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
    this.pagina = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    const inicial = periodoInicial();
    this.searchNumero = '';
    this.filtroCliente = null;
    this.filtroEstado = '';
    this.filtroPeriodo = 'mes';
    this.desde = inicial.desde;
    this.hasta = inicial.hasta;
    this.pagina = 0;
    this.busquedas.next('');
    this.cargar();
  }

  irAPagina(delta: number): void {
    const destino = this.pagina + delta;
    if (destino < 0 || destino >= this.totalPaginas) {
      return;
    }
    this.pagina = destino;
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
    const filtros: VentaFiltros = {
      pagina: this.pagina,
      tamano: TAMANO_PAGINA_VENTAS
    };
    const q = this.searchNumero.trim();
    if (q) {
      filtros.q = q;
    }
    if (this.filtroCliente?.id != null) {
      filtros.clienteId = this.filtroCliente.id;
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
