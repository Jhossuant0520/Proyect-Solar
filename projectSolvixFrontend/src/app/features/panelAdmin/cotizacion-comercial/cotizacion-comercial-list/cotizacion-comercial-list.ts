import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import {
  CotizacionComercialResumenDTO,
  EstadoCotizacionComercial
} from '../../../../core/models/cotizacion-comercial.models';
import { formatFechaVenta, formatImporte, mapHttpError } from '../../venta/venta-ui';
import {
  ESTADOS_COTIZACION_COMERCIAL,
  labelEstadoCotizacion,
  toneEstadoCotizacion
} from '../cotizacion-comercial-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

export const TAMANO_PAGINA_COTIZACIONES = 20;
export const DEBOUNCE_BUSQUEDA_COTIZACIONES_MS = 300;

@Component({
  selector: 'app-cotizacion-comercial-list',
  standalone: true,
  templateUrl: './cotizacion-comercial-list.html',
  styleUrl: './cotizacion-comercial-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class CotizacionComercialListComponent implements OnInit, OnDestroy {
  cotizaciones: CotizacionComercialResumenDTO[] = [];
  state: ListaEstado = 'loading';
  errorTitle = 'No pudimos cargar las cotizaciones.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  busqueda = '';
  filtroEstado: EstadoCotizacionComercial | '' = '';
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;

  readonly estados = ESTADOS_COTIZACION_COMERCIAL;
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCotizacion;
  readonly estadoTone = toneEstadoCotizacion;

  private readonly busquedas = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private cotizacionService: CotizacionComercialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.busquedas
      .pipe(debounceTime(DEBOUNCE_BUSQUEDA_COTIZACIONES_MS), distinctUntilChanged())
      .subscribe(() => {
        this.pagina = 0;
        this.cargar();
      });
    this.cargar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get hayFiltros(): boolean {
    return Boolean(this.busqueda.trim() || this.filtroEstado);
  }

  get hayAnterior(): boolean {
    return this.pagina > 0;
  }

  get haySiguiente(): boolean {
    return this.pagina + 1 < this.totalPaginas;
  }

  cargar(): void {
    this.state = 'loading';
    this.cotizacionService
      .listar({
        q: this.busqueda,
        estado: this.filtroEstado || null,
        pagina: this.pagina,
        tamano: TAMANO_PAGINA_COTIZACIONES
      })
      .subscribe({
        next: pagina => {
          this.cotizaciones = pagina.contenido;
          this.totalPaginas = pagina.totalPaginas;
          this.totalElementos = pagina.totalElementos;
          this.state = pagina.totalElementos === 0 && !this.hayFiltros ? 'empty' : 'ready';
        },
        error: error => {
          const mapped = mapHttpError(error, 'No pudimos cargar las cotizaciones.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  onSearch(event: Event): void {
    this.busqueda = (event.target as HTMLInputElement).value;
    this.busquedas.next(this.busqueda.trim());
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as EstadoCotizacionComercial | '';
    this.pagina = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = '';
    this.pagina = 0;
    this.busquedas.next('');
    this.cargar();
  }

  irAPagina(delta: number): void {
    const destino = this.pagina + delta;
    if (destino < 0 || destino >= this.totalPaginas) {
      return;
    }
    this.pagina = destino;
    this.cargar();
  }

  nueva(): void {
    this.router.navigate(['/cotizaciones/nueva']);
  }

  ver(cotizacion: CotizacionComercialResumenDTO): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }
}
