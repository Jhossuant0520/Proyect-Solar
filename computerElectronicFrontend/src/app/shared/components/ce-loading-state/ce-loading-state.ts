import { Component, Input } from '@angular/core';

@Component({
  selector: 'ce-loading-state',
  standalone: true,
  template: `
    <div class="ce-state" role="status" aria-live="polite" aria-busy="true">
      <div class="ce-skeleton" [attr.aria-label]="label">
        <span class="ce-skeleton__bar"></span>
        <span class="ce-skeleton__bar ce-skeleton__bar--short"></span>
        <span class="ce-skeleton__bar"></span>
      </div>
      <p>{{ label }}</p>
    </div>
  `,
  styleUrl: '../ce-state/ce-state.scss'
})
export class CeLoadingStateComponent {
  @Input() label = 'Cargando datos.';
}
