import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import {
  CotizacionComercialResponseDTO,
  DocumentoCotizacionComercialResponseDTO
} from '../../../../core/models/cotizacion-comercial.models';
import { RechazarCotizacionRequestDTO } from '../../../../core/models/cotizacion-servicio.models';
import {
  CotizacionRechazarDialogComponent,
  CotizacionRechazarDialogData
} from '../../servicios/servicio-cotizaciones-panel/cotizacion-rechazar-dialog/cotizacion-rechazar-dialog';
import { formatFechaVenta, formatImporte, mapHttpError } from '../../venta/venta-ui';
import { labelEstadoCotizacion, labelTipoLinea, participaEnResumenCotizacion, toneEstadoCotizacion } from '../cotizacion-comercial-ui';

type CargaEstado = 'loading' | 'ready' | 'error';
export type AccionCotizacion = 'presentar' | 'aprobar' | 'rechazar' | 'anular';

@Component({
  selector: 'app-cotizacion-comercial-detail',
  standalone: true,
  templateUrl: './cotizacion-comercial-detail.html',
  styleUrl: './cotizacion-comercial-detail.scss',
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class CotizacionComercialDetailComponent implements OnInit {
  cotizacion: CotizacionComercialResponseDTO | null = null;
  documentos: DocumentoCotizacionComercialResponseDTO[] = [];
  estado: CargaEstado = 'loading';
  procesando: AccionCotizacion | 'pdf' | 'regenerar' | null = null;
  /** Presentar OK de negocio pero PDF no generado en esa operación. */
  pdfPendienteTrasPresentar = false;
  errorTitle = 'No pudimos cargar la cotización.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';

  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCotizacion;
  readonly estadoTone = toneEstadoCotizacion;
  readonly labelTipo = labelTipoLinea;
  /** D.6: categoría del resumen solo si importe &gt; 0. */
  readonly participaEnResumen = participaEnResumenCotizacion;

  private id = 0;
  private readonly cotizacionService = inject(CotizacionComercialService);
  private readonly documentoHelper = inject(DocumentoOrdenServicioService);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(SolvixFeedbackService);
  private readonly actionReveal = inject(SolvixActionRevealService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  get documentoVigente(): DocumentoCotizacionComercialResponseDTO | null {
    return this.cotizacion?.documentoVigente ?? this.documentos[0] ?? null;
  }

  get puedeVerDocumento(): boolean {
    return this.cotizacion != null && this.cotizacion.estado !== 'BORRADOR';
  }

  cargar(): void {
    this.estado = 'loading';
    this.cotizacionService.obtener(this.id).subscribe({
      next: cot => {
        this.cotizacion = cot;
        this.estado = 'ready';
        this.cargarDocumentos();
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar la cotización.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.estado = 'error';
      }
    });
  }

  editar(): void {
    this.router.navigate(['/cotizaciones', this.id, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/cotizaciones']);
  }

  presentar(): void {
    if (this.procesando !== null) {
      return;
    }
    this.procesando = 'presentar';
    this.cotizacionService.presentar(this.id).pipe(
      finalize(() => {
        this.procesando = null;
      })
    ).subscribe({
      next: cot => {
        this.aplicarResultadoPresentar(cot);
      },
      error: error => {
        this.feedback.error(mapHttpError(error, 'No pudimos presentar la cotización.').message);
      }
    });
  }

  aprobar(): void {
    this.confirmar('¿Marcar la cotización como aprobada por el cliente? Ya no se podrá editar.', () =>
      this.ejecutar('aprobar', this.cotizacionService.aprobar(this.id), 'Cotización aprobada.'));
  }

  rechazar(): void {
    if (!this.cotizacion) {
      return;
    }
    const ref = this.dialog.open<CotizacionRechazarDialogComponent, CotizacionRechazarDialogData,
      RechazarCotizacionRequestDTO | undefined>(CotizacionRechazarDialogComponent, {
      width: '480px',
      maxWidth: '96vw',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { numero: this.cotizacion.numero }
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.ejecutar('rechazar', this.cotizacionService.rechazar(this.id, resultado.observacion),
          'Cotización rechazada.');
      }
    });
  }

  anular(): void {
    this.confirmar('¿Anular esta cotización? Queda en el historial pero no podrá presentarse ni aprobarse.', () =>
      this.ejecutar('anular', this.cotizacionService.anular(this.id), 'Cotización anulada.'));
  }

  verPdf(): void {
    this.abrirDocumento('inline');
  }

  descargarPdf(): void {
    this.abrirDocumento('attachment');
  }

  regenerarPdf(): void {
    if (this.procesando !== null) {
      return;
    }
    this.procesando = 'regenerar';
    this.cotizacionService.regenerarDocumento(this.id).pipe(
      finalize(() => {
        this.procesando = null;
      })
    ).subscribe({
      next: doc => {
        this.pdfPendienteTrasPresentar = false;
        this.documentos = [doc, ...this.documentos.filter(d => d.id !== doc.id)];
        if (this.cotizacion) {
          this.cotizacion = {
            ...this.cotizacion,
            documentoVigente: doc,
            documentoGenerado: true
          };
        }
        this.actionReveal.success({
          message: 'Documento generado',
          target: '#panel-documentos-cotizacion'
        });
      },
      error: error => {
        this.feedback.error(mapHttpError(error, 'No pudimos generar el documento.').message);
      }
    });
  }

  private abrirDocumento(disposition: 'inline' | 'attachment'): void {
    const doc = this.documentoVigente;
    if (!doc || this.procesando !== null) {
      if (!doc) {
        this.feedback.info('Aún no hay documento generado. Usa "Generar PDF".');
      }
      return;
    }
    this.procesando = 'pdf';
    this.cotizacionService.descargarPdf(this.id, doc.id, disposition).pipe(
      finalize(() => {
        this.procesando = null;
      })
    ).subscribe({
      next: blob => {
        if (disposition === 'inline') {
          this.documentoHelper.abrirPdfEnNuevaPestana(blob);
        } else {
          this.documentoHelper.descargarBlobComoArchivo(blob, doc.nombreArchivo);
        }
      },
      error: error => {
        this.feedback.error(mapHttpError(error, 'No pudimos abrir el PDF.').message);
      }
    });
  }

  private cargarDocumentos(): void {
    if (!this.puedeVerDocumento) {
      this.documentos = [];
      return;
    }
    this.cotizacionService.listarDocumentos(this.id).subscribe({
      next: docs => this.documentos = docs,
      error: () => this.documentos = []
    });
  }

  private aplicarResultadoPresentar(cot: CotizacionComercialResponseDTO): void {
    this.cotizacion = cot;
    if (cot.documentoGenerado && cot.documentoVigente) {
      this.pdfPendienteTrasPresentar = false;
      this.documentos = [cot.documentoVigente];
      this.actionReveal.success({
        message: 'Cotización presentada. Revisa el PDF en documentos.',
        target: '#panel-documentos-cotizacion'
      });
      this.cargarDocumentos();
      return;
    }
    this.pdfPendienteTrasPresentar = true;
    this.documentos = [];
    this.feedback.warning('Cotización presentada, pero no se pudo generar el PDF.');
    this.cargarDocumentos();
  }

  private confirmar(mensaje: string, accion: () => void): void {
    this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    }).afterClosed().subscribe(ok => {
      if (ok === true) {
        accion();
      }
    });
  }

  private ejecutar(
    accion: AccionCotizacion,
    peticion: Observable<CotizacionComercialResponseDTO>,
    exito: string
  ): void {
    if (this.procesando !== null) {
      return;
    }
    this.procesando = accion;
    peticion.pipe(
      finalize(() => {
        this.procesando = null;
      })
    ).subscribe({
      next: cot => {
        this.cotizacion = cot;
        this.feedback.success(exito);
        this.cargarDocumentos();
      },
      error: error => {
        this.feedback.error(mapHttpError(error, 'No pudimos completar la acción.').message);
      }
    });
  }
}
