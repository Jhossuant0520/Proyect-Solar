import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeButtonComponent } from '../ce-button/ce-button';

@Component({
  selector: 'ce-error-state',
  standalone: true,
  imports: [CeButtonComponent],
  template: `
    <div class="ce-state ce-state--error" role="alert">
      <span class="material-symbols-outlined ce-state__icon" aria-hidden="true">error</span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <ce-button rank="secondary" icon="refresh" (click)="retry.emit()">
        Reintentar
      </ce-button>
    </div>
  `,
  styleUrl: '../ce-state/ce-state.scss'
})
export class CeErrorStateComponent {
  @Input() title = 'No pudimos cargar los datos.';
  @Input() message = 'Revisa la conexión e inténtalo de nuevo.';
  @Output() retry = new EventEmitter<void>();
}
