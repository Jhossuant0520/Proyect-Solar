import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SolvixBadgeComponent, SolvixBadgeTone } from '../../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { InsightPrioridad, InsightVista, SeccionEstado } from '../../models/dashboard.models';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-business-insights',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent, SolvixBadgeComponent, RouterLink],
  templateUrl: './business-insights.html',
  styleUrl: './business-insights.scss'
})
export class BusinessInsightsComponent {
  @Input() insights: InsightVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  tone(prioridad: InsightPrioridad): SolvixBadgeTone {
    if (prioridad === 'alta') {
      return 'error';
    }
    if (prioridad === 'media') {
      return 'warning';
    }
    return 'neutral';
  }
}
