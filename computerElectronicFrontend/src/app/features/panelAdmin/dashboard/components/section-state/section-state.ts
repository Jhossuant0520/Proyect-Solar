import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeEmptyStateComponent } from '../../../../../shared/components/ce-empty-state/ce-empty-state';
import { CeErrorStateComponent } from '../../../../../shared/components/ce-error-state/ce-error-state';
import { CeLoadingStateComponent } from '../../../../../shared/components/ce-loading-state/ce-loading-state';
import { SeccionEstado } from '../../models/dashboard.models';

@Component({
  selector: 'solvix-section-state',
  standalone: true,
  imports: [CeLoadingStateComponent, CeEmptyStateComponent, CeErrorStateComponent],
  template: `
    @if (state === 'loading') {
      <ce-loading-state [label]="loadingLabel" />
    } @else if (state === 'empty') {
      <ce-empty-state
        title="Aún no hay datos para mostrar."
        [message]="emptyMessage"
      />
    } @else if (state === 'error') {
      <ce-error-state
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
