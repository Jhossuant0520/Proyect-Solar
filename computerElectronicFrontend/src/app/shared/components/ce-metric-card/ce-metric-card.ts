import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { CeFieldHelpComponent } from '../ce-field-help/ce-field-help';
import { CountUpHandle, runCountUp } from '../../utils/count-up';
import { formatMetricValue } from '../../../features/panelAdmin/dashboard/utils/dashboard-format';

export type CeMetricTone = 'neutral' | 'success' | 'warning' | 'error';
export type CeVariationType = 'positive' | 'negative' | 'neutral';
export type CeMetricFormato = 'money' | 'percent' | 'quantity' | 'ratio';

@Component({
  selector: 'ce-metric-card',
  standalone: true,
  imports: [CeFieldHelpComponent],
  template: `
    <article
      class="metric"
      [class]="'metric--' + tone"
      [class.metric--interactive]="interactive"
      [attr.aria-label]="label"
    >
      <div class="metric__head">
        <div class="metric__title">
          <span class="metric__label">{{ label }}</span>
          @if (help) {
            <ce-field-help class="metric__help" [text]="help" [ariaLabel]="'Qué significa ' + label" placement="bottom" />
          }
        </div>
        @if (icon) {
          <span class="metric__icon-wrap" aria-hidden="true">
            <span class="material-symbols-outlined metric__icon">{{ icon }}</span>
          </span>
        }
      </div>

      <div class="metric__body">
        @if (incomplete) {
          <p class="metric__incomplete">{{ value }}</p>
        } @else {
          <p class="metric__value ce-mono" aria-live="polite">{{ displayText }}</p>
        }
        @if (hint) {
          <p class="metric__hint">{{ hint }}</p>
        }
        @if (statusNote) {
          <p class="metric__status">{{ statusNote }}</p>
        }
      </div>

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
      height: 100%;
    }
    :host:hover,
    :host:focus-within {
      z-index: 3;
    }
    .metric {
      height: 100%;
      box-sizing: border-box;
      background: var(--color-panel, #fff);
      backdrop-filter: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card, 0.75rem);
      border-top: 3px solid color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
      padding: 1.05rem 1.15rem 1.1rem;
      min-height: 10.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      overflow: visible;
      box-shadow: var(--shadow-sm, none);
      transition:
        box-shadow var(--motion-fast, 140ms) var(--ease-standard, ease),
        border-color var(--motion-fast, 140ms) var(--ease-standard, ease);
    }
    .metric__head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 2.25rem;
      align-items: start;
      column-gap: 0.65rem;
      min-height: 2.25rem;
    }
    .metric__title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem 0.4rem;
      min-width: 0;
    }
    .metric__label {
      flex: 1 1 auto;
      min-width: 0;
      font-family: var(--font-sans);
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .metric__help {
      flex: 0 0 auto;
      align-self: center;
    }
    .metric__icon-wrap {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .metric__icon {
      font-size: 1.2rem;
      line-height: 1;
      color: inherit;
    }
    .metric__body {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1 1 auto;
      min-width: 0;
    }
    .metric__value {
      margin: 0;
      color: var(--color-text-primary);
      font-family: var(--font-mono);
      font-size: clamp(1.35rem, 1.1rem + 0.6vw, 1.7rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }
    .metric__incomplete {
      margin: 0;
      color: var(--color-warning);
      font-size: 0.98rem;
      font-weight: 600;
      line-height: 1.3;
    }
    .metric__hint,
    .metric__status {
      margin: 0;
      color: var(--color-text-muted);
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      line-height: 1.35;
    }
    .metric__status {
      color: var(--color-text-secondary);
    }
    .metric__var {
      margin: auto 0 0;
      padding-top: 0.35rem;
      border-top: 1px solid var(--color-border-subtle);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      line-height: 1.35;
    }
    .metric__var span {
      display: block;
      margin-top: 0.15rem;
      font-family: var(--font-sans);
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      color: var(--color-text-muted);
    }
    .metric__var--positive { color: var(--color-success); }
    .metric__var--negative { color: var(--color-danger); }
    .metric__var--neutral { color: var(--color-text-muted); }
    .metric--warning {
      border-top-color: color-mix(in srgb, var(--color-warning) 65%, var(--color-border));
    }
    .metric--error {
      border-top-color: color-mix(in srgb, var(--color-danger) 65%, var(--color-border));
    }
    .metric--success .metric__icon-wrap {
      color: var(--color-success);
      background: var(--color-success-soft);
    }
    @media (hover: hover) and (pointer: fine) {
      .metric--interactive:hover {
        box-shadow: var(--shadow-sm);
        border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
      }
    }
  `]
})
export class CeMetricCardComponent implements OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() countValue: number | null = null;
  @Input() formato: CeMetricFormato = 'money';
  @Input() compact = false;
  @Input() animateCount = true;
  @Input() interactive = false;
  @Input() hint = '';
  @Input() help = '';
  @Input() statusNote = '';
  @Input() icon = '';
  @Input() variation = '';
  @Input() variationLabel = '';
  @Input() variationType: CeVariationType = 'neutral';
  @Input() tone: CeMetricTone = 'neutral';
  @Input() incomplete = false;

  displayText = '';
  private handle: CountUpHandle | null = null;
  private currentNumeric: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.incomplete || this.countValue == null || Number.isNaN(this.countValue)) {
      this.cancelAnim();
      this.displayText = this.value;
      this.currentNumeric = null;
      return;
    }

    const target = this.countValue;
    const valueChanged = changes['countValue']
      && changes['countValue'].previousValue !== changes['countValue'].currentValue;
    const first = changes['countValue']?.firstChange === true;
    const formatChanged = (changes['formato'] && !changes['formato'].firstChange)
      || (changes['compact'] && !changes['compact'].firstChange);

    if (!this.animateCount || (!valueChanged && !first && !formatChanged)) {
      this.displayText = formatMetricValue(target, this.formato, this.compact);
      this.currentNumeric = target;
      return;
    }

    const from = this.currentNumeric ?? 0;
    this.cancelAnim();
    this.handle = runCountUp(
      from,
      target,
      this.readDurationMs(),
      mid => {
        this.displayText = formatMetricValue(mid, this.formato, this.compact);
        this.cdr.detectChanges();
      },
      final => {
        this.displayText = formatMetricValue(final, this.formato, this.compact);
        this.currentNumeric = final;
        this.handle = null;
        this.cdr.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.cancelAnim();
  }

  private cancelAnim(): void {
    this.handle?.cancel();
    this.handle = null;
  }

  private readDurationMs(): number {
    if (typeof window === 'undefined') {
      return 560;
    }
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--motion-count')
      .trim();
    const ms = Number.parseFloat(raw);
    return Number.isFinite(ms) && ms > 0 ? ms : 560;
  }
}
