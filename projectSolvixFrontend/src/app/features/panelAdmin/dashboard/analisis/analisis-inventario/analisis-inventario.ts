import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { InventoryHealthComponent } from '../../components/inventory-health/inventory-health';
import { LowPerformanceProductsComponent } from '../../components/low-performance-products/low-performance-products';
import {
  InventarioSaludVista,
  ProductoRevisionVista,
  SeccionEstado
} from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { mapInventario, mapRevision } from '../../utils/dashboard-mapper';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-inventario',
  standalone: true,
  imports: [RouterLink, InventoryHealthComponent, LowPerformanceProductsComponent],
  templateUrl: './analisis-inventario.html',
  styleUrls: ['../analisis-page.scss', './analisis-inventario.scss']
})
export class AnalisisInventarioComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly inventario = signal<InventarioSaludVista | null>(null);
  readonly revision = signal<ProductoRevisionVista[]>([]);
  readonly inventarioState = signal<SeccionEstado>('loading');
  readonly revisionState = signal<SeccionEstado>('loading');
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
    const desde = toQueryDesde(desdeIso);
    const hasta = toQueryHasta(hastaIso);
    this.inventarioState.set('loading');
    this.revisionState.set('loading');

    this.analytics
      .inventario(desde, hasta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.seq) {
            return;
          }
          this.inventario.set(mapInventario(dto));
          this.inventarioState.set('ready');
        },
        error: () => {
          if (id === this.seq) {
            this.inventario.set(null);
            this.inventarioState.set('error');
          }
        }
      });

    this.analytics
      .bajoRendimiento(desde, hasta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (id !== this.seq) {
            return;
          }
          this.revision.set(mapRevision(items));
          this.revisionState.set(items.length === 0 ? 'empty' : 'ready');
        },
        error: () => {
          if (id === this.seq) {
            this.revisionState.set('error');
          }
        }
      });
  }
}
