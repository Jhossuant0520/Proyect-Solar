import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import {
  HistorialEstadoOrdenServicioResponseDTO,
  OrdenServicioResponseDTO,
  RepuestoOrdenServicioResponseDTO,
  TransicionOrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { aRequestActualizacionTextos, valoresDesdeOrden } from '../servicio-mapper';
import {
  AccionWorkflowUi,
  CAMPOS_TECNICOS,
  CampoTecnicoId,
  accionCancelarDesde,
  accionNuevaFalla,
  accionPrincipalDesde,
  accionSecundariaEspera,
  campoTecnicoDestacado,
  equipoResumen,
  esEstadoTerminal,
  esResumenTecnicoCompleto,
  formatFechaOrden,
  labelEstadoOrden,
  labelTipoEquipo,
  mapHttpError,
  mensajeErrorServicio,
  pasosWorkflow,
  puedeEditarTextos,
  textoProximaAccion,
  textosTecnicosSinCambios,
  tipoAccionWorkflow,
  toneEstadoOrden,
  valorTextoTecnico
} from '../servicio-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';
import {
  TransicionEstadoDialogComponent,
  TransicionEstadoDialogResult,
  modoDialogoDesdeTipo
} from '../transicion-estado-dialog/transicion-estado-dialog';
import {
  ServicioEntregaDialogComponent,
  ServicioEntregaDialogData
} from '../servicio-entrega-dialog/servicio-entrega-dialog';
import {
  RepuestosPanelChange,
  ServicioRepuestosPanelComponent
} from '../servicio-repuestos-panel/servicio-repuestos-panel';
import {
  CotizacionPanelIntent,
  DocumentoCotizacionEsperado,
  ServicioCotizacionesPanelComponent
} from '../servicio-cotizaciones-panel/servicio-cotizaciones-panel';
import {
  EsperarDocumentoOpts,
  ServicioDocumentosPanelComponent
} from '../servicio-documentos-panel/servicio-documentos-panel';

@Component({
  selector: 'app-servicio-detail',
  standalone: true,
  templateUrl: './servicio-detail.html',
  styleUrl: './servicio-detail.scss',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    ServicioRepuestosPanelComponent,
    ServicioCotizacionesPanelComponent,
    ServicioDocumentosPanelComponent
  ]
})
export class ServicioDetailComponent implements OnInit {
  @ViewChild('panelTecnico') panelTecnico?: ElementRef<HTMLElement>;
  @ViewChild('panelReparacion') panelReparacion?: ElementRef<HTMLElement>;
  @ViewChild('panelCotizaciones') panelCotizaciones?: ElementRef<HTMLElement>;
  @ViewChild(ServicioCotizacionesPanelComponent)
  cotizacionesPanel?: ServicioCotizacionesPanelComponent;
  @ViewChild(ServicioDocumentosPanelComponent)
  documentosPanel?: ServicioDocumentosPanelComponent;

  orden: OrdenServicioResponseDTO | null = null;
  historial: HistorialEstadoOrdenServicioResponseDTO[] = [];
  historialState: 'idle' | 'loading' | 'ready' | 'empty' | 'error' = 'idle';
  state: 'loading' | 'ready' | 'error' = 'loading';
  editando = false;
  guardando = false;
  cambiandoEstado = false;
  /** Tras crear OT: el panel de documentos espera el comprobante afterCommit. */
  esperarComprobante = false;
  errorTitle = 'No pudimos cargar esta orden.';
  errorMessage = 'La orden no existe o no está disponible.';
  editError = '';
  estadoError = '';
  historialError = '';
  guiaTecnica = '';
  pendingRepuestos = 0;
  pendientesResumen: string[] = [];
  repuestosItems: RepuestoOrdenServicioResponseDTO[] = [];

  readonly form;
  readonly campos = CAMPOS_TECNICOS;
  readonly fecha = formatFechaOrden;
  readonly estadoLabel = labelEstadoOrden;
  readonly estadoTone = toneEstadoOrden;
  readonly equipo = equipoResumen;
  readonly tipoEquipo = labelTipoEquipo;
  readonly puedeEditar = puedeEditarTextos;
  readonly valorCampo = valorTextoTecnico;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private ordenServicioService: OrdenServicioService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      problemaReportado: ['', Validators.maxLength(2000)],
      diagnostico: ['', Validators.maxLength(2000)],
      trabajoRealizado: ['', Validators.maxLength(2000)],
      observaciones: ['', Validators.maxLength(1000)]
    });
  }

  ngOnInit(): void {
    this.esperarComprobante =
      this.route.snapshot.queryParamMap.get('esperarComprobante') === '1';
    if (this.esperarComprobante) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { esperarComprobante: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
    this.cargar();
  }

  get ordenId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get campoDestacado(): CampoTecnicoId | null {
    return this.orden ? campoTecnicoDestacado(this.orden.estado) : null;
  }

  get esResumenCompleto(): boolean {
    return this.orden ? esResumenTecnicoCompleto(this.orden.estado) : false;
  }

  get hayCambiosTextos(): boolean {
    if (!this.orden) {
      return false;
    }
    return !textosTecnicosSinCambios(this.orden, this.textosDelForm());
  }

  get accionPrincipal(): AccionWorkflowUi | null {
    return this.orden ? accionPrincipalDesde(this.orden.estado) : null;
  }

  get accionCancelar(): AccionWorkflowUi | null {
    return this.orden ? accionCancelarDesde(this.orden.estado) : null;
  }

  get accionEspera(): AccionWorkflowUi | null {
    return this.orden ? accionSecundariaEspera(this.orden.estado) : null;
  }

  get accionFalla(): AccionWorkflowUi | null {
    return this.orden ? accionNuevaFalla(this.orden.estado) : null;
  }

  get proximaAccionTexto(): string {
    return this.orden
      ? textoProximaAccion(this.orden.estado, { pendingRepuestos: this.pendingRepuestos })
      : '';
  }

  get puedeGestionarRepuestos(): boolean {
    return this.orden ? !esEstadoTerminal(this.orden.estado) : false;
  }

  get workflowPasos() {
    return this.orden ? pasosWorkflow(this.orden.estado) : [];
  }

  get enDiagnostico(): boolean {
    return this.orden?.estado === 'EN_DIAGNOSTICO';
  }

  get enReparacion(): boolean {
    return this.orden?.estado === 'EN_REPARACION';
  }

  get requiereAprobacionAdicional(): boolean {
    return this.orden?.estado === 'REQUIERE_APROBACION_ADICIONAL';
  }

  get diagnosticoYaDiligenciado(): boolean {
    return !!(this.orden?.diagnostico ?? '').trim();
  }

  get proximaEsNormal(): boolean {
    return !this.requiereAprobacionAdicional && this.orden?.estado !== 'ESPERA_REPUESTO';
  }

  cargar(): void {
    const id = this.ordenId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.editando = false;
    this.editError = '';
    this.estadoError = '';
    this.guiaTecnica = '';
    this.ordenServicioService.obtenerPorId(id).subscribe({
      next: orden => {
        this.orden = orden;
        this.patchForm(orden);
        this.state = 'ready';
        this.cargarHistorial(id);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta orden.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  cargarHistorial(id: number): void {
    this.historialState = 'loading';
    this.historialError = '';
    this.ordenServicioService.listarHistorial(id).subscribe({
      next: items => {
        this.historial = items;
        this.historialState = items.length ? 'ready' : 'empty';
      },
      error: error => {
        this.historial = [];
        this.historialState = 'error';
        this.historialError = mensajeErrorServicio(error, 'No pudimos cargar el historial.');
      }
    });
  }

  onRepuestosChange(change: RepuestosPanelChange): void {
    this.pendingRepuestos = change.pending;
    this.repuestosItems = change.items ?? [];
    this.pendientesResumen = (change.items ?? [])
      .filter(l => !l.anulado && (l.cantidadPendiente ?? 0) > 0)
      .map(l => {
        const nombre = l.productoNombre ?? `Producto #${l.productoId}`;
        return `${nombre} — pendiente: ${l.cantidadPendiente}`;
      });
  }

  volver(): void {
    this.router.navigate(['/servicios']);
  }

  esCampoDestacado(campo: CampoTecnicoId): boolean {
    return this.campoDestacado === campo;
  }

  iniciarEdicion(): void {
    if (!this.orden || !puedeEditarTextos(this.orden.estado)) {
      return;
    }
    this.patchForm(this.orden);
    this.editError = '';
    this.editando = true;
  }

  cancelarEdicion(): void {
    if (this.orden) {
      this.patchForm(this.orden);
    }
    this.editando = false;
    this.editError = '';
  }

  guardarTextos(): void {
    if (!this.orden || this.guardando || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enDiagnostico) {
      this.guardarDiagnosticoCompleto();
      return;
    }
    if (!this.hayCambiosTextos) {
      this.editando = false;
      this.editError = '';
      return;
    }

    this.guardando = true;
    this.editError = '';
    const textos = this.textosDelForm();
    const request = aRequestActualizacionTextos(this.orden, textos);

    this.ordenServicioService.actualizar(this.orden.id, request).subscribe({
      next: orden => {
        this.orden = orden;
        this.patchForm(orden);
        this.editando = false;
        this.guardando = false;
        showSolvixSnack(this.snackBar, 'Información técnica guardada.', 'success');
      },
      error: error => {
        this.guardando = false;
        this.editError = mensajeErrorServicio(error, 'No pudimos guardar los cambios.');
      }
    });
  }

  /** Completa diagnóstico de forma atómica (EN_DIAGNOSTICO → DIAGNOSTICADO). */
  guardarDiagnosticoCompleto(): void {
    if (!this.orden || this.cambiandoEstado || this.guardando) {
      return;
    }
    const diagnostico = (this.form.controls.diagnostico.value ?? '').trim();
    if (!diagnostico) {
      this.iniciarEdicion();
      this.guiaTecnica = 'Completa el diagnóstico técnico para continuar.';
      this.enfocarCampo('diagnostico');
      return;
    }
    this.cambiandoEstado = true;
    this.guardando = true;
    this.estadoError = '';
    this.guiaTecnica = '';
    this.ordenServicioService
      .completarDiagnostico(this.orden.id, {
        problemaReportado: this.form.controls.problemaReportado.value ?? null,
        diagnostico,
        observaciones: this.form.controls.observaciones.value ?? null
      })
      .subscribe({
        next: t => this.onTransicionOk(t, 'Diagnóstico completado.'),
        error: error => this.onTransicionError(error)
      });
  }

  ejecutarAccionPrincipal(): void {
    if (!this.orden || !this.accionPrincipal || this.cambiandoEstado || this.editando) {
      return;
    }
    const accion = this.accionPrincipal;
    const estado = this.orden.estado;

    if (estado === 'EN_DIAGNOSTICO') {
      this.irAlDiagnostico();
      return;
    }

    // Cotización (3.15.7): CTAs de dominio, no transición directa de estado.
    if (estado === 'DIAGNOSTICADO') {
      this.irACotizaciones('crear-inicial');
      return;
    }
    if (estado === 'COTIZADO') {
      this.irACotizaciones('presentar');
      return;
    }
    if (estado === 'PENDIENTE_APROBACION') {
      this.irACotizaciones('aprobar');
      return;
    }
    if (estado === 'REQUIERE_APROBACION_ADICIONAL') {
      this.irACotizaciones('crear-adicional');
      return;
    }

    if (accion.destino === 'LISTO') {
      this.intentarMarcarListo();
      return;
    }

    const tipo = tipoAccionWorkflow(accion.destino);
    if (tipo === 'gestionarEntrega' || (estado === 'LISTO' && accion.destino === 'ENTREGADO')) {
      this.abrirEntrega();
      return;
    }

    if (
      tipo === 'crearCotizacion' ||
      tipo === 'presentarCotizacion' ||
      tipo === 'aprobarCotizacion' ||
      tipo === 'cotizacionAdicional'
    ) {
      this.irACotizaciones('scroll');
      return;
    }

    if (tipo === 'directa') {
      this.ejecutarCambioDirecto(accion.destino);
      return;
    }

    if (tipo === 'confirmacion') {
      this.abrirDialogo(accion, 'confirmacion', this.mensajeConfirmacion(accion));
      return;
    }

    const modo = modoDialogoDesdeTipo(tipo);
    if (modo) {
      this.abrirDialogo(accion, modo);
    } else {
      this.ejecutarCambioDirecto(accion.destino);
    }
  }

  irACotizaciones(intent: CotizacionPanelIntent = 'scroll'): void {
    this.panelCotizaciones?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    queueMicrotask(() => this.cotizacionesPanel?.ejecutarIntent(intent));
  }

  onCotizacionOrdenActualizada(): void {
    this.cargar();
  }

  onDocumentoCotizacionEsperado(ev: DocumentoCotizacionEsperado): void {
    const opts: EsperarDocumentoOpts = {
      tipo: ev.tipo,
      cotizacionId: ev.cotizacionId
    };
    queueMicrotask(() => {
      this.documentosPanel?.esperarDocumento(opts);
      this.panelDocumentosScroll();
    });
  }

  refrescarDocumentos(): void {
    this.documentosPanel?.cargar();
  }

  private panelDocumentosScroll(): void {
    // Scroll suave al panel de documentos si está en el DOM
    const el = document.querySelector('app-servicio-documentos-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  abrirEntrega(): void {
    if (!this.orden || this.orden.estado !== 'LISTO' || this.cambiandoEstado) {
      return;
    }
    const ref = this.dialog.open(ServicioEntregaDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        orden: this.orden,
        repuestos: this.repuestosItems
      } satisfies ServicioEntregaDialogData
    });
    ref.afterClosed().subscribe(result => {
      if (!result?.orden) {
        return;
      }
      this.orden = result.orden;
      this.patchForm(result.orden);
      this.editando = false;
      showSolvixSnack(
        this.snackBar,
        result.mensaje || 'Entrega registrada. Orden cerrada.',
        'success'
      );
      this.cargarHistorial(result.orden.id);
      queueMicrotask(() => {
        this.documentosPanel?.esperarDocumento({ tipo: 'ACTA_ENTREGA' });
        this.panelDocumentosScroll();
      });
    });
  }

  ejecutarAccionEspera(): void {
    if (!this.accionEspera || this.pendingRepuestos <= 0) {
      this.estadoError =
        'No existen repuestos pendientes que justifiquen poner la orden en espera.';
      return;
    }
    this.abrirDialogo(this.accionEspera, 'esperaRepuesto');
  }

  ejecutarAccionFalla(): void {
    if (!this.accionFalla) {
      return;
    }
    this.abrirDialogo(this.accionFalla, 'nuevaFalla');
  }

  ejecutarAccionCancelar(): void {
    if (!this.accionCancelar) {
      return;
    }
    this.abrirDialogo(this.accionCancelar, 'motivoCancelacion');
  }

  irAlDiagnostico(): void {
    this.iniciarEdicion();
    if (this.diagnosticoYaDiligenciado) {
      this.guiaTecnica = 'El diagnóstico ya está diligenciado. Guarda la ficha para continuar.';
    } else {
      this.guiaTecnica = 'Escribe el diagnóstico técnico y pulsa Guardar diagnóstico.';
    }
    this.enfocarCampo('diagnostico');
  }

  irAReparacion(): void {
    this.guiaTecnica = '';
    this.panelReparacion?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  texto(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return trimmed || 'Sin información.';
  }

  private intentarMarcarListo(): void {
    if (!this.orden) {
      return;
    }
    const trabajo = (this.form.controls.trabajoRealizado.value ?? this.orden.trabajoRealizado ?? '').trim();
    if (!trabajo) {
      this.iniciarEdicion();
      this.guiaTecnica = 'Completa el trabajo realizado antes de marcar la orden como lista.';
      this.enfocarCampo('trabajoRealizado');
      return;
    }
    this.cambiandoEstado = true;
    this.estadoError = '';
    this.ordenServicioService
      .completarReparacion(this.orden.id, {
        trabajoRealizado: trabajo,
        observaciones: this.form.controls.observaciones.value ?? null
      })
      .subscribe({
        next: t => this.onTransicionOk(t, 'Reparación completada.'),
        error: error => this.onTransicionError(error)
      });
  }

  private ejecutarCambioDirecto(destino: AccionWorkflowUi['destino']): void {
    if (!this.orden) {
      return;
    }
    this.cambiandoEstado = true;
    this.estadoError = '';
    this.ordenServicioService.cambiarEstado(this.orden.id, { nuevoEstado: destino }).subscribe({
      next: t => {
        this.onTransicionOk(t);
        if (destino === 'EN_DIAGNOSTICO') {
          queueMicrotask(() => this.irAlDiagnostico());
        }
        if (destino === 'EN_REPARACION' && this.orden?.estado === 'EN_REPARACION') {
          queueMicrotask(() => this.irAReparacion());
        }
      },
      error: error => this.onTransicionError(error)
    });
  }

  private abrirDialogo(
    accion: AccionWorkflowUi,
    modo: NonNullable<ReturnType<typeof modoDialogoDesdeTipo>>,
    mensajeConfirmacion?: string
  ): void {
    const ref = this.dialog.open(TransicionEstadoDialogComponent, {
      width: '460px',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: {
        accion,
        modo,
        pendientesResumen: modo === 'esperaRepuesto' ? this.pendientesResumen : undefined,
        mensajeConfirmacion
      }
    });
    ref.afterClosed().subscribe((result?: TransicionEstadoDialogResult) => {
      if (!result || !this.orden) {
        return;
      }
      this.aplicarResultadoDialogo(accion, result);
    });
  }

  private aplicarResultadoDialogo(
    accion: AccionWorkflowUi,
    result: TransicionEstadoDialogResult
  ): void {
    if (!this.orden) {
      return;
    }
    this.cambiandoEstado = true;
    this.estadoError = '';

    if (accion.destino === 'REQUIERE_APROBACION_ADICIONAL') {
      this.ordenServicioService
        .registrarNuevaFalla(this.orden.id, {
          nuevaFalla: result.nuevaFalla ?? '',
          observacion: result.observacion
        })
        .subscribe({
          next: t => this.onTransicionOk(t, 'Nueva falla registrada.'),
          error: error => this.onTransicionError(error)
        });
      return;
    }

    this.ordenServicioService
      .cambiarEstado(this.orden.id, {
        nuevoEstado: result.nuevoEstado,
        motivo: result.motivo ?? undefined,
        observacion: result.observacion
      })
      .subscribe({
        next: t => this.onTransicionOk(t),
        error: error => this.onTransicionError(error)
      });
  }

  private onTransicionOk(transicion: TransicionOrdenServicioResponseDTO, snack?: string): void {
    this.orden = transicion.orden;
    this.patchForm(transicion.orden);
    this.editando = false;
    this.cambiandoEstado = false;
    this.guardando = false;
    this.guiaTecnica = '';
    showSolvixSnack(
      this.snackBar,
      snack || transicion.mensaje || `Estado: ${labelEstadoOrden(transicion.orden.estado)}.`,
      'success'
    );
    this.cargarHistorial(transicion.orden.id);
  }

  private onTransicionError(error: unknown): void {
    this.cambiandoEstado = false;
    this.guardando = false;
    this.estadoError = mensajeErrorServicio(error, 'No pudimos cambiar el estado.');
  }

  private mensajeConfirmacion(accion: AccionWorkflowUi): string {
    if (accion.destino === 'ENTREGADO') {
      return '¿Confirmas que el equipo fue entregado al cliente?';
    }
    if (accion.destino === 'CERRADO') {
      return '¿Confirmas que deseas cerrar la orden de servicio?';
    }
    return accion.descripcion;
  }

  private enfocarCampo(campo: CampoTecnicoId): void {
    this.panelTecnico?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        `[data-campo="${campo}"] textarea, textarea[formcontrolname="${campo}"]`
      );
      el?.focus();
    });
  }

  private textosDelForm(): Record<CampoTecnicoId, string> {
    return {
      problemaReportado: this.form.controls.problemaReportado.value ?? '',
      diagnostico: this.form.controls.diagnostico.value ?? '',
      trabajoRealizado: this.form.controls.trabajoRealizado.value ?? '',
      observaciones: this.form.controls.observaciones.value ?? ''
    };
  }

  private patchForm(orden: OrdenServicioResponseDTO): void {
    const valores = valoresDesdeOrden(orden);
    this.form.patchValue({
      problemaReportado: valores.problemaReportado,
      diagnostico: valores.diagnostico,
      trabajoRealizado: valores.trabajoRealizado,
      observaciones: valores.observaciones
    });
  }
}
