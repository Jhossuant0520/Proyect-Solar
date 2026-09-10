import { Component, Input } from '@angular/core';
import { SolvixFieldHelpComponent } from '../solvix-field-help/solvix-field-help';

export type SolvixMetricTone = 'neutral' | 'success' | 'warning' | 'error';
export type SolvixVariationType = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'solvix-metric-card',
  standalone: true,
  imports: [SolvixFieldHelpComponent],
  template: `
    <article class="metric" [class]="'metric--' + tone" [attr.aria-label]="label">
      <div class="metric__head">
        <span class="metric__title">
          <span class="metric__label solvix-mono">{{ label }}</span>
          @if (help) {
            <solvix-field-help [text]="help" [ariaLabel]="'Qué significa ' + label" placement="bottom" />
          }
        </span>
        @if (icon) {
          <span class="material-symbols-outlined" aria-hidden="true">{{ icon }}</span>
        }
      </div>
      @if (incomplete) {
        <p class="metric__incomplete">{{ value }}</p>
      } @else {
        <p class="metric__value solvix-mono">{{ value }}</p>
      }
      @if (hint) {
        <p class="metric__hint">{{ hint }}</p>
      }
      @if (statusNote) {
        <p class="metric__status">{{ statusNote }}</p>
      }
      @if (variation) {
        <p class="metric__var" [class]="'metric__var--' + variationType">
          {{ variation }}
          @if (variationLabel) {
            <span>{{ variationLabel }}</span>
          }
        </p>
      }
    </article>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      overflow: visible;
    }
    :host:hover,
    :host:focus-within {
      z-index: 3;
    }
    .metric {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(16px);
      border: 1px solid var(--solvix-border);
      border-radius: var(--solvix-radius);
      padding: 1.1rem 1.2rem;
      min-height: 9.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow: visible;
    }
    .metric__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      color: var(--solvix-text-muted);
    }
    .metric__title {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      min-width: 0;
    }
    .metric__label {
      font-size: 0.72rem;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .metric__head .material-symbols-outlined {
      color: var(--solvix-primary);
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .metric__value {
      margin: 0.35rem 0 0;
      color: var(--solvix-text);
      font-size: 1.65rem;
      font-weight: 600;
      letter-spacing: -0.03em;
    }
    .metric__incomplete {
      margin: 0.45rem 0 0;
      color: var(--solvix-warning);
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.3;
    }
    .metric__hint,
    .metric__status {
      margin: 0;
      color: var(--solvix-text-muted);
      font-size: 0.78rem;
      line-height: 1.35;
    }
    .metric__status {
      color: var(--solvix-text-secondary);
    }
    .metric__var {
      margin: 0.35rem 0 0;
      font-family: var(--solvix-font-mono);
      font-size: 0.72rem;
      line-height: 1.35;
    }
    .metric__var span {
      display: block;
      font-family: var(--solvix-font);
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      color: var(--solvix-text-muted);
    }
    .metric__var--positive { color: var(--solvix-success); }
    .metric__var--negative { color: var(--solvix-error); }
    .metric__var--neutral { color: var(--solvix-text-muted); }
    .metric--warning { border-color: rgba(245, 158, 11, 0.35); }
    .metric--error { border-color: rgba(255, 180, 171, 0.35); }
    .metric--success .metric__head .material-symbols-outlined {
      color: var(--solvix-success);
    }
  `]
})
export class SolvixMetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() hint = '';
  @Input() help = '';
  @Input() statusNote = '';
  @Input() icon = '';
  @Input() variation = '';
  @Input() variationLabel = '';
  @Input() variationType: SolvixVariationType = 'neutral';
  @Input() tone: SolvixMetricTone = 'neutral';
  @Input() incomplete = false;
}
