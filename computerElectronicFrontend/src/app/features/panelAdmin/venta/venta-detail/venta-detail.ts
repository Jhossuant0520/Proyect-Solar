import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { CeBadgeComponent } from '../../../../shared/components/ce-badge/ce-badge';
import { CeButtonComponent } from '../../../../shared/components/ce-button/ce-button';
import { CeEmptyStateComponent } from '../../../../shared/components/ce-empty-state/ce-empty-state';
import { CeErrorStateComponent } from '../../../../shared/components/ce-error-state/ce-error-state';
import { CeLoadingStateComponent } from '../../../../shared/components/ce-loading-state/ce-loading-state';
import { CeSectionHeaderComponent } from '../../../../shared/components/ce-section-header/ce-section-header';
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
    CeBadgeComponent,
    CeButtonComponent,
    CeSectionHeaderComponent,
    CeLoadingStateComponent,
    CeEmptyStateComponent,
    CeErrorStateComponent
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
    private feedback: FeedbackService
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
      data: {
        titulo: '¿Completar esta venta?',
        kicker: 'Finalizar venta',
        mensaje: '¿Completar esta venta? El inventario se descuenta ahora.',
        icono: 'check_circle',
        tipo: 'primary',
        confirmText: 'Completar venta'
      },
      panelClass: 'ce-dialog-panel',
      backdropClass: 'ce-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.venta) {
        this.accionando = true;
        this.ventaService.completar(this.venta.id).subscribe({
          next: venta => {
            this.venta = venta;
            this.accionando = false;
            this.feedback.success('Venta completada. El inventario ya se actualizó.', 3500);
          },
          error: error => {
            this.accionando = false;
            this.feedback.error(mapHttpError(error, 'No se pudo completar la venta.').message, 4500);
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
      data: {
        titulo: '¿Cancelar esta venta?',
        kicker: 'Cancelar venta',
        mensaje: '¿Cancelar esta venta pendiente? No se descuenta inventario.',
        icono: 'cancel',
        tipo: 'warning',
        confirmText: 'Sí, cancelar venta'
      },
      panelClass: 'ce-dialog-panel',
      backdropClass: 'ce-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.venta) {
        this.accionando = true;
        this.ventaService.cancelar(this.venta.id).subscribe({
          next: venta => {
            this.venta = venta;
            this.accionando = false;
            this.feedback.info('Venta cancelada.', 3000);
          },
          error: error => {
            this.accionando = false;
            this.feedback.error(mapHttpError(error, 'No se pudo cancelar la venta.').message, 4500);
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
