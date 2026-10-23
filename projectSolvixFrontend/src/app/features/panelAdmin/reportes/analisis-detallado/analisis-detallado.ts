import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { DashboardResumenDTO, InventarioKpiDTO } from '../../../../core/models/analytics.models';
import { AbcAnalysisComponent } from '../../dashboard/components/abc-analysis/abc-analysis';
import { BusinessInsightsComponent } from '../../dashboard/components/business-insights/business-insights';
import { CategoryPerformanceComponent } from '../../dashboard/components/category-performance/category-performance';
import { DashboardHeaderComponent } from '../../dashboard/components/dashboard-header/dashboard-header';
import { InventoryHealthComponent } from '../../dashboard/components/inventory-health/inventory-health';
import { LowPerformanceProductsComponent } from '../../dashboard/components/low-performance-products/low-performance-products';
import { SalesEvolutionComponent } from '../../dashboard/components/sales-evolution/sales-evolution';
import { TopProductsComponent } from '../../dashboard/components/top-products/top-products';
import {
  AbcClaseVista,
  Agrupacion,
  CategoriaVista,
  CriterioRanking,
  InsightVista,
  InventarioSaludVista,
  PeriodoFiltro,
  ProductoRankingVista,
  ProductoRevisionVista,
  SeccionEstado,
  SerieMetrica,
  VentasSeriePunto
} from '../../dashboard/models/dashboard.models';
import {
  mapAbcClases,
  mapCategorias,
  mapInsights,
  mapInventario,
  mapRanking,
  mapRevision,
  mapSerie
} from '../../dashboard/utils/dashboard-mapper';
import { periodoInicial, toQueryDesde, toQueryHasta } from '../../dashboard/utils/dashboard-period';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';

@Component({
  selector: 'app-analisis-detallado',
  standalone: true,
  imports: [
    RouterLink,
    SolvixPageHeaderComponent,
    DashboardHeaderComponent,
    SalesEvolutionComponent,
    TopProductsComponent,
    LowPerformanceProductsComponent,
    CategoryPerformanceComponent,
    InventoryHealthComponent,
    AbcAnalysisComponent,
    BusinessInsightsComponent
  ],
  templateUrl: './analisis-detallado.html',
  styleUrl: './analisis-detallado.scss'
})
export class AnalisisDetalladoComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly periodo = signal<PeriodoFiltro>(periodoInicial());
  readonly metrica = signal<SerieMetrica>('ventasNetas');
  readonly agrupacion = signal<Agrupacion>('MES');
  readonly criterio = signal<CriterioRanking>('INGRESOS');
  readonly refreshing = signal(false);

  readonly serie = signal<VentasSeriePunto[]>([]);
  readonly ranking = signal<ProductoRankingVista[]>([]);
  readonly revision = signal<ProductoRevisionVista[]>([]);
  readonly categorias = signal<CategoriaVista[]>([]);
  readonly inventario = signal<InventarioSaludVista | null>(null);
  readonly abc = signal<AbcClaseVista[]>([]);
  readonly insights = signal<InsightVista[]>([]);

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

  private loadResumen(): void {
    const id = this.requestId;
    this.analytics.resumen(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          this.resumenDto = dto;
          this.refreshing.set(false);
          this.syncInsights();
        },
        error: () => {
          if (id !== this.requestId) {
            return;
          }
          this.resumenDto = null;
          this.refreshing.set(false);
          this.syncInsights();
        }
      });
  }

  private loadVentas(): void {
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

  private loadTop(): void {
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

  private loadRevision(): void {
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

  private loadCategorias(): void {
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

  private loadInventario(): void {
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

  private loadAbc(): void {
    const id = this.requestId;
    this.abcState.set('loading');
    this.analytics.abc(this.desde(), this.hasta(), 'INGRESOS')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          this.abc.set(mapAbcClases(dto));
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
    const inv = this.inventarioState();
    if (inv === 'loading') {
      this.insightsState.set('loading');
      return;
    }
    if (inv === 'error' && !this.resumenDto) {
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
