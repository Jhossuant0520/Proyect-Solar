import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-section-header',
  standalone: true,
  template: `
    <header class="section-head">
      <div>
        @if (kicker) {
          <p class="section-head__kicker solvix-mono">{{ kicker }}</p>
        }
        <h2>{{ title }}</h2>
        @if (subtitle) {
          <p class="section-head__sub">{{ subtitle }}</p>
        }
      </div>
      <div class="section-head__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .section-head__kicker {
      margin: 0 0 0.2rem;
      color: var(--solvix-text-muted);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      color: var(--solvix-text);
      font-size: 1.15rem;
      font-weight: 600;
    }
    .section-head__sub {
      margin: 0.25rem 0 0;
      color: var(--solvix-text-muted);
      font-size: 0.85rem;
    }
    .section-head__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    @media (max-width: 767px) {
      .section-head {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class SolvixSectionHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() kicker = '';
}
