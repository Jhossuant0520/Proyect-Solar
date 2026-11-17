import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeBadgeComponent, CeBadgeTone } from '../../../../../shared/components/ce-badge/ce-badge';
import { CeSectionHeaderComponent } from '../../../../../shared/components/ce-section-header/ce-section-header';
import { EstadoMetrica, ProductoRevisionVista, SeccionEstado } from '../../models/dashboard.models';
import { formatQuantity, labelEstadoMetrica } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-low-performance-products',
  standalone: true,
  imports: [CeSectionHeaderComponent, SectionStateComponent, CeBadgeComponent],
  templateUrl: './low-performance-products.html',
  styleUrl: './low-performance-products.scss'
})
export class LowPerformanceProductsComponent {
  @Input() products: ProductoRevisionVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  readonly qty = formatQuantity;

  badgeTone(estado: EstadoMetrica): CeBadgeTone {
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
