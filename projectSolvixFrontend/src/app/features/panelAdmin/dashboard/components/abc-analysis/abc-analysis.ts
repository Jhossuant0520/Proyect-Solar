import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { AbcClaseVista, SeccionEstado } from '../../models/dashboard.models';
import { formatPercent, formatQuantity } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-abc-analysis',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './abc-analysis.html',
  styleUrl: './abc-analysis.scss'
})
export class AbcAnalysisComponent {
  @Input() classes: AbcClaseVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  readonly percent = formatPercent;
  readonly qty = formatQuantity;

  hint(clase: 'A' | 'B' | 'C'): string {
    if (clase === 'A') {
      return 'Hasta ~80 % acumulado';
    }
    if (clase === 'B') {
      return '80 % a 95 %';
    }
    return 'Resto del catálogo';
  }
}
