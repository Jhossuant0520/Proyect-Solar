import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { CriterioRanking, ProductoRankingVista, SeccionEstado } from '../../models/dashboard.models';
import { formatMoneyEstado, formatQuantity } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

@Component({
  selector: 'solvix-top-products',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './top-products.html',
  styleUrl: './top-products.scss'
})
export class TopProductsComponent {
  @Input() products: ProductoRankingVista[] = [];
  @Input() criterio: CriterioRanking = 'INGRESOS';
  @Input() state: SeccionEstado = 'ready';
  @Output() criterioChange = new EventEmitter<CriterioRanking>();
  @Output() retry = new EventEmitter<void>();

  readonly criterios: { id: CriterioRanking; label: string }[] = [
    { id: 'INGRESOS', label: 'Ingresos' },
    { id: 'UNIDADES', label: 'Unidades' },
    { id: 'GANANCIA', label: 'Ganancia' },
    { id: 'MARGEN', label: 'Margen' }
  ];

  readonly money = formatMoneyEstado;
  readonly qty = formatQuantity;
}
