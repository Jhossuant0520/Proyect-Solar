import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { SalesEvolutionComponent } from '../../components/sales-evolution/sales-evolution';
import { Agrupacion, SeccionEstado, SerieMetrica, VentasSeriePunto } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapSerie } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-evolucion',
  standalone: true,
  imports: [SalesEvolutionComponent],
  templateUrl: './analisis-evolucion.html',
  styleUrls: ['../analisis-page.scss', './analisis-evolucion.scss']
})
export class AnalisisEvolucionComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrica = signal<SerieMetrica>('ventasNetas');
  readonly agrupacion = signal<Agrupacion>('MES');
  readonly serie = signal<VentasSeriePunto[]>([]);
  readonly serieState = signal<SeccionEstado>('loading');
  private seq = 0;

  constructor() {
    effect(() => {
      const periodo = this.store.periodo();
      this.store.refreshTick();
      const agrupacion = this.agrupacion();
      this.load(periodo.desde, periodo.hasta, agrupacion);
    });
  }

  onAgrupacion(agrupacion: Agrupacion): void {
    this.agrupacion.set(agrupacion);
  }

  retry(): void {
    this.store.bumpRefresh();
  }

  private load(desdeIso: string, hastaIso: string, agrupacion: Agrupacion): void {
    const id = ++this.seq;
    this.serieState.set('loading');
    this.analytics
      .ventas(toQueryDesde(desdeIso), toQueryHasta(hastaIso), agrupacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.seq) {
            return;
          }
          const puntos = mapSerie(dto);
          this.serie.set(puntos);
          this.serieState.set(
            dto.estado === 'SIN_DATOS' || puntos.length === 0 ? 'empty' : 'ready'
          );
        },
        error: () => {
          if (id === this.seq) {
            this.serieState.set('error');
          }
        }
      });
  }
}
