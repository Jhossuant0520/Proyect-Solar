import { Component, Input } from '@angular/core';

export type CeBadgeTone = 'neutral' | 'success' | 'warning' | 'error';

@Component({
  selector: 'ce-badge',
  standalone: true,
  template: `
    <span class="ce-badge" [class]="'ce-badge--' + tone">
      <ng-content />
    </span>
  `,
  styles: [`
    .ce-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid transparent;
      font-family: var(--font-sans);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition:
        background-color var(--motion-fast, 140ms) var(--ease-standard, ease),
        color var(--motion-fast, 140ms) var(--ease-standard, ease),
        border-color var(--motion-fast, 140ms) var(--ease-standard, ease);
    }
    .ce-badge--neutral {
      color: var(--color-text-secondary);
      background: var(--color-neutral-soft);
      border-color: var(--color-border);
    }
    .ce-badge--success {
      color: var(--color-success);
      background: var(--color-success-soft);
      border-color: color-mix(in srgb, var(--color-success) 28%, transparent);
    }
    .ce-badge--warning {
      color: var(--color-warning);
      background: var(--color-warning-soft);
      border-color: color-mix(in srgb, var(--color-warning) 28%, transparent);
    }
    .ce-badge--error {
      color: var(--color-danger);
      background: var(--color-danger-soft);
      border-color: color-mix(in srgb, var(--color-danger) 28%, transparent);
    }
  `]
})
export class CeBadgeComponent {
  @Input() tone: CeBadgeTone = 'neutral';
}
