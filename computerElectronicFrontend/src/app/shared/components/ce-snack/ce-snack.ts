import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import type { SnackTone } from '../../utils/snack';

export interface CeSnackData {
  message: string;
  tone: SnackTone;
}

const ICONO: Record<SnackTone, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error'
};

@Component({
  selector: 'ce-snack',
  standalone: true,
  template: `
    <div class="snack" [attr.data-tone]="data.tone" role="status">
      <span class="snack__icon material-symbols-outlined" aria-hidden="true">{{ icono }}</span>
      <p class="snack__msg">{{ data.message }}</p>
      <button type="button" class="snack__close" aria-label="Cerrar" (click)="cerrar()">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
      }

      .snack {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.55rem;
        min-width: 0;
      }

      .snack__icon {
        width: 1.4rem;
        height: 1.4rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
        color: var(--snack-accent, #006194);
        background: var(--snack-accent-soft, #cce5ff);
      }

      .snack__msg {
        margin: 0;
        min-width: 0;
        color: var(--color-text-primary, #131b2e);
        font-family: var(--font-sans, 'Space Grotesk', system-ui, sans-serif);
        font-size: 0.8125rem;
        font-weight: 500;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .snack__close {
        width: 1.5rem;
        height: 1.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 0.35rem;
        background: transparent;
        color: var(--color-text-muted, #5a6570);
        cursor: pointer;
      }

      .snack__close .material-symbols-outlined {
        font-size: 1rem;
      }

      .snack__close:hover {
        background: var(--snack-accent-soft, #cce5ff);
        color: var(--snack-accent, #006194);
      }
    `
  ]
})
export class CeSnackComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) readonly data: CeSnackData,
    private ref: MatSnackBarRef<CeSnackComponent>
  ) {}

  get icono(): string {
    return ICONO[this.data.tone] ?? ICONO.info;
  }

  cerrar(): void {
    this.ref.dismiss();
  }
}
