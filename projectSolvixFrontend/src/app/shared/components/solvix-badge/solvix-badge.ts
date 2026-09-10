import { Component, Input } from '@angular/core';

export type SolvixBadgeTone = 'neutral' | 'success' | 'warning' | 'error';

@Component({
  selector: 'solvix-badge',
  standalone: true,
  template: `
    <span class="solvix-badge" [class]="'solvix-badge--' + tone">
      <ng-content />
    </span>
  `,
  styles: [`
    .solvix-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      font-family: var(--solvix-font-mono);
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .solvix-badge--neutral {
      color: var(--solvix-text-muted);
      background: rgba(148, 163, 184, 0.12);
    }
    .solvix-badge--success {
      color: var(--solvix-success);
      background: rgba(16, 185, 129, 0.12);
    }
    .solvix-badge--warning {
      color: var(--solvix-warning);
      background: rgba(245, 158, 11, 0.12);
    }
    .solvix-badge--error {
      color: var(--solvix-error);
      background: rgba(147, 0, 10, 0.35);
    }
  `]
})
export class SolvixBadgeComponent {
  @Input() tone: SolvixBadgeTone = 'neutral';
}
