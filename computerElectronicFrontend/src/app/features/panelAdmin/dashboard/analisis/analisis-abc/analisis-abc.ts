import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { AbcAnalysisComponent } from '../../components/abc-analysis/abc-analysis';
import { AbcClaseVista, SeccionEstado } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapAbcClases } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-abc',
  standalone: true,
  imports: [RouterLink, AbcAnalysisComponent],
  templateUrl: './analisis-abc.html',
  styleUrls: ['../analisis-page.scss', './analisis-abc.scss']
})
export class AnalisisAbcComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly abc = signal<AbcClaseVista[]>([]);
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
      .abc(toQueryDesde(desdeIso), toQueryHasta(hastaIso), 'INGRESOS')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.seq) {
            return;
          }
          this.abc.set(mapAbcClases(dto));
          const vacio = dto.estado === 'SIN_DATOS' || !(dto.productos?.length);
          this.state.set(vacio ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.seq) {
            this.state.set('error');
          }
        }
      });
  }
}
