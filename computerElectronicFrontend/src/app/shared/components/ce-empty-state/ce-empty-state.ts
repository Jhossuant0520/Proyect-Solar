import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeButtonComponent } from '../ce-button/ce-button';

@Component({
  selector: 'ce-empty-state',
  standalone: true,
  imports: [CeButtonComponent],
  template: `
    <div class="ce-state" role="status">
      <span class="material-symbols-outlined ce-state__icon" aria-hidden="true">
        {{ icon }}
      </span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <ce-button rank="secondary" [icon]="actionIcon" (click)="action.emit()">
          {{ actionLabel }}
        </ce-button>
      }
    </div>
  `,
  styleUrl: '../ce-state/ce-state.scss'
})
export class CeEmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Aún no hay datos para mostrar.';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionIcon = '';
  @Output() action = new EventEmitter<void>();
}
