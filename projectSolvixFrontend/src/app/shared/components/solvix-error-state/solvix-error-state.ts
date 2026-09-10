import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixButtonComponent } from '../solvix-button/solvix-button';

@Component({
  selector: 'solvix-error-state',
  standalone: true,
  imports: [SolvixButtonComponent],
  template: `
    <div class="solvix-state solvix-state--error" role="alert">
      <span class="material-symbols-outlined solvix-state__icon" aria-hidden="true">error</span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <solvix-button rank="secondary" icon="refresh" (click)="retry.emit()">
        Reintentar
      </solvix-button>
    </div>
  `,
  styleUrl: '../solvix-state/solvix-state.scss'
})
export class SolvixErrorStateComponent {
  @Input() title = 'No pudimos cargar los datos.';
  @Input() message = 'Revisa la conexión e inténtalo de nuevo.';
  @Output() retry = new EventEmitter<void>();
}
