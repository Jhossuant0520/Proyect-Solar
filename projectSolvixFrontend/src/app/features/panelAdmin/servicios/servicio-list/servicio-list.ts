import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { ClienteService } from '../../../../core/services/cliente.service';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import {
  EstadoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { esConsumidorFinal } from '../../cliente/cliente-ui';
import {
  ESTADOS_ORDEN,
  equipoResumen,
  filtrarOrdenesLocal,
  formatFechaOrden,
  labelEstadoOrden,
  mapHttpError,
  toneEstadoOrden
} from '../servicio-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

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
    SolvixErrorStateComponent
  ]
})
export class ServicioListComponent implements OnInit {
  ordenes: OrdenServicioResponseDTO[] = [];
  clientes: ClienteResponseDTO[] = [];
  state: ListaEstado = 'loading';
  search = '';
  filtroEstado: '' | EstadoOrdenServicio = '';
  filtroClienteId: number | null = null;
  errorTitle = 'No pudimos cargar las órdenes.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';

  readonly estados = ESTADOS_ORDEN;
  readonly estadoLabel = labelEstadoOrden;
  readonly estadoTone = toneEstadoOrden;
  readonly fecha = formatFechaOrden;
  readonly equipo = equipoResumen;

  constructor(
    private ordenServicioService: OrdenServicioService,
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
    this.cargar();
  }

  get visibles(): OrdenServicioResponseDTO[] {
    return filtrarOrdenesLocal(this.ordenes, this.search);
  }

  get hayFiltros(): boolean {
    return Boolean(this.search.trim() || this.filtroEstado || this.filtroClienteId != null);
  }

  get clientesFiltro(): ClienteResponseDTO[] {
    return this.clientes.filter(c => !esConsumidorFinal(c));
  }

  cargar(): void {
    this.state = 'loading';
    this.ordenServicioService
      .listar({
        estado: this.filtroEstado || undefined,
        clienteId: this.filtroClienteId
      })
      .subscribe({
        next: lista => {
          this.ordenes = lista;
          this.state = lista.length === 0 ? 'empty' : 'ready';
        },
        error: error => {
          const mapped = mapHttpError(error, 'No pudimos cargar las órdenes.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  cargarClientes(): void {
    this.clienteService.listar(true).subscribe({
      next: lista => {
        this.clientes = lista;
      },
      error: () => {
        this.clientes = [];
      }
    });
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as '' | EstadoOrdenServicio;
    this.cargar();
  }

  onCliente(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroClienteId = value ? Number(value) : null;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.search = '';
    this.filtroEstado = '';
    this.filtroClienteId = null;
    this.cargar();
  }

  nueva(): void {
    this.router.navigate(['/servicios', 'nueva']);
  }

  abrir(id: number): void {
    this.router.navigate(['/servicios', id]);
  }
}
