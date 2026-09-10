import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixButtonComponent } from '../solvix-button/solvix-button';

@Component({
  selector: 'solvix-empty-state',
  standalone: true,
  imports: [SolvixButtonComponent],
  template: `
    <div class="solvix-state" role="status">
      <span class="material-symbols-outlined solvix-state__icon" aria-hidden="true">
        {{ icon }}
      </span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <solvix-button rank="secondary" [icon]="actionIcon" (click)="action.emit()">
          {{ actionLabel }}
        </solvix-button>
      }
    </div>
  `,
  styleUrl: '../solvix-state/solvix-state.scss'
})
export class SolvixEmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Aún no hay datos para mostrar.';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionIcon = '';
  @Output() action = new EventEmitter<void>();
}
