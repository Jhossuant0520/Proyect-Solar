import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { CxpService } from '../../../../core/services/cxp.service';
import { CuentaPorPagarResponseDTO, EstadoCuentaPorPagar } from '../../../../core/models/cxp.models';
import { formatFechaVenta, formatImporte, mapHttpError } from '../../venta/venta-ui';
import { ESTADOS_CXP, labelEstadoCxp, toneEstadoCxp } from '../cxp-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-cxp-list',
  standalone: true,
  templateUrl: './cxp-list.html',
  styleUrl: './cxp-list.scss',
  imports: [
    FormsModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class CxpListComponent implements OnInit {
  items: CuentaPorPagarResponseDTO[] = [];
  state: ListaEstado = 'loading';
  filtroEstado: EstadoCuentaPorPagar | '' = '';
  filtroVencida = false;
  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;
  errorTitle = 'No pudimos cargar las cuentas por pagar.';
  errorMessage = 'Revisa tu conexión e inténtalo de nuevo.';

  readonly estados = ESTADOS_CXP;
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCxp;
  readonly estadoTone = toneEstadoCxp;

  constructor(
    private cxpService: CxpService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get hayFiltros(): boolean {
    return Boolean(this.filtroEstado || this.filtroVencida);
  }

  cargar(): void {
    this.state = 'loading';
    this.cxpService
      .listar({
        estado: this.filtroEstado,
        vencida: this.filtroVencida ? true : null,
        page: this.page,
        size: this.size
      })
      .subscribe({
        next: page => {
          this.items = page.content ?? [];
          this.totalElements = page.totalElements ?? 0;
          this.totalPages = page.totalPages ?? 0;
          this.page = page.number ?? 0;
          this.state = this.items.length === 0 ? 'empty' : 'ready';
        },
        error: error => {
          const mapped = mapHttpError(error, 'No pudimos cargar las cuentas por pagar.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  aplicarFiltros(): void {
    this.page = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroVencida = false;
    this.page = 0;
    this.cargar();
  }

  paginaAnterior(): void {
    if (this.page > 0) {
      this.page -= 1;
      this.cargar();
    }
  }

  paginaSiguiente(): void {
    if (this.page + 1 < this.totalPages) {
      this.page += 1;
      this.cargar();
    }
  }

  abrir(item: CuentaPorPagarResponseDTO): void {
    this.router.navigate(['/cxp', item.id]);
  }

  badgeLabel(item: CuentaPorPagarResponseDTO): string {
    return item.vencida ? `Vencida · ${this.estadoLabel(item.estado)}` : this.estadoLabel(item.estado);
  }
}
