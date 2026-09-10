import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { CategoriaVista, SeccionEstado } from '../../models/dashboard.models';
import { formatMoney, formatMoneyEstado, formatPercent } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-category-performance',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './category-performance.html',
  styleUrl: './category-performance.scss'
})
export class CategoryPerformanceComponent {
  @Input() categories: CategoriaVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  readonly money = formatMoney;
  readonly moneyEstado = formatMoneyEstado;
  readonly percent = formatPercent;

  barWidth(participacion: number | null): string {
    return `${Math.min(100, Math.max(0, participacion ?? 0))}%`;
  }
}
