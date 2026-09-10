import { Component, Input } from '@angular/core';

@Component({
  selector: 'solvix-loading-state',
  standalone: true,
  template: `
    <div class="solvix-state" role="status" aria-live="polite" aria-busy="true">
      <div class="solvix-skeleton" [attr.aria-label]="label">
        <span class="solvix-skeleton__bar"></span>
        <span class="solvix-skeleton__bar solvix-skeleton__bar--short"></span>
        <span class="solvix-skeleton__bar"></span>
      </div>
      <p>{{ label }}</p>
    </div>
  `,
  styleUrl: '../solvix-state/solvix-state.scss'
})
export class SolvixLoadingStateComponent {
  @Input() label = 'Cargando datos.';
}
