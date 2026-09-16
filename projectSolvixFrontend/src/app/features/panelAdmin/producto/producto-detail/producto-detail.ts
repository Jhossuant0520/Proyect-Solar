import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { InventarioService } from '../../../../core/services/inventario.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { AjusteCostoResponseDTO, MovimientoInventarioResponseDTO } from '../../../../core/models/inventario.models';
import { ProductoModel } from '../productoClase';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { formatFechaCorta, labelCodigoBarras, labelMotivoAjuste, labelTipoMovimiento } from '../producto-ui';
import { labelCostoHistorico, ordenarPorFechaDesc } from '../../inventario/inventario-ui';
import { AjusteCostoDialogComponent } from '../ajuste-costo-dialog/ajuste-costo-dialog';
import { resolverUrlMedia } from '../../../../core/utils/media-url';
import { MENSAJE_IMAGEN_EXTERNA_FALLA } from '../producto-imagen';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

@Component({
  selector: 'app-producto-detail',
  standalone: true,
  templateUrl: './producto-detail.html',
  styleUrl: './producto-detail.scss',
  imports: [
    MatSnackBarModule,
    MatDialogModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ProductoDetailComponent implements OnInit {
  producto: ProductoModel | null = null;
  movimientos: MovimientoInventarioResponseDTO[] = [];
  ajustes: AjusteCostoResponseDTO[] = [];
  state: 'loading' | 'ready' | 'error' = 'loading';
  movimientosState: 'loading' | 'ready' | 'empty' | 'error' = 'loading';
  ajustesState: 'loading' | 'ready' | 'empty' | 'error' = 'loading';
  imagenFallida = false;

  readonly money = formatMoney;
  readonly fecha = formatFechaCorta;
  readonly motivo = labelMotivoAjuste;
  readonly tipoMovimiento = labelTipoMovimiento;
  readonly labelCodigo = labelCodigoBarras;
  readonly costoHistorico = labelCostoHistorico;
  readonly mensajeImagenFalla = MENSAJE_IMAGEN_EXTERNA_FALLA;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private inventario: InventarioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get productoId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.productoId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.productoService.obtenerPorId(id).subscribe({
      next: producto => {
        this.producto = producto;
        this.imagenFallida = false;
        this.state = 'ready';
        this.cargarMovimientos(id);
        this.cargarAjustes(id);
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  urlImagen(producto: ProductoModel): string | null {
    return resolverUrlMedia(producto.imagenUrl);
  }

  onImagenError(): void {
    this.imagenFallida = true;
  }

  editar(): void {
    if (this.producto?.id != null) {
      this.router.navigate(['/productos', this.producto.id, 'editar']);
    }
  }

  irAHistorial(): void {
    document.getElementById('historial-costo')?.scrollIntoView({ behavior: 'smooth' });
  }

  irAInventario(): void {
    if (this.producto?.id == null) {
      return;
    }
    this.router.navigate(['/inventario'], { queryParams: { productoId: this.producto.id } });
  }

  ajustarCosto(): void {
    if (this.producto?.id == null) {
      return;
    }
    const ref = this.dialog.open(AjusteCostoDialogComponent, {
      data: {
        productoId: this.producto.id,
        nombre: this.producto.nombre,
        costoActual: this.producto.costoActual ?? null,
        costoConocido: this.producto.costoConocido === true,
        stockActual: this.producto.stockActual ?? 0
      },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (!resultado || this.producto == null) {
        return;
      }
      this.producto = {
        ...this.producto,
        costoActual: resultado.costoProductoResultante,
        costoConocido: resultado.costoProductoResultante != null,
        stockActual: resultado.stockAlAjustar
      };
      showSolvixSnack(this.snackBar, 'Costo actualizado. El stock no cambió.', 'success');
      if (this.producto.id != null) {
        this.cargarAjustes(this.producto.id);
        this.productoService.obtenerPorId(this.producto.id).subscribe({
          next: producto => this.producto = producto
        });
      }
    });
  }

  signo(movimiento: MovimientoInventarioResponseDTO): string {
    return movimiento.direccion === 'ENTRADA' ? '+' : '−';
  }

  private cargarMovimientos(id: number): void {
    this.movimientosState = 'loading';
    this.inventario.listarMovimientos(id).subscribe({
      next: items => {
        this.movimientos = ordenarPorFechaDesc(items).slice(0, 8);
        this.movimientosState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.movimientosState = 'error';
      }
    });
  }

  private cargarAjustes(id: number): void {
    this.ajustesState = 'loading';
    this.inventario.listarAjustesCosto(id).subscribe({
      next: items => {
        this.ajustes = ordenarPorFechaDesc(items);
        this.ajustesState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.ajustesState = 'error';
      }
    });
  }
}
