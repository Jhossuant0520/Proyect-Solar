import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeMetricCardComponent, CeMetricTone } from '../../../../../shared/components/ce-metric-card/ce-metric-card';
import { CeSectionHeaderComponent } from '../../../../../shared/components/ce-section-header/ce-section-header';
import { EstadoMetrica, InventarioSaludVista, SeccionEstado } from '../../models/dashboard.models';
import { formatMetricValue, labelEstadoMetrica, notaEstadoMetrica } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-inventory-health',
  standalone: true,
  imports: [CeSectionHeaderComponent, SectionStateComponent, CeMetricCardComponent],
  templateUrl: './inventory-health.html',
  styleUrl: './inventory-health.scss'
})
export class InventoryHealthComponent {
  @Input() data: InventarioSaludVista | null = null;
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  display(
    value: number | null,
    formato: 'money' | 'percent' | 'quantity' | 'ratio',
    estado: EstadoMetrica,
    compact = false
  ): string {
    if (estado === 'COSTO_INCOMPLETO' && value == null) {
      return labelEstadoMetrica(estado);
    }
    if (estado === 'SIN_DATOS' || estado === 'SIN_VENTAS_RECIENTES') {
      return labelEstadoMetrica(estado);
    }
    if (estado === 'VALOR_CERO') {
      return formatMetricValue(0, formato, compact);
    }
    return formatMetricValue(value, formato, compact);
  }

  incomplete(value: number | null, estado: EstadoMetrica): boolean {
    return estado === 'COSTO_INCOMPLETO' && value == null;
  }

  tone(estado: EstadoMetrica): CeMetricTone {
    if (estado === 'COSTO_INCOMPLETO') {
      return 'warning';
    }
    return 'neutral';
  }

  nota(estado: EstadoMetrica): string {
    return notaEstadoMetrica(estado);
  }
}
