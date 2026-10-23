import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header';
import { DashboardKpisComponent } from './components/dashboard-kpis/dashboard-kpis';
import { SalesEvolutionComponent } from './components/sales-evolution/sales-evolution';
import {
  Agrupacion,
  DashboardMetricVista,
  PeriodoFiltro,
  SeccionEstado,
  SerieMetrica,
  VentasSeriePunto
} from './models/dashboard.models';
import { mapKpis, mapSerie } from './utils/dashboard-mapper';
import { periodoInicial, toQueryDesde, toQueryHasta } from './utils/dashboard-period';
import { DashboardPeriodStore } from './services/dashboard-period.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DashboardHeaderComponent,
    DashboardKpisComponent,
    SalesEvolutionComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly periodStore = inject(DashboardPeriodStore);

  readonly periodo = this.periodStore.periodo;
  readonly metrica = signal<SerieMetrica>('ventasNetas');
  readonly agrupacion = signal<Agrupacion>('MES');
  readonly refreshing = signal(false);

  readonly kpis = signal<DashboardMetricVista[]>([]);
  readonly serie = signal<VentasSeriePunto[]>([]);

  readonly kpiState = signal<SeccionEstado>('loading');
  readonly serieState = signal<SeccionEstado>('loading');

  private requestId = 0;
  private ventasSeq = 0;

  ngOnInit(): void {
    this.loadAll();
  }

  onPeriodo(periodo: PeriodoFiltro): void {
    this.periodStore.setPeriodo(periodo);
    this.loadAll();
  }

  onAgrupacion(agrupacion: Agrupacion): void {
    this.agrupacion.set(agrupacion);
    this.loadVentas();
  }

  onRefresh(): void {
    this.refreshing.set(true);
    this.loadAll();
  }

  loadAll(): void {
    this.requestId += 1;
    this.loadResumen();
    this.loadVentas();
  }

  loadResumen(): void {
    const id = this.requestId;
    this.kpiState.set('loading');
    this.analytics
      .resumen(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.requestId) {
            return;
          }
          this.kpis.set(mapKpis(dto));
          this.kpiState.set('ready');
          this.refreshing.set(false);
        },
        error: () => {
          if (id !== this.requestId) {
            return;
          }
          this.kpis.set([]);
          this.kpiState.set('error');
          this.refreshing.set(false);
        }
      });
  }

  loadVentas(): void {
    const id = ++this.ventasSeq;
    this.serieState.set('loading');
    this.analytics
      .ventas(this.desde(), this.hasta(), this.agrupacion())
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

  get periodQuery(): Record<string, string> {
    return this.periodStore.toQueryParams(this.periodo());
  }

  private desde(): string {
    return toQueryDesde(this.periodo().desde);
  }

  private hasta(): string {
    return toQueryHasta(this.periodo().hasta);
  }
}
