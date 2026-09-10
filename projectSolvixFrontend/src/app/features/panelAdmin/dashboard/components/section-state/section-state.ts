import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixEmptyStateComponent } from '../../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SeccionEstado } from '../../models/dashboard.models';

@Component({
  selector: 'solvix-section-state',
  standalone: true,
  imports: [SolvixLoadingStateComponent, SolvixEmptyStateComponent, SolvixErrorStateComponent],
  template: `
    @if (state === 'loading') {
      <solvix-loading-state [label]="loadingLabel" />
    } @else if (state === 'empty') {
      <solvix-empty-state
        title="Aún no hay datos para mostrar."
        [message]="emptyMessage"
      />
    } @else if (state === 'error') {
      <solvix-error-state
        title="No pudimos cargar esta información."
        [message]="errorMessage"
        (retry)="retry.emit()"
      />
    } @else {
      <ng-content />
    }
  `
})
export class SectionStateComponent {
  @Input() state: SeccionEstado = 'ready';
  @Input() loadingLabel = 'Cargando datos.';
  @Input() emptyMessage = 'Cuando haya actividad, esta sección se completa.';
  @Input() errorMessage = 'Revisa la conexión. Si tu cuenta no es administrador, esta información no está disponible.';
  @Output() retry = new EventEmitter<void>();
}
