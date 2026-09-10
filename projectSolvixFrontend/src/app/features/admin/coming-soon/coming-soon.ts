import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { SolvixEmptyStateComponent } from '../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixPageHeaderComponent } from '../../../shared/components/solvix-page-header/solvix-page-header';

@Component({
  selector: 'solvix-coming-soon',
  standalone: true,
  imports: [SolvixPageHeaderComponent, SolvixEmptyStateComponent],
  template: `
    <solvix-page-header
      [title]="titulo()"
      [subtitle]="descripcion()"
      kicker="Panel administrativo"
    />
    <solvix-empty-state
      icon="hourglass_empty"
      title="Este módulo se prepara para la siguiente fase."
      message="La navegación ya está lista. El contenido y los datos reales se conectan más adelante."
    />
  `
})
export class ComingSoonPage {
  private readonly route = inject(ActivatedRoute);

  readonly titulo = toSignal(
    this.route.data.pipe(map(data => (data['titulo'] as string) || 'Módulo en preparación')),
    { initialValue: 'Módulo en preparación' }
  );

  readonly descripcion = toSignal(
    this.route.data.pipe(
      map(data => (data['descripcion'] as string) || 'Esta pantalla estará disponible más adelante.')
    ),
    { initialValue: 'Esta pantalla estará disponible más adelante.' }
  );
}
