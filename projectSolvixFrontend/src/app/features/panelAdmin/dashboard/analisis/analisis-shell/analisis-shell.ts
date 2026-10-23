import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header';
import { PeriodoFiltro } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';

@Component({
  selector: 'app-analisis-shell',
  standalone: true,
  imports: [RouterOutlet, DashboardHeaderComponent],
  templateUrl: './analisis-shell.html',
  styleUrl: './analisis-shell.scss'
})
export class AnalisisShellComponent implements OnInit {
  private readonly store = inject(DashboardPeriodStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly periodo = this.store.periodo;
  refreshing = false;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.store.syncFromQuery({
        preset: params.get('preset'),
        desde: params.get('desde'),
        hasta: params.get('hasta')
      });
    });
  }

  ngOnInit(): void {
    const p = this.store.periodo();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.store.toQueryParams(p),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onPeriodo(periodo: PeriodoFiltro): void {
    this.store.setPeriodo(periodo);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.store.toQueryParams(periodo),
      queryParamsHandling: 'merge'
    });
  }

  onRefresh(): void {
    this.refreshing = true;
    this.store.bumpRefresh();
    void Promise.resolve().then(() => {
      this.refreshing = false;
    });
  }
}
