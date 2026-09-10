import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardResumenDTO, InventarioKpiDTO } from '../../../core/models/analytics.models';
import { AbcAnalysisComponent } from './components/abc-analysis/abc-analysis';
import { BusinessInsightsComponent } from './components/business-insights/business-insights';
import { CategoryPerformanceComponent } from './components/category-performance/category-performance';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header';
import { DashboardKpisComponent } from './components/dashboard-kpis/dashboard-kpis';
import { InventoryHealthComponent } from './components/inventory-health/inventory-health';
import { LowPerformanceProductsComponent } from './components/low-performance-products/low-performance-products';
import { SalesEvolutionComponent } from './components/sales-evolution/sales-evolution';
import { TopProductsComponent } from './components/top-products/top-products';
import {
  AbcClaseVista,
  Agrupacion,
  CategoriaVista,
  CriterioRanking,
  DashboardMetricVista,
  InsightVista,
  InventarioSaludVista,
  PeriodoFiltro,
  ProductoRankingVista,
  ProductoRevisionVista,
  SeccionEstado,
  SerieMetrica,
  VentasSeriePunto
} from './models/dashboard.models';
import {
  mapAbcClases,
  mapCategorias,
  mapInsights,
  mapInventario,
  mapKpis,
  mapRanking,
  mapRevision,
  mapSerie
} from './utils/dashboard-mapper';
import { periodoInicial, toQueryDesde, toQueryHasta } from './utils/dashboard-period';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    DashboardKpisComponent,
    SalesEvolutionComponent,
    TopProductsComponent,
    LowPerformanceProductsComponent,
    CategoryPerformanceComponent,
    InventoryHealthComponent,
    AbcAnalysisComponent,
    BusinessInsightsComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly periodo = signal<PeriodoFiltro>(periodoInicial());
  readonly metrica = signal<SerieMetrica>('ventasNetas');
  readonly agrupacion = signal<Agrupacion>('MES');
  readonly criterio = signal<CriterioRanking>('INGRESOS');
  readonly refreshing = signal(false);

  readonly kpis = signal<DashboardMetricVista[]>([]);
  readonly serie = signal<VentasSeriePunto[]>([]);
  readonly ranking = signal<ProductoRankingVista[]>([]);
  readonly revision = signal<ProductoRevisionVista[]>([]);
  readonly categorias = signal<CategoriaVista[]>([]);
  readonly inventario = signal<InventarioSaludVista | null>(null);
  readonly abc = signal<AbcClaseVista[]>([]);
  readonly insights = signal<InsightVista[]>([]);

  readonly kpiState = signal<SeccionEstado>('loading');
  readonly serieState = signal<SeccionEstado>('loading');
  readonly rankingState = signal<SeccionEstado>('loading');
  readonly revisionState = signal<SeccionEstado>('loading');
  readonly categoriaState = signal<SeccionEstado>('loading');
  readonly inventarioState = signal<SeccionEstado>('loading');
  readonly abcState = signal<SeccionEstado>('loading');
  readonly insightsState = signal<SeccionEstado>('loading');

  private resumenDto: DashboardResumenDTO | null = null;
  private inventarioDto: InventarioKpiDTO | null = null;
  private requestId = 0;
  private ventasSeq = 0;
  private topSeq = 0;

  ngOnInit(): void {
    this.loadAll();
  }

  onPeriodo(periodo: PeriodoFiltro): void {
    this.periodo.set(periodo);
    this.loadAll();
  }

  onAgrupacion(agrupacion: Agrupacion): void {
    this.agrupacion.set(agrupacion);
    this.loadVentas();
  }

  onCriterio(criterio: CriterioRanking): void {
    this.criterio.set(criterio);
    this.loadTop();
  }

  onRefresh(): void {
    this.refreshing.set(true);
    this.loadAll();
  }

  loadAll(): void {
    this.requestId += 1;
    this.loadResumen();
    this.loadVentas();
    this.loadTop();
    this.loadRevision();
    this.loadCategorias();
    this.loadInventario();
    this.loadAbc();
  }

  loadResumen(): void {
    const id = this.requestId;
    this.kpiState.set('loading');
    this.analytics.resumen(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          this.resumenDto = dto;
          this.kpis.set(mapKpis(dto));
          this.kpiState.set('ready');
          this.refreshing.set(false);
          this.syncInsights();
        },
        error: () => {
          if (id !== this.requestId) {
            return;
          }
          this.resumenDto = null;
          this.kpis.set([]);
          this.kpiState.set('error');
          this.refreshing.set(false);
          this.syncInsights();
        }
      });
  }

  loadVentas(): void {
    const id = ++this.ventasSeq;
    this.serieState.set('loading');
    this.analytics.ventas(this.desde(), this.hasta(), this.agrupacion())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.ventasSeq) {
            return;
          }
          const puntos = mapSerie(dto);
          this.serie.set(puntos);
          this.serieState.set(
            dto.estado === 'SIN_DATOS' || puntos.length === 0 ? 'empty' : 'ready'
          );
        },
        error: () => {
          if (id === this.ventasSeq) {
            this.serieState.set('error');
          }
        }
      });
  }

  loadTop(): void {
    const id = ++this.topSeq;
    this.rankingState.set('loading');
    this.analytics.topProductos(this.desde(), this.hasta(), this.criterio())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.topSeq) {
            return;
          }
          this.ranking.set(mapRanking(items));
          this.rankingState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.topSeq) {
            this.rankingState.set('error');
          }
        }
      });
  }

  loadRevision(): void {
    const id = this.requestId;
    this.revisionState.set('loading');
    this.analytics.bajoRendimiento(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.requestId) {
            return;
          }
          this.revision.set(mapRevision(items));
          this.revisionState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.requestId) {
            this.revisionState.set('error');
          }
        }
      });
  }

  loadCategorias(): void {
    const id = this.requestId;
    this.categoriaState.set('loading');
    this.analytics.categorias(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.requestId) {
            return;
          }
          this.categorias.set(mapCategorias(items));
          this.categoriaState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.requestId) {
            this.categoriaState.set('error');
          }
        }
      });
  }

  loadInventario(): void {
    const id = this.requestId;
    this.inventarioState.set('loading');
    this.analytics.inventario(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          this.inventarioDto = dto;
          this.inventario.set(mapInventario(dto));
          this.inventarioState.set('ready');
          this.syncInsights();
        },
        error: () => {
          if (id !== this.requestId) {
            return;
          }
          this.inventarioDto = null;
          this.inventario.set(null);
          this.inventarioState.set('error');
          this.syncInsights();
        }
      });
  }

  loadAbc(): void {
    const id = this.requestId;
    this.abcState.set('loading');
    this.analytics.abc(this.desde(), this.hasta(), 'INGRESOS')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          const clases = mapAbcClases(dto);
          this.abc.set(clases);
          const vacio = dto.estado === 'SIN_DATOS' || !(dto.productos?.length);
          this.abcState.set(vacio ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.requestId) {
            this.abcState.set('error');
          }
        }
      });
  }

  private syncInsights(): void {
    const kpi = this.kpiState();
    const inv = this.inventarioState();
    if (kpi === 'loading' || inv === 'loading') {
      this.insightsState.set('loading');
      return;
    }
    if (kpi === 'error' && inv === 'error') {
      this.insightsState.set('error');
      return;
    }
    const items = mapInsights(this.resumenDto, this.inventarioDto);
    this.insights.set(items);
    this.insightsState.set(items.length === 0 ? 'empty' : 'ready');
  }

  private desde(): string {
    return toQueryDesde(this.periodo().desde);
  }

  private hasta(): string {
    return toQueryHasta(this.periodo().hasta);
  }
}
