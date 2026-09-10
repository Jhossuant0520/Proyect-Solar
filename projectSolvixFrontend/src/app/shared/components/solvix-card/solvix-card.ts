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
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(16px);
      border: 1px solid var(--solvix-border);
      border-radius: var(--solvix-radius);
      padding: 1.25rem 1.5rem;
      color: var(--solvix-text-secondary);
    }
  `]
})
export class SolvixCardComponent {
  @Input() ariaLabel = '';
}
