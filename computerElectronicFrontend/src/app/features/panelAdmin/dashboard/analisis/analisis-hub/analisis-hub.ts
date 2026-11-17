import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { BusinessInsightsComponent } from '../../components/business-insights/business-insights';
import { InsightVista, SeccionEstado } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapInsights } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';
import { DASHBOARD_ANALISIS_NAV } from '../analisis-nav';

interface AnalisisCard {
  path: string;
  icon: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-analisis-hub',
  standalone: true,
  imports: [RouterLink, BusinessInsightsComponent],
  templateUrl: './analisis-hub.html',
  styleUrl: './analisis-hub.scss'
})
export class AnalisisHubComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly insights = signal<InsightVista[]>([]);
  readonly insightsState = signal<SeccionEstado>('loading');

  readonly cards: AnalisisCard[] = DASHBOARD_ANALISIS_NAV[0].items
    .filter(item => item.path !== '/dashboard' && item.path !== '/dashboard/analisis')
    .map(item => ({
      path: item.path,
      icon: item.icon,
      title: item.label,
      subtitle: this.subtitleFor(item.path)
    }));

  constructor() {
    effect(() => {
      const periodo = this.store.periodo();
      this.store.refreshTick();
      this.loadInsights(periodo.desde, periodo.hasta);
    });
  }

  private subtitleFor(path: string): string {
    switch (path) {
      case '/dashboard/analisis/evolucion':
        return 'Serie temporal de ventas, devoluciones, netas y ganancia.';
      case '/dashboard/analisis/categorias':
        return 'Participación e ingresos por categoría.';
      case '/dashboard/analisis/productos':
        return 'Ranking y productos que necesitan revisión.';
      case '/dashboard/analisis/inventario':
        return 'Salud de stock, rotación y alertas.';
      case '/dashboard/analisis/abc':
        return 'Concentración A/B/C según el backend.';
      case '/dashboard/analisis/abastecimiento':
        return 'Compras netas, evolución de gasto y proveedores.';
      default:
        return 'Vista analítica.';
    }
  }

  retryInsights(): void {
    this.store.bumpRefresh();
  }

  private loadInsights(desdeIso: string, hastaIso: string): void {
    this.insightsState.set('loading');
    const desde = toQueryDesde(desdeIso);
    const hasta = toQueryHasta(hastaIso);
    forkJoin({
      resumen: this.analytics.resumen(desde, hasta).pipe(catchError(() => of(null))),
      inventario: this.analytics.inventario(desde, hasta).pipe(catchError(() => of(null)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ resumen, inventario }) => {
          const items = mapInsights(resumen, inventario);
          this.insights.set(items);
          this.insightsState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          this.insights.set([]);
          this.insightsState.set('error');
        }
      });
  }
}
