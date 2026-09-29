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
      border: 1px solid transparent;
      font-family: var(--solvix-font);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition:
        background-color var(--motion-fast, 140ms) var(--ease-standard, ease),
        color var(--motion-fast, 140ms) var(--ease-standard, ease),
        border-color var(--motion-fast, 140ms) var(--ease-standard, ease);
    }
    .solvix-badge--neutral {
      color: var(--solvix-text-secondary);
      background: var(--solvix-neutral-soft);
      border-color: var(--solvix-border);
    }
    .solvix-badge--success {
      color: var(--solvix-success);
      background: var(--solvix-success-soft);
      border-color: color-mix(in srgb, var(--solvix-success) 28%, transparent);
    }
    .solvix-badge--warning {
      color: var(--solvix-warning);
      background: var(--solvix-warning-soft);
      border-color: color-mix(in srgb, var(--solvix-warning) 28%, transparent);
    }
    .solvix-badge--error {
      color: var(--solvix-error);
      background: var(--solvix-danger-soft);
      border-color: color-mix(in srgb, var(--solvix-error) 28%, transparent);
    }
  `]
})
export class SolvixBadgeComponent {
  @Input() tone: SolvixBadgeTone = 'neutral';
}
