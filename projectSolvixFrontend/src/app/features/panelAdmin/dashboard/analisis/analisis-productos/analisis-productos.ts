import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { LowPerformanceProductsComponent } from '../../components/low-performance-products/low-performance-products';
import { TopProductsComponent } from '../../components/top-products/top-products';
import {
  CriterioRanking,
  ProductoRankingVista,
  ProductoRevisionVista,
  SeccionEstado
} from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapRanking, mapRevision } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-productos',
  standalone: true,
  imports: [TopProductsComponent, LowPerformanceProductsComponent],
  templateUrl: './analisis-productos.html',
  styleUrls: ['../analisis-page.scss', './analisis-productos.scss']
})
export class AnalisisProductosComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly criterio = signal<CriterioRanking>('INGRESOS');
  readonly ranking = signal<ProductoRankingVista[]>([]);
  readonly revision = signal<ProductoRevisionVista[]>([]);
  readonly rankingState = signal<SeccionEstado>('loading');
  readonly revisionState = signal<SeccionEstado>('loading');
  private topSeq = 0;
  private revSeq = 0;

  constructor() {
    effect(() => {
      const periodo = this.store.periodo();
      this.store.refreshTick();
      const criterio = this.criterio();
      this.loadTop(periodo.desde, periodo.hasta, criterio);
      this.loadRevision(periodo.desde, periodo.hasta);
    });
  }

  onCriterio(criterio: CriterioRanking): void {
    this.criterio.set(criterio);
  }

  retry(): void {
    this.store.bumpRefresh();
  }

  private loadTop(desdeIso: string, hastaIso: string, criterio: CriterioRanking): void {
    const id = ++this.topSeq;
    this.rankingState.set('loading');
    this.analytics
      .topProductos(toQueryDesde(desdeIso), toQueryHasta(hastaIso), criterio)
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

  private loadRevision(desdeIso: string, hastaIso: string): void {
    const id = ++this.revSeq;
    this.revisionState.set('loading');
    this.analytics
      .bajoRendimiento(toQueryDesde(desdeIso), toQueryHasta(hastaIso))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.revSeq) {
            return;
          }
          this.revision.set(mapRevision(items));
          this.revisionState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.revSeq) {
            this.revisionState.set('error');
          }
        }
      });
  }
}
