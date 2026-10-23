import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { SolvixPageHeaderComponent } from '../../../../../shared/components/solvix-page-header/solvix-page-header';
import { PeriodoFiltro, PeriodoPreset } from '../../models/dashboard.models';
import { PERIODO_PRESETS, rangoDePreset } from '../../utils/dashboard-period';
import { DashboardDateFieldComponent } from '../dashboard-date-field/dashboard-date-field';

@Component({
  selector: 'solvix-dashboard-header',
  standalone: true,
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    DashboardDateFieldComponent
  ],
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

  /** Tipado explícito: evita que el template trate $event como DOM Event. */
  onDesdeChange(value: string): void {
    this.onCustomDateValue('desde', value);
  }

  onHastaChange(value: string): void {
    this.onCustomDateValue('hasta', value);
  }

  onCustomDateValue(campo: 'desde' | 'hasta', value: string): void {
    // '' = Borrar (como el datepicker nativo). Se conserva el otro extremo del rango.
    this.periodoChange.emit({
      ...this.periodo,
      preset: 'personalizado',
      [campo]: value
    });
  }
}
