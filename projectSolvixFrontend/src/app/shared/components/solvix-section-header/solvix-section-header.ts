import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-section-header',
  standalone: true,
  template: `
    <header class="section-head">
      <div class="section-head__lead">
        @if (icon) {
          <div class="section-head__badge" aria-hidden="true">
            <span class="material-symbols-outlined">{{ icon }}</span>
          </div>
        }
        <div class="section-head__copy">
          @if (kicker) {
            <p class="section-head__kicker">{{ kicker }}</p>
          }
          @if (title.trim()) {
            <h2>{{ title }}</h2>
          }
          @if (subtitle) {
            <p class="section-head__sub">{{ subtitle }}</p>
          }
        </div>
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
    .section-head__lead {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-width: 0;
    }
    .section-head__badge {
      width: 2rem;
      height: 2rem;
      margin-top: 0.1rem;
      border-radius: 0.5rem;
      background: var(--color-primary-soft, var(--solvix-primary-soft));
      color: var(--color-primary, var(--solvix-primary));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .section-head__badge .material-symbols-outlined {
      font-size: 1.15rem;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
    }
    .section-head__copy {
      min-width: 0;
    }
    .section-head__kicker {
      margin: 0 0 0.2rem;
      color: var(--color-primary, var(--solvix-primary));
      font-family: var(--solvix-font);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1;
    }
    h2 {
      margin: 0;
      color: var(--color-text-primary, var(--solvix-text));
      font-family: var(--solvix-font);
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .section-head__sub {
      margin: 0.25rem 0 0;
      color: var(--color-text-muted, var(--solvix-text-muted));
      font-family: var(--solvix-font);
      font-size: 0.8125rem;
      font-weight: 400;
      line-height: 1.4;
      letter-spacing: 0;
      text-transform: none;
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
  /** Material Symbol opcional (misma jerarquía que page-header). */
  @Input() icon = '';
}
