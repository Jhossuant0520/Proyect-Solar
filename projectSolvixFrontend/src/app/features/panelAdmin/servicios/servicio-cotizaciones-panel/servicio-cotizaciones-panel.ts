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
import { CotizacionServicioService } from '../../../../core/services/cotizacion-servicio.service';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import {
  CotizacionServicioResponseDTO,
  ResumenEconomicoOrdenServicioDTO
} from '../../../../core/models/cotizacion-servicio.models';
import {
  DocumentoOrdenServicioResponseDTO,
  TipoDocumentoOrdenServicio
} from '../../../../core/models/documento-orden-servicio.models';
import { EstadoOrdenServicio } from '../../../../core/models/orden-servicio.models';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';
import {
  formatFechaOrden,
  labelEstadoCotizacion,
  labelTipoCotizacion,
  labelTipoDetalleCotizacion,
  mensajeErrorServicio,
  toneEstadoCotizacion
} from '../servicio-ui';
import {
  CotizacionFormDialogComponent,
  CotizacionFormDialogData,
  CotizacionFormModo
} from './cotizacion-form-dialog/cotizacion-form-dialog';
import {
  CotizacionConfirmarDialogComponent,
  CotizacionConfirmarDialogData
} from './cotizacion-confirmar-dialog/cotizacion-confirmar-dialog';
import {
  CotizacionRechazarDialogComponent,
  CotizacionRechazarDialogData
} from './cotizacion-rechazar-dialog/cotizacion-rechazar-dialog';

type PanelEstado = 'loading' | 'ready' | 'empty' | 'error';

export type CotizacionPanelIntent =
  | 'crear-inicial'
  | 'crear-adicional'
  | 'presentar'
  | 'aprobar'
  | 'scroll';

export interface CotizacionesPanelChange {
  items: CotizacionServicioResponseDTO[];
  resumen: ResumenEconomicoOrdenServicioDTO | null;
}

/** PDF de cotización (generado al presentar). */
export interface DocumentoCotizacionEsperado {
  tipo: TipoDocumentoOrdenServicio;
  cotizacionId: number;
}

@Component({
  selector: 'app-servicio-cotizaciones-panel',
  standalone: true,
  templateUrl: './servicio-cotizaciones-panel.html',
  styleUrl: './servicio-cotizaciones-panel.scss',
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
export class ServicioCotizacionesPanelComponent implements OnChanges {
  @Input({ required: true }) ordenId!: number;
  @Input({ required: true }) estado!: EstadoOrdenServicio;
  @Input() canManage = true;

  @Output() readonly cotizacionesChange = new EventEmitter<CotizacionesPanelChange>();
  /** Cuando present/approve/reject mueve el estado de la OT. */
  @Output() readonly ordenActualizada = new EventEmitter<void>();
  /** Tras presentar: el detalle espera el PDF en el panel Documentos. */
  @Output() readonly documentoEsperado = new EventEmitter<DocumentoCotizacionEsperado>();

  cotizaciones: CotizacionServicioResponseDTO[] = [];
  resumen: ResumenEconomicoOrdenServicioDTO | null = null;
  state: PanelEstado = 'loading';
  resumenState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  errorMessage = 'No pudimos cargar las cotizaciones.';
  accionEnCurso = false;
  expandidaId: number | null = null;
  /** Docs COTIZACION indexados por cotizacionId (versión más reciente). */
  docsPorCotizacion = new Map<number, DocumentoOrdenServicioResponseDTO>();
  pdfAccionId: number | null = null;

  readonly money = formatMoney;
  readonly fecha = formatFechaOrden;
  readonly labelEstado = labelEstadoCotizacion;
  readonly toneEstado = toneEstadoCotizacion;
  readonly labelTipo = labelTipoCotizacion;
  readonly labelDetalle = labelTipoDetalleCotizacion;

  constructor(
    private cotizacionService: CotizacionServicioService,
    private documentoService: DocumentoOrdenServicioService,
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

  get puedeCrearInicial(): boolean {
    return this.canManage && this.estado === 'DIAGNOSTICADO';
  }

  get puedeCrearAdicional(): boolean {
    return this.canManage && this.estado === 'REQUIERE_APROBACION_ADICIONAL';
  }

  get cotizacionPresentable(): CotizacionServicioResponseDTO | null {
    return this.cotizaciones.find(c => c.puedePresentar) ?? null;
  }

  get cotizacionAprobable(): CotizacionServicioResponseDTO | null {
    return this.cotizaciones.find(c => c.puedeAprobar) ?? null;
  }

  cargar(): void {
    if (this.ordenId == null) {
      this.state = 'error';
      this.emitChange([], null);
      return;
    }
    this.state = 'loading';
    this.resumenState = 'loading';
    this.cotizacionService.listar(this.ordenId).subscribe({
      next: lista => {
        this.cotizaciones = lista;
        this.state = lista.length === 0 ? 'empty' : 'ready';
        this.emitChange(lista, this.resumen);
      },
      error: error => {
        this.cotizaciones = [];
        this.state = 'error';
        this.errorMessage = mensajeErrorServicio(error, 'No pudimos cargar las cotizaciones.');
        this.emitChange([], null);
      }
    });
    this.cotizacionService.resumenEconomico(this.ordenId).subscribe({
      next: resumen => {
        this.resumen = resumen;
        this.resumenState = 'ready';
        this.emitChange(this.cotizaciones, resumen);
      },
      error: () => {
        this.resumen = null;
        this.resumenState = 'error';
      }
    });
    this.cargarDocumentosCotizacion();
  }

  docDe(cotizacion: CotizacionServicioResponseDTO): DocumentoOrdenServicioResponseDTO | null {
    return this.docsPorCotizacion.get(cotizacion.id) ?? null;
  }

  puedePdf(cotizacion: CotizacionServicioResponseDTO): boolean {
    return cotizacion.estado !== 'BORRADOR';
  }

  verPdf(cotizacion: CotizacionServicioResponseDTO): void {
    const doc = this.docDe(cotizacion);
    if (!doc || this.accionEnCurso) {
      return;
    }
    this.accionEnCurso = true;
    this.pdfAccionId = cotizacion.id;
    this.documentoService.descargarPdf(this.ordenId, doc.id, 'inline').subscribe({
      next: blob => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        this.documentoService.abrirPdfEnNuevaPestana(blob);
      },
      error: err => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos abrir el PDF.'),
          'error'
        );
      }
    });
  }

  descargarPdf(cotizacion: CotizacionServicioResponseDTO): void {
    const doc = this.docDe(cotizacion);
    if (!doc || this.accionEnCurso) {
      return;
    }
    this.accionEnCurso = true;
    this.pdfAccionId = cotizacion.id;
    this.documentoService.descargarPdf(this.ordenId, doc.id, 'attachment').subscribe({
      next: blob => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        this.documentoService.descargarBlobComoArchivo(
          blob,
          doc.nombreArchivo || `${cotizacion.numero}.pdf`
        );
      },
      error: err => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos descargar el PDF.'),
          'error'
        );
      }
    });
  }

  generarPdf(cotizacion: CotizacionServicioResponseDTO): void {
    if (!this.puedePdf(cotizacion) || this.accionEnCurso) {
      return;
    }
    this.accionEnCurso = true;
    this.pdfAccionId = cotizacion.id;
    this.documentoService.generarCotizacionPdf(this.ordenId, cotizacion.id).subscribe({
      next: doc => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        this.docsPorCotizacion.set(cotizacion.id, doc);
        showSolvixSnack(this.snackBar, 'Documento de cotización generado.', 'success');
        this.documentoEsperado.emit({ tipo: 'COTIZACION', cotizacionId: cotizacion.id });
      },
      error: err => {
        this.accionEnCurso = false;
        this.pdfAccionId = null;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos generar el PDF de cotización.'),
          'error'
        );
      }
    });
  }

  private cargarDocumentosCotizacion(): void {
    this.documentoService.listar(this.ordenId).subscribe({
      next: lista => {
        const map = new Map<number, DocumentoOrdenServicioResponseDTO>();
        for (const d of lista ?? []) {
          if (d.tipoDocumento !== 'COTIZACION' || d.cotizacionId == null) {
            continue;
          }
          const prev = map.get(d.cotizacionId);
          if (!prev || (d.version ?? 0) >= (prev.version ?? 0)) {
            map.set(d.cotizacionId, d);
          }
        }
        this.docsPorCotizacion = map;
      },
      error: () => {
        this.docsPorCotizacion = new Map();
      }
    });
  }

  /** Invocado desde el detalle (próxima acción). */
  ejecutarIntent(intent: CotizacionPanelIntent): void {
    switch (intent) {
      case 'crear-inicial':
        this.abrirFormulario('inicial');
        break;
      case 'crear-adicional':
        this.abrirFormulario('adicional');
        break;
      case 'presentar':
        if (this.cotizacionPresentable) {
          this.presentar(this.cotizacionPresentable);
        } else {
          showSolvixSnack(
            this.snackBar,
            'No hay una cotización en borrador lista para presentar.',
            'warning'
          );
        }
        break;
      case 'aprobar':
        if (this.cotizacionAprobable) {
          this.aprobar(this.cotizacionAprobable);
        } else {
          showSolvixSnack(
            this.snackBar,
            'No hay una cotización pendiente de aprobación.',
            'warning'
          );
        }
        break;
      case 'scroll':
      default:
        break;
    }
  }

  abrirFormulario(modo: CotizacionFormModo, cotizacion?: CotizacionServicioResponseDTO): void {
    if (!this.canManage || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(CotizacionFormDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        ordenId: this.ordenId,
        modo,
        cotizacion: cotizacion ?? null
      } satisfies CotizacionFormDialogData
    });
    ref.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      showSolvixSnack(
        this.snackBar,
        'Cotización guardada. Preséntala al cliente para generar el PDF.',
        'success'
      );
      this.cargar();
      this.ordenActualizada.emit();
    });
  }

  editar(cotizacion: CotizacionServicioResponseDTO): void {
    if (!cotizacion.puedeEditar) {
      return;
    }
    this.abrirFormulario('editar', cotizacion);
  }

  presentar(cotizacion: CotizacionServicioResponseDTO): void {
    if (!cotizacion.puedePresentar || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(CotizacionConfirmarDialogComponent, {
      width: '460px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { modo: 'presentar', numero: cotizacion.numero } satisfies CotizacionConfirmarDialogData
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) {
        return;
      }
      this.accionEnCurso = true;
      this.cotizacionService.presentar(this.ordenId, cotizacion.id).subscribe({
        next: () => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            'Cotización presentada. Generando documento PDF…',
            'success'
          );
          this.cargar();
          this.ordenActualizada.emit();
          this.documentoEsperado.emit({
            tipo: 'COTIZACION',
            cotizacionId: cotizacion.id
          });
        },
        error: err => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(err, 'No pudimos presentar la cotización.'),
            'error'
          );
        }
      });
    });
  }

  aprobar(cotizacion: CotizacionServicioResponseDTO): void {
    if (!cotizacion.puedeAprobar || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(CotizacionConfirmarDialogComponent, {
      width: '460px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { modo: 'aprobar', numero: cotizacion.numero } satisfies CotizacionConfirmarDialogData
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) {
        return;
      }
      this.accionEnCurso = true;
      this.cotizacionService.aprobar(this.ordenId, cotizacion.id).subscribe({
        next: () => {
          this.accionEnCurso = false;
          showSolvixSnack(this.snackBar, 'Cotización aprobada.', 'success');
          this.cargar();
          this.ordenActualizada.emit();
        },
        error: err => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(err, 'No pudimos aprobar la cotización.'),
            'error'
          );
        }
      });
    });
  }

  rechazar(cotizacion: CotizacionServicioResponseDTO): void {
    if (!cotizacion.puedeRechazar || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(CotizacionRechazarDialogComponent, {
      width: '460px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { numero: cotizacion.numero } satisfies CotizacionRechazarDialogData
    });
    ref.afterClosed().subscribe(body => {
      if (!body) {
        return;
      }
      this.accionEnCurso = true;
      this.cotizacionService.rechazar(this.ordenId, cotizacion.id, body).subscribe({
        next: () => {
          this.accionEnCurso = false;
          showSolvixSnack(this.snackBar, 'Cotización rechazada.', 'success');
          this.cargar();
          this.ordenActualizada.emit();
        },
        error: err => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(err, 'No pudimos rechazar la cotización.'),
            'error'
          );
        }
      });
    });
  }

  eliminar(cotizacion: CotizacionServicioResponseDTO): void {
    if (cotizacion.estado !== 'BORRADOR' || this.accionEnCurso) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      width: '420px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        mensaje: `¿Eliminar el borrador ${cotizacion.numero}? Esta acción no se puede deshacer.`
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) {
        return;
      }
      this.accionEnCurso = true;
      this.cotizacionService.eliminarBorrador(this.ordenId, cotizacion.id).subscribe({
        next: () => {
          this.accionEnCurso = false;
          showSolvixSnack(this.snackBar, 'Borrador eliminado.', 'success');
          this.cargar();
        },
        error: err => {
          this.accionEnCurso = false;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(err, 'No pudimos eliminar el borrador.'),
            'error'
          );
        }
      });
    });
  }

  toggleDetalles(id: number): void {
    this.expandidaId = this.expandidaId === id ? null : id;
  }

  private emitChange(
    items: CotizacionServicioResponseDTO[],
    resumen: ResumenEconomicoOrdenServicioDTO | null
  ): void {
    this.cotizacionesChange.emit({ items, resumen });
  }
}
