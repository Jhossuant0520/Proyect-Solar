import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { VentaService } from '../../../../core/services/venta.service';
import { DevolucionVentaResponseDTO, VentaResponseDTO } from '../../../../core/models/venta.models';
import { clienteVisible } from '../venta-mapper';
import {
  formatFechaVenta,
  formatImporte,
  labelEstadoDevolucion,
  labelEstadoVenta,
  labelMetodoPago,
  labelMetodoReembolso,
  labelMotivoDevolucion,
  mapHttpError,
  permiteDevolucion,
  toneEstadoDevolucion,
  toneEstadoVenta
} from '../venta-ui';

@Component({
  selector: 'app-venta-detail',
  standalone: true,
  templateUrl: './venta-detail.html',
  styleUrl: './venta-detail.scss',
  imports: [
    MatSnackBarModule,
    MatDialogModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class VentaDetailComponent implements OnInit {
  venta: VentaResponseDTO | null = null;
  devoluciones: DevolucionVentaResponseDTO[] = [];
  state: 'loading' | 'ready' | 'error' = 'loading';
  devolucionesState: 'loading' | 'ready' | 'empty' | 'error' = 'loading';
  accionando = false;
  errorTitle = 'No pudimos cargar esta venta.';
  errorMessage = 'La venta no existe o no está disponible.';

  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoVenta;
  readonly estadoTone = toneEstadoVenta;
  readonly metodoPago = labelMetodoPago;
  readonly motivo = labelMotivoDevolucion;
  readonly metodoReembolso = labelMetodoReembolso;
  readonly estadoDevolucion = labelEstadoDevolucion;
  readonly toneDevolucion = toneEstadoDevolucion;
  readonly cliente = clienteVisible;
  readonly puedeDevolver = permiteDevolucion;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ventaService: VentaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get ventaId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.ventaId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.ventaService.obtenerPorId(id).subscribe({
      next: venta => {
        this.venta = venta;
        this.state = 'ready';
        this.cargarDevoluciones(id);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta venta.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  volver(): void {
    this.router.navigate(['/ventas']);
  }

  completar(): void {
    if (this.venta == null) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Completar esta venta? El inventario se descuenta ahora.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.venta) {
        this.accionando = true;
        this.ventaService.completar(this.venta.id).subscribe({
          next: venta => {
            this.venta = venta;
            this.accionando = false;
            this.snackBar.open('Venta completada. El inventario ya se actualizó.', 'Cerrar', { duration: 3500 });
          },
          error: error => {
            this.accionando = false;
            this.snackBar.open(mapHttpError(error, 'No se pudo completar la venta.').message, 'Cerrar', { duration: 4500 });
          }
        });
      }
    });
  }

  cancelar(): void {
    if (this.venta == null) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Cancelar esta venta pendiente? No se descuenta inventario.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.venta) {
        this.accionando = true;
        this.ventaService.cancelar(this.venta.id).subscribe({
          next: venta => {
            this.venta = venta;
            this.accionando = false;
            this.snackBar.open('Venta cancelada.', 'Cerrar', { duration: 3000 });
          },
          error: error => {
            this.accionando = false;
            this.snackBar.open(mapHttpError(error, 'No se pudo cancelar la venta.').message, 'Cerrar', { duration: 4500 });
          }
        });
      }
    });
  }

  registrarDevolucion(): void {
    if (this.venta) {
      this.router.navigate(['/ventas', this.venta.id, 'devolucion']);
    }
  }

  verDevolucion(devolucion: DevolucionVentaResponseDTO): void {
    if (this.venta) {
      this.router.navigate(['/ventas', this.venta.id, 'devoluciones', devolucion.id]);
    }
  }

  private cargarDevoluciones(id: number): void {
    this.devolucionesState = 'loading';
    this.ventaService.listarDevoluciones(id).subscribe({
      next: items => {
        this.devoluciones = items;
        this.devolucionesState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.devolucionesState = 'error';
      }
    });
  }
}
