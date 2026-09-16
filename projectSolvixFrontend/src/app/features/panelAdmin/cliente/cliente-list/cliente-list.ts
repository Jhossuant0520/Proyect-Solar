import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteResponseDTO, TipoCliente } from '../../../../core/models/cliente.models';
import { aRequestConEstado } from '../cliente-mapper';
import {
  documentoVisible,
  esConsumidorFinal,
  filtrarClientes,
  labelTipoCliente,
  mensajeErrorCliente,
  puedeDesactivarCliente,
  puedeEditarCliente
} from '../cliente-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.scss',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ClienteListComponent implements OnInit {
  clientes: ClienteResponseDTO[] = [];
  state: ListaEstado = 'loading';
  search = '';
  filtroActivo: '' | 'true' | 'false' = '';
  filtroTipo: '' | TipoCliente = '';

  readonly tipo = labelTipoCliente;
  readonly documento = documentoVisible;
  readonly reservado = esConsumidorFinal;
  readonly puedeEditar = puedeEditarCliente;
  readonly puedeDesactivar = puedeDesactivarCliente;

  constructor(
    private clienteService: ClienteService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): ClienteResponseDTO[] {
    return filtrarClientes(this.clientes, {
      query: this.search,
      activo: this.filtroActivo,
      tipo: this.filtroTipo
    });
  }

  get hayFiltros(): boolean {
    return Boolean(this.search.trim() || this.filtroActivo || this.filtroTipo);
  }

  cargar(): void {
    this.state = 'loading';
    this.clienteService.listar(false).subscribe({
      next: clientes => {
        this.clientes = clientes;
        this.state = clientes.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  onActivo(event: Event): void {
    this.filtroActivo = (event.target as HTMLSelectElement).value as '' | 'true' | 'false';
  }

  onTipo(event: Event): void {
    this.filtroTipo = (event.target as HTMLSelectElement).value as '' | TipoCliente;
  }

  limpiar(): void {
    this.search = '';
    this.filtroActivo = '';
    this.filtroTipo = '';
  }

  nuevo(): void {
    this.router.navigate(['/clientes/nuevo']);
  }

  ver(cliente: ClienteResponseDTO): void {
    this.router.navigate(['/clientes', cliente.id]);
  }

  editar(cliente: ClienteResponseDTO): void {
    if (!puedeEditarCliente(cliente)) {
      return;
    }
    this.router.navigate(['/clientes', cliente.id, 'editar']);
  }

  desactivar(cliente: ClienteResponseDTO): void {
    if (!puedeDesactivarCliente(cliente)) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Desactivar este cliente? Seguirá en el historial de ventas.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado !== true) {
        return;
      }
      this.clienteService.desactivar(cliente.id, aRequestConEstado(cliente, false)).subscribe({
        next: actualizado => {
          this.clientes = this.clientes.map(item => item.id === actualizado.id ? actualizado : item);
          showSolvixSnack(this.snackBar, 'Cliente desactivado. El historial se conserva.', 'warning');
        },
        error: err => {
          showSolvixSnack(
            this.snackBar,
            mensajeErrorCliente(err, 'No pudimos desactivar este cliente.'),
            'error',
            4000
          );
        }
      });
    });
  }

  activar(cliente: ClienteResponseDTO): void {
    if (esConsumidorFinal(cliente) || cliente.activo) {
      return;
    }
    this.clienteService.actualizar(cliente.id, aRequestConEstado(cliente, true)).subscribe({
      next: actualizado => {
        this.clientes = this.clientes.map(item => item.id === actualizado.id ? actualizado : item);
        showSolvixSnack(this.snackBar, 'Cliente activo de nuevo.', 'success');
      },
      error: err => {
        showSolvixSnack(
          this.snackBar,
          mensajeErrorCliente(err, 'No pudimos activar este cliente.'),
          'error',
          4000
        );
      }
    });
  }
}
