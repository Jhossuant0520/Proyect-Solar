import { Component, Input } from '@angular/core';

@Component({
  selector: 'ce-card',
  standalone: true,
  template: `
    <section class="ce-card" [attr.aria-label]="ariaLabel || null">
      <ng-content />
    </section>
  `,
  styles: [`
    .ce-card {
      background: var(--color-panel, var(--color-surface-1));
      backdrop-filter: blur(16px);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card, var(--radius));
      padding: 1.25rem 1.5rem;
      color: var(--color-text-secondary);
      box-shadow: var(--shadow-sm, none);
    }
  `]
})
export class CeCardComponent {
  @Input() ariaLabel = '';
}
