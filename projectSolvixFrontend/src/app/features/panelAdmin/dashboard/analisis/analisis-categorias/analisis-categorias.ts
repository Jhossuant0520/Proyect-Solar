import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { CategoryPerformanceComponent } from '../../components/category-performance/category-performance';
import { CategoriaVista, SeccionEstado } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapCategorias } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-categorias',
  standalone: true,
  imports: [CategoryPerformanceComponent],
  templateUrl: './analisis-categorias.html',
  styleUrls: ['../analisis-page.scss', './analisis-categorias.scss']
})
export class AnalisisCategoriasComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly categorias = signal<CategoriaVista[]>([]);
  readonly state = signal<SeccionEstado>('loading');
  private seq = 0;

  constructor() {
    effect(() => {
      const periodo = this.store.periodo();
      this.store.refreshTick();
      this.load(periodo.desde, periodo.hasta);
    });
  }

  retry(): void {
    this.store.bumpRefresh();
  }

  private load(desdeIso: string, hastaIso: string): void {
    const id = ++this.seq;
    this.state.set('loading');
    this.analytics
      .categorias(toQueryDesde(desdeIso), toQueryHasta(hastaIso))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.seq) {
            return;
          }
          this.categorias.set(mapCategorias(items));
          this.state.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.seq) {
            this.state.set('error');
          }
        }
      });
  }
}
