import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
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
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
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
    private feedback: SolvixFeedbackService,
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
