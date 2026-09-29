import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { SolvixFieldHelpComponent } from '../solvix-field-help/solvix-field-help';
import { CountUpHandle, runCountUp } from '../../utils/count-up';
import { formatMetricValue } from '../../../features/panelAdmin/dashboard/utils/dashboard-format';

export type SolvixMetricTone = 'neutral' | 'success' | 'warning' | 'error';
export type SolvixVariationType = 'positive' | 'negative' | 'neutral';
export type SolvixMetricFormato = 'money' | 'percent' | 'quantity' | 'ratio';

@Component({
  selector: 'solvix-metric-card',
  standalone: true,
  imports: [SolvixFieldHelpComponent],
  template: `
    <article
      class="metric"
      [class]="'metric--' + tone"
      [class.metric--interactive]="interactive"
      [attr.aria-label]="label"
    >
      <div class="metric__head">
        <span class="metric__title">
          <span class="metric__label">{{ label }}</span>
          @if (help) {
            <solvix-field-help [text]="help" [ariaLabel]="'Qué significa ' + label" placement="bottom" />
          }
        </span>
        @if (icon) {
          <span class="material-symbols-outlined metric__icon" aria-hidden="true">{{ icon }}</span>
        }
      </div>
      @if (incomplete) {
        <p class="metric__incomplete">{{ value }}</p>
      } @else {
        <p class="metric__value solvix-mono" aria-live="polite">{{ displayText }}</p>
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
      background: var(--solvix-panel, rgba(15, 23, 42, 0.8));
      backdrop-filter: blur(16px);
      border: 1px solid var(--solvix-border);
      border-radius: var(--solvix-radius-card, var(--solvix-radius));
      padding: 1.1rem 1.2rem;
      min-height: 9.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow: visible;
      box-shadow: var(--solvix-shadow-sm, none);
      transition:
        transform var(--motion-fast, 140ms) var(--ease-standard, ease),
        box-shadow var(--motion-fast, 140ms) var(--ease-standard, ease),
        border-color var(--motion-fast, 140ms) var(--ease-standard, ease);
    }
    .metric__icon {
      transition: transform var(--motion-fast, 140ms) var(--ease-standard, ease);
    }
    @media (hover: hover) and (pointer: fine) {
      .metric--interactive:hover {
        transform: translateY(-2px);
        box-shadow: var(--solvix-shadow-sm);
      }
      .metric--interactive:hover .metric__icon {
        transform: scale(1.04);
      }
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
      font-family: var(--solvix-font);
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--solvix-text-muted);
    }
    .metric__head .material-symbols-outlined {
      color: var(--solvix-primary);
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .metric__value {
      margin: 0.35rem 0 0;
      color: var(--solvix-text);
      font-family: var(--solvix-font-mono);
      font-size: 1.65rem;
      font-weight: 800;
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
      font-family: var(--solvix-font);
      font-size: 0.78rem;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
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
export class SolvixMetricCardComponent implements OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() countValue: number | null = null;
  @Input() formato: SolvixMetricFormato = 'money';
  @Input() compact = false;
  @Input() animateCount = true;
  @Input() interactive = false;
  @Input() hint = '';
  @Input() help = '';
  @Input() statusNote = '';
  @Input() icon = '';
  @Input() variation = '';
  @Input() variationLabel = '';
  @Input() variationType: SolvixVariationType = 'neutral';
  @Input() tone: SolvixMetricTone = 'neutral';
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
