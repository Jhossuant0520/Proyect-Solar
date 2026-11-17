import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CeSectionHeaderComponent } from '../../../../shared/components/ce-section-header/ce-section-header';
import { SeccionEstado } from '../../dashboard/models/dashboard.models';
import { formatMoney, formatPercent } from '../../dashboard/utils/dashboard-format';
import { SectionStateComponent } from '../../dashboard/components/section-state/section-state';
import { ProveedorGastoVista } from '../compra-mapper';

@Component({
  selector: 'solvix-compra-gasto-proveedor',
  standalone: true,
  imports: [CeSectionHeaderComponent, SectionStateComponent],
  templateUrl: './compra-gasto-proveedor.html',
  styleUrl: './compra-gasto-proveedor.scss'
})
export class CompraGastoProveedorComponent {
  @Input() proveedores: ProveedorGastoVista[] = [];
  @Input() state: SeccionEstado = 'ready';
  @Output() retry = new EventEmitter<void>();

  readonly money = formatMoney;
  readonly percent = formatPercent;

  barWidth(participacion: number | null): string {
    return `${Math.min(100, Math.max(0, participacion ?? 0))}%`;
  }
}
