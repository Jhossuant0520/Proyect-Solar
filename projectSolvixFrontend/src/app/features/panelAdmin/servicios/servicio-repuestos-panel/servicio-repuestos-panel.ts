import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import {
  EstadoOrdenServicio,
  RepuestoOrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';
import {
  contarRepuestosPendientes,
  labelEstadoRepuesto,
  mensajeErrorServicio,
  puedePlanificarRepuestos,
  toneEstadoRepuesto
} from '../servicio-ui';
import {
  PlanificarRepuestoDialogComponent,
  PlanificarRepuestoDialogData
} from './planificar-repuesto-dialog/planificar-repuesto-dialog';
import {
  CantidadRepuestoDialogComponent,
  CantidadRepuestoDialogData,
  CantidadRepuestoModo
} from './cantidad-repuesto-dialog/cantidad-repuesto-dialog';

type PanelEstado = 'loading' | 'ready' | 'empty' | 'error';

export interface RepuestosPanelChange {
  pending: number;
  items: RepuestoOrdenServicioResponseDTO[];
}

@Component({
  selector: 'app-servicio-repuestos-panel',
  standalone: true,
  templateUrl: './servicio-repuestos-panel.html',
  styleUrl: './servicio-repuestos-panel.scss',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    SolvixSectionHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ServicioRepuestosPanelComponent implements OnChanges {
  @Input({ required: true }) ordenId!: number;
  @Input({ required: true }) estado!: EstadoOrdenServicio;
  @Input() canManage = true;

  @Output() readonly repuestosChange = new EventEmitter<RepuestosPanelChange>();

  lineas: RepuestoOrdenServicioResponseDTO[] = [];
  state: PanelEstado = 'loading';
  errorMessage = 'No pudimos cargar los repuestos.';
  accionEnCurso = false;

  readonly labelEstado = labelEstadoRepuesto;
  readonly toneEstado = toneEstadoRepuesto;
  readonly money = formatMoney;

  constructor(
    private ordenServicioService: OrdenServicioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ordenId'] && this.ordenId != null) {
      this.cargar();
    } else if (changes['estado'] && this.ordenId != null && !changes['ordenId']) {
      this.cargar();
    }
  }

  get puedeAgregar(): boolean {
    return this.canManage && puedePlanificarRepuestos(this.estado);
  }

  get enEsperaRepuesto(): boolean {
    return this.estado === 'ESPERA_REPUESTO';
  }

  get pendingCount(): number {
    return contarRepuestosPendientes(this.lineas);
  }

  cargar(): void {
    if (this.ordenId == null) {
      this.state = 'error';
      this.emitChange([]);
      return;
    }
    this.state = 'loading';
    this.ordenServicioService.listarRepuestos(this.ordenId).subscribe({
      next: lista => {
        this.lineas = lista;
        this.state = lista.length === 0 ? 'empty' : 'ready';
        this.emitChange(lista);
      },
      error: error => {
        this.lineas = [];
        this.state = 'error';
        this.errorMessage = mensajeErrorServicio(error, 'No pudimos cargar los repuestos.');
        this.emitChange([]);
      }
    });
  }

  textoCosto(linea: RepuestoOrdenServicioResponseDTO): string {
    if (linea.costoConocido && linea.costoHistorico != null) {
      return this.money(linea.costoHistorico);
    }
    return 'Costo histórico no disponible';
  }

  costoDisponible(linea: RepuestoOrdenServicioResponseDTO): boolean {
    return !!(linea.costoConocido && linea.costoHistorico != null);
  }

  abrirAgregar(): void {
    if (!this.puedeAgregar || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(PlanificarRepuestoDialogComponent, {
      width: '480px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { ordenId: this.ordenId } satisfies PlanificarRepuestoDialogData
    });
    ref.afterClosed().subscribe((result?: RepuestoOrdenServicioResponseDTO) => {
      if (result) {
        showSolvixSnack(this.snackBar, 'Repuesto planificado.', 'success');
        this.cargar();
      }
    });
  }

  abrirEditar(linea: RepuestoOrdenServicioResponseDTO): void {
    if (!this.canManage || !linea.puedeEditar || this.accionEnCurso) {
      return;
    }
    const min = Math.max(1, linea.cantidadNetaConsumida);
    this.abrirCantidad(linea, 'editar', 9999, min);
  }

  abrirConsumir(linea: RepuestoOrdenServicioResponseDTO): void {
    if (!this.canManage || !linea.puedeConsumir || this.accionEnCurso) {
      return;
    }
    const max = Math.max(1, linea.cantidadPendiente);
    this.abrirCantidad(linea, 'consumir', max);
  }

  abrirDevolver(linea: RepuestoOrdenServicioResponseDTO): void {
    if (!this.canManage || !linea.puedeDevolver || this.accionEnCurso) {
      return;
    }
    const max = Math.max(1, linea.cantidadNetaConsumida);
    this.abrirCantidad(linea, 'devolver', max);
  }

  confirmarAnular(linea: RepuestoOrdenServicioResponseDTO): void {
    if (!this.canManage || !linea.puedeEliminar || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      width: '420px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        mensaje: `¿Anular el repuesto «${linea.productoNombre}»? La línea quedará anulada.`
      }
    });
    ref.afterClosed().subscribe((ok?: boolean) => {
      if (!ok) {
        return;
      }
      this.accionEnCurso = true;
      this.ordenServicioService.anularRepuesto(this.ordenId, linea.id).subscribe({
        next: () => {
          this.accionEnCurso = false;
          showSolvixSnack(this.snackBar, 'Repuesto anulado.', 'success');
          this.cargar();
        },
        error: error => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(error, 'No pudimos anular el repuesto.'),
            'error'
          );
        }
      });
    });
  }

  private abrirCantidad(
    linea: RepuestoOrdenServicioResponseDTO,
    modo: CantidadRepuestoModo,
    maxCantidad: number,
    minCantidad = 1
  ): void {
    const ref = this.dialog.open(CantidadRepuestoDialogComponent, {
      width: '420px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        ordenId: this.ordenId,
        linea,
        modo,
        maxCantidad,
        minCantidad
      } satisfies CantidadRepuestoDialogData
    });
    ref.afterClosed().subscribe((result?: RepuestoOrdenServicioResponseDTO) => {
      if (!result) {
        return;
      }
      const msg =
        modo === 'editar'
          ? 'Cantidad actualizada.'
          : modo === 'consumir'
            ? 'Repuesto consumido.'
            : 'Repuesto devuelto.';
      showSolvixSnack(this.snackBar, msg, 'success');
      this.cargar();
    });
  }

  private emitChange(items: RepuestoOrdenServicioResponseDTO[]): void {
    this.repuestosChange.emit({
      pending: contarRepuestosPendientes(items),
      items
    });
  }
}
