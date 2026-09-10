import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-page-header',
  standalone: true,
  template: `
    <header class="solvix-page-header">
      <div class="solvix-page-header__copy">
        @if (kicker) {
          <p class="solvix-page-header__kicker solvix-mono">{{ kicker }}</p>
        }
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p class="solvix-page-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="solvix-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .solvix-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
    }
    .solvix-page-header__kicker {
      margin: 0 0 0.35rem;
      color: var(--solvix-text-muted);
      font-size: 0.75rem;
    }
    h1 {
      margin: 0;
      color: var(--solvix-text);
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .solvix-page-header__subtitle {
      margin: 0.4rem 0 0;
      color: var(--solvix-text-muted);
      max-width: 40rem;
    }
    .solvix-page-header__actions {
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    @media (max-width: 767px) {
      .solvix-page-header {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class SolvixPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() kicker = '';
}
