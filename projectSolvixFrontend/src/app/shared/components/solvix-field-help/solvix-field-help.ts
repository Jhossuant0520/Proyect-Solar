import { Component, Input } from '@angular/core';

/**
 * Ayuda contextual (?). Usa tokens de tema — no hardcodea colores oscuros.
 * En claro se ve como el mock Stitch: círculo slate + tip blanco.
 */
@Component({
  selector: 'solvix-field-help',
  standalone: true,
  template: `
    <span class="help" [class.help--bottom]="placement === 'bottom'">
      <button
        type="button"
        class="help__btn"
        [attr.aria-label]="ariaLabel"
        [attr.aria-describedby]="tooltipId"
      >
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
      z-index: 2;
    }
    .help__btn {
      width: 1.15rem;
      height: 1.15rem;
      border-radius: 999px;
      border: 1px solid var(--color-border, var(--solvix-border));
      background: var(--color-surface-2, var(--solvix-surface-low));
      color: var(--color-text-muted, var(--solvix-text-muted));
      font-family: var(--solvix-font);
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1;
      cursor: help;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .help__btn:hover,
    .help__btn:focus-visible {
      color: var(--color-primary, var(--solvix-primary));
      border-color: var(--color-primary, var(--solvix-primary));
      background: var(--color-primary-soft, var(--solvix-primary-soft));
      outline: none;
    }
    .help__btn:focus-visible {
      outline: 2px solid var(--color-focus, var(--solvix-primary));
      outline-offset: 2px;
    }
    .help__tip {
      position: absolute;
      left: 0;
      bottom: calc(100% + 0.45rem);
      width: min(18rem, 70vw);
      padding: 0.6rem 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid var(--color-border, var(--solvix-border));
      background: var(--color-surface-elevated, var(--solvix-surface-elevated));
      color: var(--color-text-secondary, var(--solvix-text-secondary));
      box-shadow: var(--solvix-shadow);
      font-family: var(--solvix-font);
      font-size: 0.78rem;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      line-height: 1.4;
      opacity: 0;
      pointer-events: none;
      transform: translateY(0.15rem) scale(0.97);
      transition:
        opacity var(--motion-fast, 140ms) var(--ease-enter, ease),
        transform var(--motion-fast, 140ms) var(--ease-enter, ease);
      z-index: 40;
    }
    .help:hover .help__tip,
    .help:focus-within .help__tip {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .help--bottom .help__tip {
      bottom: auto;
      top: calc(100% + 0.45rem);
    }
  `]
})
export class SolvixFieldHelpComponent {
  @Input({ required: true }) text = '';
  @Input() ariaLabel = 'Ayuda de este campo';
  @Input() placement: 'top' | 'bottom' = 'top';

  readonly tooltipId = `help-${Math.random().toString(36).slice(2, 9)}`;
}
