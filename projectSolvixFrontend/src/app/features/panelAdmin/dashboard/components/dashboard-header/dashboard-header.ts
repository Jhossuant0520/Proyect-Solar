import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { SolvixPageHeaderComponent } from '../../../../../shared/components/solvix-page-header/solvix-page-header';
import { PeriodoFiltro, PeriodoPreset } from '../../models/dashboard.models';
import { PERIODO_PRESETS, rangoDePreset } from '../../utils/dashboard-period';

@Component({
  selector: 'solvix-dashboard-header',
  standalone: true,
  imports: [SolvixPageHeaderComponent, SolvixButtonComponent],
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.scss'
})
export class DashboardHeaderComponent {
  @Input({ required: true }) periodo!: PeriodoFiltro;
  @Input() refreshing = false;
  @Output() periodoChange = new EventEmitter<PeriodoFiltro>();
  @Output() refresh = new EventEmitter<void>();

  readonly presets = PERIODO_PRESETS;

  selectPreset(preset: PeriodoPreset): void {
    this.periodoChange.emit({
      ...this.periodo,
      preset,
      desde: preset === 'personalizado' ? this.periodo.desde : rangoDePreset(preset).desde,
      hasta: preset === 'personalizado' ? this.periodo.hasta : rangoDePreset(preset).hasta
    });
  }

  onCustomDate(campo: 'desde' | 'hasta', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.periodoChange.emit({
      ...this.periodo,
      preset: 'personalizado',
      [campo]: value
    });
  }

}
