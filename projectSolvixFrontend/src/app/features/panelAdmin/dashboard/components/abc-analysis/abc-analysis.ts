import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { AbcClaseVista, SeccionEstado } from '../../models/dashboard.models';
import { formatPercent, formatQuantity } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-abc-analysis',
  standalone: true,
  imports: [RouterLink, SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './abc-analysis.html',
  styleUrl: './abc-analysis.scss'
})
export class AbcAnalysisComponent {
  @Input() classes: AbcClaseVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  /** Destino del enlace de detalle (dashboard → análisis; análisis → inventario ABC). */
  @Input() detailLink = '/reportes/analisis';
  @Input() detailLabel = 'Ver análisis';
  @Output() retry = new EventEmitter<void>();

  readonly percent = formatPercent;
  readonly qty = formatQuantity;

  barValue(participacion: number | null | undefined): number {
    if (participacion == null || Number.isNaN(participacion)) {
      return 0;
    }
    const value = participacion <= 1 ? participacion * 100 : participacion;
    return Math.max(0, Math.min(100, value));
  }
}
