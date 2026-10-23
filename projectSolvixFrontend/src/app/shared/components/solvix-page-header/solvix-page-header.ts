import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-page-header',
  standalone: true,
  template: `
    <header class="solvix-page-header">
      <div class="solvix-page-header__lead">
        @if (icon) {
          <div class="solvix-page-header__badge" aria-hidden="true">
            <span class="material-symbols-outlined">{{ icon }}</span>
          </div>
        }
        <div class="solvix-page-header__copy">
          @if (kicker) {
            <p class="solvix-page-header__kicker">{{ kicker }}</p>
          }
          <h1>{{ title }}</h1>
          @if (subtitle) {
            <p class="solvix-page-header__subtitle">{{ subtitle }}</p>
          }
        </div>
      </div>
      <div class="solvix-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .solvix-page-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
      margin-bottom: 1.5rem;
      min-width: 0;
    }
    .solvix-page-header__lead {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
      max-width: 42rem;
    }
    .solvix-page-header__badge {
      width: 2.5rem;
      height: 2.5rem;
      margin-top: 0.15rem;
      border-radius: 0.55rem;
      background: var(--color-primary-soft, var(--solvix-primary-soft));
      color: var(--color-primary, var(--solvix-primary));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .solvix-page-header__badge .material-symbols-outlined {
      font-size: 1.35rem;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    }
    .solvix-page-header__copy {
      min-width: 0;
      flex: 1;
    }
    .solvix-page-header__kicker {
      margin: 0 0 0.2rem;
      color: var(--color-primary, var(--solvix-primary));
      font-family: var(--solvix-font);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1;
    }
    h1 {
      margin: 0;
      color: var(--color-text-primary, var(--solvix-text));
      font-family: var(--solvix-font);
      font-size: clamp(1.35rem, 1.15rem + 0.55vw, 1.65rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.25;
      overflow-wrap: normal;
      word-break: keep-all;
      hyphens: none;
    }
    .solvix-page-header__subtitle {
      margin: 0.3rem 0 0;
      color: var(--color-text-muted, var(--solvix-text-muted));
      font-family: var(--solvix-font);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.45;
      letter-spacing: 0;
      text-transform: none;
    }
    .solvix-page-header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
      min-width: 0;
      width: 100%;
    }
    @media (min-width: 1200px) {
      .solvix-page-header {
        display: grid;
        grid-template-columns: minmax(14rem, 1fr) minmax(22rem, 1.35fr);
        align-items: start;
        column-gap: 1.25rem;
      }
      .solvix-page-header__actions {
        justify-content: flex-end;
      }
    }
  `]
})
export class SolvixPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() kicker = '';
  /** Material Symbol opcional (jerarquía visual del panel admin). */
  @Input() icon = '';
}
