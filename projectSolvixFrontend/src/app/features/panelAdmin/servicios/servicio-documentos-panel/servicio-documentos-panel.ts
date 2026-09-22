import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, of, timer } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import {
  AsegurarComprobanteRecepcionResponseDTO,
  DocumentoOrdenServicioResponseDTO,
  TipoDocumentoOrdenServicio,
  labelTipoDocumento
} from '../../../../core/models/documento-orden-servicio.models';
import { EstadoOrdenServicio } from '../../../../core/models/orden-servicio.models';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';
import { formatFechaOrden, mensajeErrorServicio } from '../servicio-ui';

type PanelEstado =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'esperando_comprobante'
  | 'comprobante_timeout'
  | 'comprobante_pendiente';

export interface EsperarDocumentoOpts {
  tipo: TipoDocumentoOrdenServicio;
  cotizacionId?: number | null;
}

const ORDEN_TIPOS: TipoDocumentoOrdenServicio[] = [
  'COMPROBANTE_RECEPCION',
  'COTIZACION',
  'ACTA_ENTREGA'
];

/** Polling RxJS: cada 800 ms, máx. 10 ticks ≈ 8 s. */
const POLL_INTERVAL_MS = 800;
const POLL_MAX_TICKS = 10;

@Component({
  selector: 'app-servicio-documentos-panel',
  standalone: true,
  templateUrl: './servicio-documentos-panel.html',
  styleUrl: './servicio-documentos-panel.scss',
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
export class ServicioDocumentosPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) ordenId!: number;
  @Input() estado: EstadoOrdenServicio | null = null;
  @Input() canManage = true;
  /** OT recién creada: asegurar + polling automático. */
  @Input() esperarComprobante = false;

  documentos: DocumentoOrdenServicioResponseDTO[] = [];
  state: PanelEstado = 'loading';
  errorMessage = 'No pudimos cargar los documentos.';
  accionEnCurso = false;
  docAccionId: number | null = null;
  /** Id del documento recién generado en esta sesión (badge NUEVO + scroll). */
  docRecienGeneradoId: number | null = null;
  /** Banner tras presentación / entrega mientras afterCommit genera el PDF. */
  esperandoDoc: EsperarDocumentoOpts | null = null;
  esperandoDocTimeout = false;

  readonly fecha = formatFechaOrden;
  readonly labelTipo = labelTipoDocumento;

  private destroyed = false;
  private ensureSub: Subscription | null = null;
  private pollSub: Subscription | null = null;
  private autoFlujoIniciado = false;

  constructor(
    private documentoService: DocumentoOrdenServicioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ordenId'] && this.ordenId != null) {
      this.cancelarSuscripciones();
      this.docRecienGeneradoId = null;
      this.autoFlujoIniciado = false;
      this.cargarInicial();
    } else if (changes['estado'] && this.ordenId != null && !changes['ordenId']) {
      // No interrumpir espera de cotización/acta ni el flujo auto del comprobante.
      if (!this.autoFlujoIniciado && !this.esperandoDoc && !this.pollSub) {
        this.cargarInicial();
      }
    } else if (
      changes['esperarComprobante']?.currentValue === true &&
      this.ordenId != null &&
      !this.autoFlujoIniciado
    ) {
      this.iniciarFlujoAutomatico();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cancelarSuscripciones();
  }

  get grupos(): { tipo: TipoDocumentoOrdenServicio; items: DocumentoOrdenServicioResponseDTO[] }[] {
    return ORDEN_TIPOS.map(tipo => ({
      tipo,
      items: this.documentos.filter(d => d.tipoDocumento === tipo)
    })).filter(g => g.items.length > 0);
  }

  get comprobante(): DocumentoOrdenServicioResponseDTO | null {
    return this.documentos.find(d => d.tipoDocumento === 'COMPROBANTE_RECEPCION') ?? null;
  }

  get labelEsperando(): string {
    if (!this.esperandoDoc) {
      return '';
    }
    return this.labelTipo(this.esperandoDoc.tipo);
  }

  esRecienGenerado(doc: DocumentoOrdenServicioResponseDTO): boolean {
    return this.docRecienGeneradoId != null && doc.id === this.docRecienGeneradoId;
  }

  /** Clase CSS por tipo documental (acento visual). */
  claseTipo(tipo: TipoDocumentoOrdenServicio | string | null | undefined): string {
    switch (tipo) {
      case 'COMPROBANTE_RECEPCION':
        return 'recepcion';
      case 'COTIZACION':
        return 'cotizacion';
      case 'ACTA_ENTREGA':
        return 'entrega';
      default:
        return 'otro';
    }
  }

  chipTipo(tipo: TipoDocumentoOrdenServicio | string | null | undefined): string {
    switch (tipo) {
      case 'COMPROBANTE_RECEPCION':
        return 'Recepción';
      case 'COTIZACION':
        return 'Cotización';
      case 'ACTA_ENTREGA':
        return 'Entrega';
      default:
        return 'Documento';
    }
  }

  /** API pública (detalle). */
  iniciarEsperaComprobante(): void {
    this.iniciarFlujoAutomatico();
  }

  /**
   * Tras presentar cotización o registrar entrega: refresca y espera el PDF
   * generado en afterCommit (sin inventar documentos).
   */
  esperarDocumento(opts: EsperarDocumentoOpts): void {
    if (this.ordenId == null || this.destroyed) {
      return;
    }
    this.esperandoDoc = opts;
    this.esperandoDocTimeout = false;
    this.pollSub?.unsubscribe();
    this.pollSub = null;

    this.documentoService.listar(this.ordenId).subscribe({
      next: lista => {
        if (this.destroyed) {
          return;
        }
        this.documentos = lista ?? [];
        this.state = this.documentos.length === 0 ? 'empty' : 'ready';
        const encontrado = this.encontrarEsperado(this.documentos, opts);
        if (encontrado) {
          this.esperandoDoc = null;
          this.esperandoDocTimeout = false;
          this.state = 'ready';
          this.destacarDocumentoReciente(encontrado);
          return;
        }
        this.iniciarPollingEsperado(opts);
      },
      error: () => {
        if (this.destroyed) {
          return;
        }
        this.iniciarPollingEsperado(opts);
      }
    });
  }

  cargar(): void {
    this.cargarInicial();
  }

  /** Reintento / generación manual (idempotente). */
  reintentarGeneracion(): void {
    if (!this.canManage || this.accionEnCurso || this.ordenId == null) {
      return;
    }
    this.accionEnCurso = true;
    this.state = 'esperando_comprobante';
    this.documentoService.asegurarComprobanteRecepcion(this.ordenId).subscribe({
      next: res => {
        this.accionEnCurso = false;
        if (this.destroyed) {
          return;
        }
        this.aplicarAsegurar(res, true);
      },
      error: err => {
        this.accionEnCurso = false;
        if (this.destroyed) {
          return;
        }
        this.state =
          this.esperarComprobante || this.state === 'comprobante_timeout'
            ? 'comprobante_timeout'
            : 'comprobante_pendiente';
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'El comprobante de recepción no pudo generarse.'),
          'error'
        );
      }
    });
  }

  /** Alias para templates que usan el nombre anterior. */
  generarComprobanteManual(): void {
    this.reintentarGeneracion();
  }

  ver(doc: DocumentoOrdenServicioResponseDTO): void {
    if (this.accionEnCurso) {
      return;
    }
    this.accionEnCurso = true;
    this.docAccionId = doc.id;
    this.documentoService.descargarPdf(this.ordenId, doc.id, 'inline').subscribe({
      next: blob => {
        this.accionEnCurso = false;
        this.docAccionId = null;
        this.documentoService.abrirPdfEnNuevaPestana(blob);
      },
      error: err => {
        this.accionEnCurso = false;
        this.docAccionId = null;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos abrir el PDF.'),
          'error'
        );
      }
    });
  }

  descargar(doc: DocumentoOrdenServicioResponseDTO): void {
    if (this.accionEnCurso) {
      return;
    }
    this.accionEnCurso = true;
    this.docAccionId = doc.id;
    this.documentoService.descargarPdf(this.ordenId, doc.id, 'attachment').subscribe({
      next: blob => {
        this.accionEnCurso = false;
        this.docAccionId = null;
        this.documentoService.descargarBlobComoArchivo(blob, this.nombreAmigable(doc));
      },
      error: err => {
        this.accionEnCurso = false;
        this.docAccionId = null;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos descargar el PDF.'),
          'error'
        );
      }
    });
  }

  regenerar(doc: DocumentoOrdenServicioResponseDTO): void {
    if (!this.canManage || this.accionEnCurso) {
      return;
    }
    const tipo = this.labelTipo(doc.tipoDocumento, doc.tipoDocumentoEtiqueta);
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      width: '420px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        mensaje:
          `¿Regenerar el PDF de ${tipo}? Se crea una versión nueva y se conserva la anterior.`
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) {
        return;
      }
      this.accionEnCurso = true;
      this.docAccionId = doc.id;
      this.documentoService.regenerar(this.ordenId, doc.id).subscribe({
        next: () => {
          this.accionEnCurso = false;
          this.docAccionId = null;
          showSolvixSnack(this.snackBar, 'Documento regenerado.', 'success');
          this.cargarListaSimple();
        },
        error: err => {
          this.accionEnCurso = false;
          this.docAccionId = null;
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(err, 'No pudimos regenerar el documento.'),
            'error'
          );
        }
      });
    });
  }

  nombreAmigable(doc: DocumentoOrdenServicioResponseDTO): string {
    if (doc.nombreArchivo?.trim()) {
      return doc.nombreArchivo.trim();
    }
    const tipo = this.labelTipo(doc.tipoDocumento, doc.tipoDocumentoEtiqueta)
      .toLowerCase()
      .replace(/\s+/g, '-');
    return `${tipo}-v${doc.version ?? 1}.pdf`;
  }

  private cargarInicial(): void {
    if (this.ordenId == null) {
      this.state = 'error';
      this.documentos = [];
      return;
    }
    if (this.esperarComprobante) {
      this.iniciarFlujoAutomatico();
      return;
    }
    this.state = 'loading';
    this.documentoService.listar(this.ordenId).subscribe({
      next: lista => {
        if (this.destroyed) {
          return;
        }
        this.documentos = lista ?? [];
        this.resolverEstadoSinFlujoAutomatico();
      },
      error: error => {
        if (this.destroyed) {
          return;
        }
        this.documentos = [];
        this.state = 'error';
        this.errorMessage = mensajeErrorServicio(error, 'No pudimos cargar los documentos.');
      }
    });
  }

  private iniciarFlujoAutomatico(): void {
    if (this.ordenId == null || this.destroyed || this.autoFlujoIniciado) {
      return;
    }
    this.autoFlujoIniciado = true;
    this.docRecienGeneradoId = null;
    this.state = 'esperando_comprobante';
    this.cancelarSuscripciones(false);

    this.ensureSub = this.documentoService.asegurarComprobanteRecepcion(this.ordenId).subscribe({
      next: res => {
        if (this.destroyed) {
          return;
        }
        if (res?.ready && res.documento) {
          this.aplicarAsegurar(res, true);
          return;
        }
        this.iniciarPollingRx();
      },
      error: () => {
        if (this.destroyed) {
          return;
        }
        // afterCommit puede completar igual: polling corto de respaldo
        this.iniciarPollingRx();
      }
    });
  }

  private iniciarPollingRx(): void {
    this.pollSub?.unsubscribe();
    this.state = 'esperando_comprobante';
    this.pollSub = timer(0, POLL_INTERVAL_MS)
      .pipe(
        take(POLL_MAX_TICKS),
        switchMap(() =>
          this.documentoService.listar(this.ordenId).pipe(catchError(() => of([])))
        ),
        map(lista => {
          this.documentos = lista ?? [];
          return this.comprobante;
        }),
        filter((doc): doc is DocumentoOrdenServicioResponseDTO => doc != null),
        take(1)
      )
      .subscribe({
        next: doc => {
          if (this.destroyed) {
            return;
          }
          this.state = 'ready';
          this.destacarDocumentoReciente(doc);
        },
        complete: () => {
          if (this.destroyed) {
            return;
          }
          if (this.state === 'esperando_comprobante' && !this.comprobante) {
            this.state = 'comprobante_timeout';
          }
        }
      });
  }

  private iniciarPollingEsperado(opts: EsperarDocumentoOpts): void {
    this.pollSub?.unsubscribe();
    this.pollSub = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        take(POLL_MAX_TICKS),
        switchMap(() =>
          this.documentoService.listar(this.ordenId).pipe(catchError(() => of([])))
        ),
        map(lista => {
          this.documentos = lista ?? [];
          if (this.documentos.length > 0) {
            this.state = 'ready';
          }
          return this.encontrarEsperado(lista ?? [], opts);
        }),
        filter((doc): doc is DocumentoOrdenServicioResponseDTO => doc != null),
        take(1)
      )
      .subscribe({
        next: doc => {
          if (this.destroyed) {
            return;
          }
          this.esperandoDoc = null;
          this.esperandoDocTimeout = false;
          this.state = 'ready';
          this.destacarDocumentoReciente(doc);
        },
        complete: () => {
          if (this.destroyed) {
            return;
          }
          if (this.esperandoDoc && !this.encontrarEsperado(this.documentos, opts)) {
            this.esperandoDocTimeout = true;
          }
        }
      });
  }

  private encontrarEsperado(
    lista: DocumentoOrdenServicioResponseDTO[],
    opts: EsperarDocumentoOpts
  ): DocumentoOrdenServicioResponseDTO | null {
    return (
      lista.find(d => {
        if (d.tipoDocumento !== opts.tipo) {
          return false;
        }
        if (opts.cotizacionId != null) {
          return Number(d.cotizacionId) === Number(opts.cotizacionId);
        }
        return true;
      }) ?? null
    );
  }

  generarDocumentoEsperadoManual(): void {
    if (!this.canManage || this.accionEnCurso || !this.esperandoDoc || this.ordenId == null) {
      return;
    }
    const opts = this.esperandoDoc;
    this.accionEnCurso = true;
    this.esperandoDocTimeout = false;

    const req$ =
      opts.tipo === 'COTIZACION' && opts.cotizacionId != null
        ? this.documentoService.generarCotizacionPdf(this.ordenId, opts.cotizacionId)
        : opts.tipo === 'ACTA_ENTREGA'
          ? this.documentoService.generarActaEntrega(this.ordenId)
          : null;

    if (!req$) {
      this.accionEnCurso = false;
      this.reintentarGeneracion();
      return;
    }

    req$.subscribe({
      next: doc => {
        this.accionEnCurso = false;
        if (this.destroyed) {
          return;
        }
        const sinDup = this.documentos.filter(d => d.id !== doc.id);
        this.documentos = [doc, ...sinDup];
        this.esperandoDoc = null;
        this.esperandoDocTimeout = false;
        this.state = 'ready';
        this.destacarDocumentoReciente(doc);
      },
      error: err => {
        this.accionEnCurso = false;
        this.esperandoDocTimeout = true;
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos generar el documento.'),
          'error'
        );
      }
    });
  }

  private aplicarAsegurar(
    res: AsegurarComprobanteRecepcionResponseDTO,
    marcarReciente: boolean
  ): void {
    const doc = res.documento;
    if (!doc) {
      this.iniciarPollingRx();
      return;
    }
    const sinDup = this.documentos.filter(d => d.id !== doc.id);
    this.documentos = [doc, ...sinDup];
    this.state = 'ready';
    this.cancelarSuscripciones(false);
    if (marcarReciente) {
      this.destacarDocumentoReciente(doc);
    }
  }

  /**
   * Feedback temporal + badge NUEVO + scroll al documento recién aparecido.
   * Solo se invoca cuando el flujo espera un documento nuevo (no al recargar OT antigua).
   */
  private destacarDocumentoReciente(doc: DocumentoOrdenServicioResponseDTO): void {
    this.docRecienGeneradoId = doc.id;
    showSolvixSnack(this.snackBar, this.mensajeGenerado(doc.tipoDocumento), 'success');
    queueMicrotask(() => {
      requestAnimationFrame(() => this.scrollADocumento(doc.id));
    });
  }

  private mensajeGenerado(tipo: TipoDocumentoOrdenServicio | string): string {
    switch (tipo) {
      case 'COMPROBANTE_RECEPCION':
        return 'Comprobante de recepción generado correctamente.';
      case 'COTIZACION':
        return 'Documento de cotización generado correctamente.';
      case 'ACTA_ENTREGA':
        return 'Acta de entrega generada correctamente.';
      default:
        return 'Documento generado correctamente.';
    }
  }

  private scrollADocumento(docId: number): void {
    if (this.destroyed) {
      return;
    }
    const el = document.querySelector(`[data-doc-id="${docId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private resolverEstadoSinFlujoAutomatico(): void {
    if (this.comprobante) {
      this.state = 'ready';
      return;
    }
    if (this.estado === 'RECEPCIONADO') {
      this.state = 'comprobante_pendiente';
      return;
    }
    this.state = this.documentos.length === 0 ? 'empty' : 'ready';
  }

  private cargarListaSimple(): void {
    this.documentoService.listar(this.ordenId).subscribe({
      next: lista => {
        if (this.destroyed) {
          return;
        }
        this.documentos = lista ?? [];
        this.state = this.documentos.length === 0 ? 'empty' : 'ready';
      },
      error: err => {
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(err, 'No pudimos cargar los documentos.'),
          'error'
        );
      }
    });
  }

  private cancelarSuscripciones(resetAuto = true): void {
    this.ensureSub?.unsubscribe();
    this.ensureSub = null;
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    if (resetAuto) {
      this.autoFlujoIniciado = false;
      this.esperandoDoc = null;
      this.esperandoDocTimeout = false;
    }
  }
}
