import { Component, Input } from '@angular/core';

export type SolvixButtonFamily = 'tech' | 'glass' | 'cyber';
export type SolvixButtonRank = 'primary' | 'secondary' | 'tertiary' | 'danger';

@Component({
  selector: 'solvix-button',
  standalone: true,
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="cssClass"
      [attr.aria-label]="ariaLabel"
    >
      @if (icon) {
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon }}</span>
      }
      <span class="solvix-button__label"><ng-content /></span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    button { font-family: inherit; }
  `]
})
export class SolvixButtonComponent {
  @Input() family: SolvixButtonFamily = 'tech';
  @Input() rank: SolvixButtonRank = 'primary';
  @Input() icon = '';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  /** Feedback visual de carga (spin del icono). No altera la lógica del caller. */
  @Input() loading = false;

  get cssClass(): string {
    const base = `btn-${this.family}-${this.rank}`;
    return this.loading ? `${base} is-loading` : base;
  }
}
