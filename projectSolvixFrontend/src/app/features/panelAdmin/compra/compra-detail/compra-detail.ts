import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
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
import { CompraService } from '../../../../core/services/compra.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { CompraResponseDTO, DevolucionCompraResponseDTO } from '../../../../core/models/compra.models';
import { ProductoModel } from '../../producto/productoClase';
import { formatFechaVenta, formatImporte, labelEstadoDevolucion, labelMetodoReembolso, mapHttpError, toneEstadoDevolucion } from '../../venta/venta-ui';
import { proveedorVisible } from '../compra-mapper';
import { labelEstadoCompra, labelMotivoDevolucionCompra, permiteDevolucionCompra, toneEstadoCompra } from '../compra-ui';

@Component({
  selector: 'app-compra-detail',
  standalone: true,
  templateUrl: './compra-detail.html',
  styleUrl: './compra-detail.scss',
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
export class CompraDetailComponent implements OnInit {
  compra: CompraResponseDTO | null = null;
  devoluciones: DevolucionCompraResponseDTO[] = [];
  costosCatalogo: Record<number, ProductoModel> = {};
  state: 'loading' | 'ready' | 'error' = 'loading';
  devolucionesState: 'loading' | 'ready' | 'empty' | 'error' = 'loading';
  accionando = false;
  errorTitle = 'No pudimos cargar esta compra.';
  errorMessage = 'La compra no existe o no está disponible.';

  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCompra;
  readonly estadoTone = toneEstadoCompra;
  readonly motivo = labelMotivoDevolucionCompra;
  readonly metodoReembolso = labelMetodoReembolso;
  readonly estadoDevolucion = labelEstadoDevolucion;
  readonly toneDevolucion = toneEstadoDevolucion;
  readonly proveedor = proveedorVisible;
  readonly puedeDevolver = permiteDevolucionCompra;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private compraService: CompraService,
    private productoService: ProductoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get compraId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.compraId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.compraService.obtenerPorId(id).subscribe({
      next: compra => {
        this.compra = compra;
        this.state = 'ready';
        this.cargarDevoluciones(id);
        if (compra.estado !== 'PENDIENTE' && compra.estado !== 'CANCELADA') {
          this.cargarCostosCatalogo(compra);
        }
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta compra.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  volver(): void {
    this.router.navigate(['/compras']);
  }

  completar(): void {
    if (this.compra == null) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Completar esta compra? El inventario entra ahora y el sistema actualiza el costo vigente.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.compra) {
        this.accionando = true;
        this.compraService.completar(this.compra.id).subscribe({
          next: compra => {
            this.compra = compra;
            this.accionando = false;
            this.snackBar.open('Compra completada. El inventario y el costo vigente ya se actualizaron.', 'Cerrar', {
              duration: 4000
            });
            this.cargarCostosCatalogo(compra);
            this.cargarDevoluciones(compra.id);
          },
          error: error => {
            this.accionando = false;
            this.snackBar.open(mapHttpError(error, 'No se pudo completar la compra.').message, 'Cerrar', { duration: 4500 });
          }
        });
      }
    });
  }

  cancelar(): void {
    if (this.compra == null) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Cancelar esta compra pendiente? No entra inventario ni cambia el costo.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok === true && this.compra) {
        this.accionando = true;
        this.compraService.cancelar(this.compra.id).subscribe({
          next: compra => {
            this.compra = compra;
            this.accionando = false;
            this.snackBar.open('Compra cancelada.', 'Cerrar', { duration: 3000 });
          },
          error: error => {
            this.accionando = false;
            this.snackBar.open(mapHttpError(error, 'No se pudo cancelar la compra.').message, 'Cerrar', { duration: 4500 });
          }
        });
      }
    });
  }

  registrarDevolucion(): void {
    if (this.compra) {
      this.router.navigate(['/compras', this.compra.id, 'devolucion']);
    }
  }

  verDevolucion(devolucion: DevolucionCompraResponseDTO): void {
    if (this.compra) {
      this.router.navigate(['/compras', this.compra.id, 'devoluciones', devolucion.id]);
    }
  }

  costoCatalogo(productoId: number | null): string {
    if (productoId == null || !this.costosCatalogo[productoId]) {
      return '—';
    }
    const producto = this.costosCatalogo[productoId];
    return producto.costoConocido ? formatImporte(producto.costoActual) : 'Sin costo';
  }

  private cargarDevoluciones(id: number): void {
    this.devolucionesState = 'loading';
    this.compraService.listarDevoluciones(id).subscribe({
      next: items => {
        this.devoluciones = items;
        this.devolucionesState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.devolucionesState = 'error';
      }
    });
  }

  private cargarCostosCatalogo(compra: CompraResponseDTO): void {
    const ids = [...new Set(
      compra.detalles
        .map(linea => linea.productoId)
        .filter((id): id is number => id != null)
    )];
    if (ids.length === 0) {
      return;
    }
    forkJoin(ids.map(id => this.productoService.obtenerPorId(id))).subscribe({
      next: productos => {
        const mapa: Record<number, ProductoModel> = {};
        for (const producto of productos) {
          if (producto.id != null) {
            mapa[producto.id] = producto;
          }
        }
        this.costosCatalogo = mapa;
      },
      error: () => {
        this.costosCatalogo = {};
      }
    });
  }
}
