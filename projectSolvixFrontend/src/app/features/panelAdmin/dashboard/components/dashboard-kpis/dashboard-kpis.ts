import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixMetricCardComponent, SolvixMetricTone } from '../../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { DashboardMetricVista, SeccionEstado } from '../../models/dashboard.models';
import { formatMetricValue, etiquetaComparacion, labelEstadoMetrica, notaEstadoMetrica } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-dashboard-kpis',
  standalone: true,
  imports: [SolvixMetricCardComponent, SectionStateComponent],
  templateUrl: './dashboard-kpis.html',
  styleUrl: './dashboard-kpis.scss'
})
export class DashboardKpisComponent {
  @Input() metrics: DashboardMetricVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  displayValue(metric: DashboardMetricVista): string {
    if (metric.estado === 'COSTO_INCOMPLETO' && metric.value == null) {
      return labelEstadoMetrica(metric.estado);
    }
    if (metric.estado === 'SIN_DATOS' || metric.estado === 'SIN_VENTAS_RECIENTES') {
      return labelEstadoMetrica(metric.estado);
    }
    if (metric.estado === 'VALOR_CERO') {
      return formatMetricValue(0, metric.formato, metric.compact);
    }
    return formatMetricValue(metric.value, metric.formato, metric.compact);
  }

  isIncomplete(metric: DashboardMetricVista): boolean {
    return metric.estado === 'COSTO_INCOMPLETO' && metric.value == null;
  }

  tone(metric: DashboardMetricVista): SolvixMetricTone {
    if (metric.estado === 'COSTO_INCOMPLETO') {
      return 'warning';
    }
    if (metric.estado === 'SIN_DATOS' || metric.estado === 'SIN_VENTAS_RECIENTES') {
      return 'neutral';
    }
    return 'neutral';
  }

  nota(metric: DashboardMetricVista): string {
    return notaEstadoMetrica(metric.estado);
  }

  comparacion(metric: DashboardMetricVista): string {
    return etiquetaComparacion(metric.variation?.estado);
  }
}
