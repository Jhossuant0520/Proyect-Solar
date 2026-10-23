import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../../../core/services/analytics.service';
import { CompraGastoEvolutionComponent } from '../../../compra/compra-gasto-evolution/compra-gasto-evolution';
import { CompraGastoProveedorComponent } from '../../../compra/compra-gasto-proveedor/compra-gasto-proveedor';
import {
  CompraSerieMetrica,
  CompraSeriePunto,
  ProveedorGastoVista,
  mapGastoPorProveedor,
  mapSerieCompras
} from '../../../compra/compra-mapper';
import { Agrupacion, SeccionEstado } from '../../models/dashboard.models';
import { DashboardPeriodStore } from '../../services/dashboard-period.store';
import { toQueryDesde, toQueryHasta } from '../../utils/dashboard-period';

@Component({
  selector: 'app-analisis-abastecimiento',
  standalone: true,
  imports: [RouterLink, CompraGastoEvolutionComponent, CompraGastoProveedorComponent],
  templateUrl: './analisis-abastecimiento.html',
  styleUrls: ['../analisis-page.scss', './analisis-abastecimiento.scss']
})
export class AnalisisAbastecimientoComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(DashboardPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrica = signal<CompraSerieMetrica>('comprasNetas');
  readonly agrupacion = signal<Agrupacion>('MES');
  readonly serie = signal<CompraSeriePunto[]>([]);
  readonly proveedores = signal<ProveedorGastoVista[]>([]);
  readonly serieState = signal<SeccionEstado>('loading');
  readonly proveedorState = signal<SeccionEstado>('loading');
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
    this.proveedorState.set('loading');
    this.analytics
      .compras(toQueryDesde(desdeIso), toQueryHasta(hastaIso), agrupacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: dto => {
          if (id !== this.seq) {
            return;
          }
          this.serie.set(mapSerieCompras(dto.serie));
          this.proveedores.set(mapGastoPorProveedor(dto.gastoPorProveedor));
          const sinDatos = dto.estado === 'SIN_DATOS';
          this.serieState.set(sinDatos || this.serie().length === 0 ? 'empty' : 'ready');
          this.proveedorState.set(
            sinDatos || this.proveedores().length === 0 ? 'empty' : 'ready'
          );
        },
        error: () => {
          if (id === this.seq) {
            this.serieState.set('error');
            this.proveedorState.set('error');
          }
        }
      });
  }
}
