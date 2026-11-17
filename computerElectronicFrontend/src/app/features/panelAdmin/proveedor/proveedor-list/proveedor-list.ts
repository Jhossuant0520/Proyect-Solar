import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CeBadgeComponent } from '../../../../shared/components/ce-badge/ce-badge';
import { CeButtonComponent } from '../../../../shared/components/ce-button/ce-button';
import { CeEmptyStateComponent } from '../../../../shared/components/ce-empty-state/ce-empty-state';
import { CeErrorStateComponent } from '../../../../shared/components/ce-error-state/ce-error-state';
import { CeLoadingStateComponent } from '../../../../shared/components/ce-loading-state/ce-loading-state';
import { CePageHeaderComponent } from '../../../../shared/components/ce-page-header/ce-page-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { aRequestConEstado } from '../proveedor-mapper';
import {
  documentoVisible,
  filtrarProveedores,
  labelCondicionPago,
  mensajeErrorProveedor,
  puedeDesactivarProveedor,
  razonSocialVisible
} from '../proveedor-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-proveedor-list',
  standalone: true,
  templateUrl: './proveedor-list.html',
  styleUrl: './proveedor-list.scss',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    CePageHeaderComponent,
    CeButtonComponent,
    CeBadgeComponent,
    CeLoadingStateComponent,
    CeEmptyStateComponent,
    CeErrorStateComponent
  ]
})
export class ProveedorListComponent implements OnInit {
  proveedores: ProveedorResponseDTO[] = [];
  state: ListaEstado = 'loading';
  search = '';
  filtroActivo: '' | 'true' | 'false' = '';

  readonly razon = razonSocialVisible;
  readonly documento = documentoVisible;
  readonly condicion = labelCondicionPago;
  readonly puedeDesactivar = puedeDesactivarProveedor;

  constructor(
    private proveedorService: ProveedorService,
    private dialog: MatDialog,
    private feedback: FeedbackService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): ProveedorResponseDTO[] {
    return filtrarProveedores(this.proveedores, {
      query: this.search,
      activo: this.filtroActivo
    });
  }

  get hayFiltros(): boolean {
    return Boolean(this.search.trim() || this.filtroActivo);
  }

  cargar(): void {
    this.state = 'loading';
    this.proveedorService.listar(false).subscribe({
      next: proveedores => {
        this.proveedores = proveedores;
        this.state = proveedores.length === 0 ? 'empty' : 'ready';
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

  limpiar(): void {
    this.search = '';
    this.filtroActivo = '';
  }

  nuevo(): void {
    this.router.navigate(['/proveedores/nuevo']);
  }

  ver(proveedor: ProveedorResponseDTO): void {
    this.router.navigate(['/proveedores', proveedor.id]);
  }

  editar(proveedor: ProveedorResponseDTO): void {
    this.router.navigate(['/proveedores', proveedor.id, 'editar']);
  }

  desactivar(proveedor: ProveedorResponseDTO): void {
    if (!puedeDesactivarProveedor(proveedor)) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: {
        titulo: '¿Desactivar este proveedor?',
        kicker: 'Estado del proveedor',
        mensaje: '¿Desactivar este proveedor? Seguirá en el historial de compras.',
        icono: 'domain_disabled',
        tipo: 'warning',
        confirmText: 'Desactivar proveedor'
      },
      panelClass: 'ce-dialog-panel',
      backdropClass: 'ce-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado !== true) {
        return;
      }
      this.proveedorService.desactivar(proveedor.id, aRequestConEstado(proveedor, false)).subscribe({
        next: actualizado => {
          this.proveedores = this.proveedores.map(item =>
            item.id === actualizado.id ? actualizado : item);
          this.feedback.warning('Proveedor desactivado');
        },
        error: err => {
          this.feedback.error(mensajeErrorProveedor(err), 4000);
        }
      });
    });
  }

  activar(proveedor: ProveedorResponseDTO): void {
    if (proveedor.activo) {
      return;
    }
    this.proveedorService.actualizar(proveedor.id, aRequestConEstado(proveedor, true)).subscribe({
      next: actualizado => {
        this.proveedores = this.proveedores.map(item =>
          item.id === actualizado.id ? actualizado : item);
        this.feedback.success('Proveedor activado');
      },
      error: err => {
        this.feedback.error(mensajeErrorProveedor(err), 4000);
      }
    });
  }
}
