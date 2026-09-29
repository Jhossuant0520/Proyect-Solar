import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import {
  ClienteBuscadorComponent
} from '../../cliente/cliente-buscador/cliente-buscador';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import {
  EstadoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import {
  ESTADOS_ORDEN,
  equipoResumen,
  formatFechaOrden,
  labelEstadoOrden,
  mapHttpError,
  toneEstadoOrden
} from '../servicio-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

export const TAMANO_PAGINA_ORDENES = 20;
export const DEBOUNCE_BUSQUEDA_ORDENES_MS = 300;

@Component({
  selector: 'app-servicio-list',
  standalone: true,
  templateUrl: './servicio-list.html',
  styleUrl: './servicio-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent,
    ClienteBuscadorComponent
  ]
})
export class ServicioListComponent implements OnInit, OnDestroy {
  ordenes: OrdenServicioResponseDTO[] = [];
  state: ListaEstado = 'loading';
  search = '';
  filtroEstado: '' | EstadoOrdenServicio = '';
  filtroCliente: ClienteResponseDTO | null = null;
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;
  errorTitle = 'No pudimos cargar las órdenes.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';

  readonly estados = ESTADOS_ORDEN;
  readonly estadoLabel = labelEstadoOrden;
  readonly estadoTone = toneEstadoOrden;
  readonly fecha = formatFechaOrden;
  readonly equipo = equipoResumen;

  private readonly busquedas = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private ordenServicioService: OrdenServicioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.busquedas
      .pipe(debounceTime(DEBOUNCE_BUSQUEDA_ORDENES_MS), distinctUntilChanged())
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
    return Boolean(this.search.trim() || this.filtroEstado || this.filtroCliente);
  }

  get hayAnterior(): boolean {
    return this.pagina > 0;
  }

  get haySiguiente(): boolean {
    return this.pagina + 1 < this.totalPaginas;
  }

  cargar(): void {
    this.state = 'loading';
    this.ordenServicioService
      .listar({
        q: this.search,
        estado: this.filtroEstado || undefined,
        clienteId: this.filtroCliente?.id ?? null,
        pagina: this.pagina,
        tamano: TAMANO_PAGINA_ORDENES
      })
      .subscribe({
        next: pagina => {
          this.ordenes = pagina.contenido;
          this.totalPaginas = pagina.totalPaginas;
          this.totalElementos = pagina.totalElementos;
          this.state = pagina.totalElementos === 0 && !this.hayFiltros ? 'empty' : 'ready';
        },
        error: error => {
          const mapped = mapHttpError(error, 'No pudimos cargar las órdenes.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
    this.busquedas.next(this.search.trim());
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as '' | EstadoOrdenServicio;
    this.pagina = 0;
    this.cargar();
  }

  onCliente(cliente: ClienteResponseDTO | null): void {
    this.filtroCliente = cliente;
    this.pagina = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.search = '';
    this.filtroEstado = '';
    this.filtroCliente = null;
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
    this.router.navigate(['/servicios/nueva']);
  }

  abrir(id: number): void {
    this.router.navigate(['/servicios', id]);
  }
}
