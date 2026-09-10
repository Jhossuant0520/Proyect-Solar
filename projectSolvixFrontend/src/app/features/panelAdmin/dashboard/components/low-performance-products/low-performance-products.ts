import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixBadgeComponent, SolvixBadgeTone } from '../../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { EstadoMetrica, ProductoRevisionVista, SeccionEstado } from '../../models/dashboard.models';
import { formatQuantity, labelEstadoMetrica } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-low-performance-products',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent, SolvixBadgeComponent],
  templateUrl: './low-performance-products.html',
  styleUrl: './low-performance-products.scss'
})
export class LowPerformanceProductsComponent {
  @Input() products: ProductoRevisionVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  readonly qty = formatQuantity;

  badgeTone(estado: EstadoMetrica): SolvixBadgeTone {
    if (estado === 'OK') {
      return 'warning';
    }
    if (estado === 'SIN_VENTAS_RECIENTES') {
      return 'error';
    }
    return 'neutral';
  }

  badgeLabel(estado: EstadoMetrica): string {
    if (estado === 'OK') {
      return 'Revisar';
    }
    if (estado === 'SIN_VENTAS_RECIENTES') {
      return 'Sin venta reciente';
    }
    return labelEstadoMetrica(estado) || 'Normal';
  }

  velocidad(value: number | null): string {
    return value == null ? '—' : `${this.qty(value)} u/día`;
  }

  dias(value: number | null): string {
    return value == null ? '—' : this.qty(value);
  }
}
