import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { CompraService } from '../../../../core/services/compra.service';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { CompraResponseDTO } from '../../../../core/models/compra.models';
import { formatImporte } from '../../venta/venta-ui';
import { formatFechaCorta } from '../../producto/producto-ui';
import { labelEstadoCompra, toneEstadoCompra } from '../../compra/compra-ui';
import { aRequestConEstado, rutaCompra } from '../proveedor-mapper';
import {
  documentoVisible,
  labelCondicionPago,
  labelTipoContacto,
  mensajeErrorProveedor,
  puedeDesactivarProveedor,
  razonSocialVisible
} from '../proveedor-ui';

type BloqueEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-proveedor-detail',
  standalone: true,
  templateUrl: './proveedor-detail.html',
  styleUrl: './proveedor-detail.scss',
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
export class ProveedorDetailComponent implements OnInit {
  proveedor: ProveedorResponseDTO | null = null;
  compras: CompraResponseDTO[] = [];
  state: 'loading' | 'ready' | 'error' = 'loading';
  comprasState: BloqueEstado = 'loading';

  readonly razon = razonSocialVisible;
  readonly documento = documentoVisible;
  readonly condicion = labelCondicionPago;
  readonly tipoContacto = labelTipoContacto;
  readonly fecha = formatFechaCorta;
  readonly money = formatImporte;
  readonly estadoCompra = labelEstadoCompra;
  readonly tonoCompra = toneEstadoCompra;
  readonly rutaCompra = rutaCompra;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proveedorService: ProveedorService,
    private compraService: CompraService,
    private dialog: MatDialog,
    private feedback: SolvixFeedbackService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get proveedorId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get contactosVisibles() {
    return (this.proveedor?.contactos || []).slice().sort((a, b) => {
      if (a.principal === b.principal) {
        return a.nombre.localeCompare(b.nombre);
      }
      return a.principal ? -1 : 1;
    });
  }

  ubicacionVisible(proveedor: ProveedorResponseDTO): string {
    return [proveedor.ciudad, proveedor.departamento].filter(v => !!v).join(' · ');
  }

  cargar(): void {
    const id = this.proveedorId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.proveedorService.obtenerPorId(id).subscribe({
      next: proveedor => {
        this.proveedor = proveedor;
        this.state = 'ready';
        this.cargarCompras(id);
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  editar(): void {
    if (this.proveedor == null) {
      return;
    }
    this.router.navigate(['/proveedores', this.proveedor.id, 'editar']);
  }

  desactivar(): void {
    if (this.proveedor == null || !puedeDesactivarProveedor(this.proveedor)) {
      return;
    }
    const proveedor = this.proveedor;
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Desactivar este proveedor? Seguirá en el historial de compras.' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado !== true) {
        return;
      }
      this.proveedorService.desactivar(proveedor.id, aRequestConEstado(proveedor, false)).subscribe({
        next: actualizado => {
          this.proveedor = actualizado;
          this.feedback.warning('Proveedor desactivado');
        },
        error: err => {
          this.feedback.error(mensajeErrorProveedor(err), 4000);
        }
      });
    });
  }

  activar(): void {
    if (this.proveedor == null || this.proveedor.activo) {
      return;
    }
    this.proveedorService.actualizar(this.proveedor.id, aRequestConEstado(this.proveedor, true)).subscribe({
      next: actualizado => {
        this.proveedor = actualizado;
        this.feedback.success('Proveedor activado');
      },
      error: err => {
        this.feedback.error(mensajeErrorProveedor(err), 4000);
      }
    });
  }

  private cargarCompras(id: number): void {
    this.comprasState = 'loading';
    this.compraService.listar({ proveedorId: id }).subscribe({
      next: items => {
        this.compras = [...items].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
        this.comprasState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.comprasState = 'error';
      }
    });
  }
}
