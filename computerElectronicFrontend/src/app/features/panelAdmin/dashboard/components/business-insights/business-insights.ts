import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CeBadgeComponent, CeBadgeTone } from '../../../../../shared/components/ce-badge/ce-badge';
import { CeSectionHeaderComponent } from '../../../../../shared/components/ce-section-header/ce-section-header';
import { InsightPrioridad, InsightVista, SeccionEstado } from '../../models/dashboard.models';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-business-insights',
  standalone: true,
  imports: [CeSectionHeaderComponent, SectionStateComponent, CeBadgeComponent, RouterLink],
  templateUrl: './business-insights.html',
  styleUrl: './business-insights.scss'
})
export class BusinessInsightsComponent {
  @Input() insights: InsightVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  tone(prioridad: InsightPrioridad): CeBadgeTone {
    if (prioridad === 'alta') {
      return 'error';
    }
    if (prioridad === 'media') {
      return 'warning';
    }
    return 'neutral';
  }
}
