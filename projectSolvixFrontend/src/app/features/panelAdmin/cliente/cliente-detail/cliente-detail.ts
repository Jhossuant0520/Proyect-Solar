import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { ClienteService } from '../../../../core/services/cliente.service';
import { VentaService } from '../../../../core/services/venta.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { DevolucionVentaResponseDTO, VentaResponseDTO } from '../../../../core/models/venta.models';
import { formatImporte, labelEstadoDevolucion, labelEstadoVenta, labelMetodoPago, labelMotivoDevolucion, toneEstadoDevolucion, toneEstadoVenta } from '../../venta/venta-ui';
import { formatFechaCorta } from '../../producto/producto-ui';
import { aRequestConEstado, ordenarPorFechaDesc, rutaDevolucion, rutaVenta } from '../cliente-mapper';
import {
  MENSAJE_CONSUMIDOR_RESERVADO,
  NOTA_HISTORIAL,
  documentoVisible,
  esConsumidorFinal,
  labelTipoCliente,
  mensajeErrorCliente,
  puedeDesactivarCliente,
  puedeEditarCliente
} from '../cliente-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

type BloqueEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  templateUrl: './cliente-detail.html',
  styleUrl: './cliente-detail.scss',
  imports: [
    RouterLink,
    MatDialogModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixSectionHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ClienteDetailComponent implements OnInit {
  cliente: ClienteResponseDTO | null = null;
  ventas: VentaResponseDTO[] = [];
  devoluciones: DevolucionVentaResponseDTO[] = [];
  state: 'loading' | 'ready' | 'error' = 'loading';
  ventasState: BloqueEstado = 'loading';
  devolucionesState: BloqueEstado = 'loading';

  readonly tipo = labelTipoCliente;
  readonly documento = documentoVisible;
  readonly fecha = formatFechaCorta;
  readonly money = formatImporte;
  readonly estadoVenta = labelEstadoVenta;
  readonly tonoVenta = toneEstadoVenta;
  readonly estadoDevolucion = labelEstadoDevolucion;
  readonly tonoDevolucion = toneEstadoDevolucion;
  readonly motivo = labelMotivoDevolucion;
  readonly pago = labelMetodoPago;
  readonly notaHistorial = NOTA_HISTORIAL;
  readonly mensajeReservado = MENSAJE_CONSUMIDOR_RESERVADO;
  readonly reservado = esConsumidorFinal;
  readonly rutaVenta = rutaVenta;
  readonly rutaDevolucion = rutaDevolucion;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private ventaService: VentaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get clienteId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  cargar(): void {
    const id = this.clienteId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.clienteService.obtenerPorId(id).subscribe({
      next: cliente => {
        this.cliente = cliente;
        this.state = 'ready';
        this.cargarVentas(id);
        this.cargarDevoluciones(id);
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  editar(): void {
    if (this.cliente == null || !puedeEditarCliente(this.cliente)) {
      return;
    }
    this.router.navigate(['/clientes', this.cliente.id, 'editar']);
  }

  desactivar(): void {
    if (this.cliente == null || !puedeDesactivarCliente(this.cliente)) {
      return;
    }
    const cliente = this.cliente;
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
          this.cliente = actualizado;
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

  activar(): void {
    if (this.cliente == null || esConsumidorFinal(this.cliente) || this.cliente.activo) {
      return;
    }
    this.clienteService.actualizar(this.cliente.id, aRequestConEstado(this.cliente, true)).subscribe({
      next: actualizado => {
        this.cliente = actualizado;
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

  private cargarVentas(id: number): void {
    this.ventasState = 'loading';
    this.ventaService.listar({ clienteId: id }).subscribe({
      next: ventas => {
        this.ventas = ordenarPorFechaDesc(ventas);
        this.ventasState = ventas.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.ventasState = 'error';
      }
    });
  }

  private cargarDevoluciones(id: number): void {
    this.devolucionesState = 'loading';
    this.ventaService.listarDevolucionesPorCliente(id).subscribe({
      next: items => {
        this.devoluciones = ordenarPorFechaDesc(items);
        this.devolucionesState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.devolucionesState = 'error';
      }
    });
  }
}
