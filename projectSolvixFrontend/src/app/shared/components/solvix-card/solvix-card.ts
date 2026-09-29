import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-card',
  standalone: true,
  template: `
    <section class="solvix-card" [attr.aria-label]="ariaLabel || null">
      <ng-content />
    </section>
  `,
  styles: [`
    .solvix-card {
      background: var(--solvix-panel, var(--solvix-surface));
      backdrop-filter: blur(16px);
      border: 1px solid var(--solvix-border);
      border-radius: var(--solvix-radius-card, var(--solvix-radius));
      padding: 1.25rem 1.5rem;
      color: var(--solvix-text-secondary);
      box-shadow: var(--solvix-shadow-sm, none);
    }
  `]
})
export class SolvixCardComponent {
  @Input() ariaLabel = '';
}
