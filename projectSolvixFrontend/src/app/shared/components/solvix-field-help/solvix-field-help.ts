import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-field-help',
  standalone: true,
  template: `
    <span class="help" [class.help--bottom]="placement === 'bottom'">
      <button type="button" class="help__btn" [attr.aria-label]="ariaLabel" [attr.aria-describedby]="tooltipId">
        ?
      </button>
      <span [id]="tooltipId" class="help__tip" role="tooltip">{{ text }}</span>
    </span>
  `,
  styles: [`
    .help {
      position: relative;
      display: inline-flex;
      vertical-align: middle;
    }
    .help__btn {
      width: 1.15rem;
      height: 1.15rem;
      border-radius: 999px;
      border: 1px solid var(--solvix-border);
      background: rgba(15, 23, 42, 0.9);
      color: var(--solvix-primary);
      font-family: var(--solvix-font-mono);
      font-size: 0.68rem;
      line-height: 1;
      cursor: help;
      padding: 0;
    }
    .help__tip {
      position: absolute;
      left: 0;
      bottom: calc(100% + 0.4rem);
      width: min(18rem, 70vw);
      padding: 0.55rem 0.7rem;
      border-radius: 0.25rem;
      border: 1px solid var(--solvix-border);
      background: #0f172a;
      color: var(--solvix-text-secondary);
      font-family: var(--solvix-font);
      font-size: 0.78rem;
      letter-spacing: 0;
      text-transform: none;
      line-height: 1.35;
      opacity: 0;
      pointer-events: none;
      transform: translateY(0.2rem);
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 20;
    }
    .help:hover .help__tip,
    .help:focus-within .help__tip {
      opacity: 1;
      transform: none;
    }
    .help--bottom .help__tip {
      bottom: auto;
      top: calc(100% + 0.4rem);
    }
  `]
})
export class SolvixFieldHelpComponent {
  @Input({ required: true }) text = '';
  @Input() ariaLabel = 'Ayuda de este campo';
  @Input() placement: 'top' | 'bottom' = 'top';

  readonly tooltipId = `help-${Math.random().toString(36).slice(2, 9)}`;
}
