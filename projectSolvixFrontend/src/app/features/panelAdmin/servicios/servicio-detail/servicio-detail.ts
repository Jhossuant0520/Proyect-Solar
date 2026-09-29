import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { SolvixProgressFasesComponent } from '../../../../shared/components/solvix-progress-fases/solvix-progress-fases';
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
  contarRepuestosPendientes,
  equipoResumen,
  esEstadoTerminal,
  esResumenTecnicoCompleto,
  formatFechaOrden,
  labelEstadoOrden,
  labelTipoEquipo,
  mapHttpError,
  mensajeErrorServicio,
  puedeEditarTextos,
  tipoAccionWorkflow,
  toneEstadoOrden,
  valorTextoTecnico,
  textosTecnicosSinCambios
} from '../servicio-ui';
import {
  FasePublicaOrden,
  SeccionDetalleId,
  documentoRelevantePorEstado,
  estadoOrdenUx,
  resumenFaseActual,
  seccionesAbiertasPorEstado
} from '../estado-orden-ux';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
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
    MatMenuModule,
    MatButtonModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    SolvixProgressFasesComponent,
    ServicioCotizacionesPanelComponent,
    ServicioDocumentosPanelComponent
  ]
})
export class ServicioDetailComponent implements OnInit {
  @ViewChild('panelTecnico') panelTecnico?: ElementRef<HTMLElement>;
  @ViewChild('panelCotizaciones') panelCotizaciones?: ElementRef<HTMLElement>;
  @ViewChild(ServicioCotizacionesPanelComponent)
  cotizacionesPanel?: ServicioCotizacionesPanelComponent;
  @ViewChild(ServicioDocumentosPanelComponent)
  documentosPanel?: ServicioDocumentosPanelComponent;

  orden: OrdenServicioResponseDTO | null = null;
  historial: HistorialEstadoOrdenServicioResponseDTO[] = [];
  historialState: 'idle' | 'loading' | 'ready' | 'empty' | 'error' = 'idle';
  historialCompleto = false;
  state: 'loading' | 'ready' | 'error' = 'loading';
  editando = false;
  guardando = false;
  cambiandoEstado = false;
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
  secciones: Record<SeccionDetalleId, boolean> = seccionesAbiertasPorEstado(null);
  faseAlCancelar: FasePublicaOrden | null = null;

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
    private feedback: SolvixFeedbackService,
    private actionReveal: SolvixActionRevealService
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

  get ux() {
    return estadoOrdenUx(this.orden?.estado);
  }

  get resumenFase() {
    return resumenFaseActual(this.orden?.estado);
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

  get puedeGestionarRepuestos(): boolean {
    return this.orden ? !esEstadoTerminal(this.orden.estado) : false;
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

  get historialReciente(): HistorialEstadoOrdenServicioResponseDTO[] {
    return this.historial.slice(0, 3);
  }

  get hayMasHistorial(): boolean {
    return this.historial.length > 3;
  }

  get documentoRelevante() {
    return documentoRelevantePorEstado(this.orden?.estado);
  }

  get requisitosPendientes(): string[] {
    const items: string[] = [];
    if (!this.orden) {
      return items;
    }
    if (this.orden.estado === 'EN_DIAGNOSTICO' && !this.diagnosticoYaDiligenciado) {
      items.push('Falta registrar el diagnóstico técnico.');
    }
    if (this.orden.estado === 'EN_REPARACION' && this.pendingRepuestos > 0) {
      items.push(
        this.pendingRepuestos === 1
          ? 'Hay 1 repuesto pendiente de consumir.'
          : `Hay ${this.pendingRepuestos} repuestos pendientes de consumir.`
      );
    }
    if (this.orden.estado === 'ESPERA_REPUESTO') {
      items.push(
        this.pendingRepuestos > 0
          ? `Repuestos pendientes: ${this.pendingRepuestos}.`
          : 'Resolver la espera de repuesto para continuar.'
      );
    }
    if (this.orden.estado === 'EN_REPARACION' && !(this.orden.trabajoRealizado ?? '').trim()) {
      items.push('Completa el trabajo realizado antes de marcar como listo.');
    }
    return items;
  }

  get hayMenuMasAcciones(): boolean {
    return !!(this.accionCancelar || this.accionEspera || this.accionFalla);
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
        this.aplicarOrden(orden);
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
        this.actualizarFaseCancelacion(items);
      },
      error: error => {
        this.historial = [];
        this.historialState = 'error';
        this.historialError = mensajeErrorServicio(error, 'No pudimos cargar el historial.');
      }
    });
  }

  volver(): void {
    this.router.navigate(['/servicios']);
  }

  toggleSeccion(id: SeccionDetalleId): void {
    this.secciones = { ...this.secciones, [id]: !this.secciones[id] };
  }

  abrirSeccion(id: SeccionDetalleId): void {
    this.secciones = { ...this.secciones, [id]: true };
  }

  esCampoDestacado(campo: CampoTecnicoId): boolean {
    return this.campoDestacado === campo;
  }

  tieneTexto(campo: CampoTecnicoId): boolean {
    if (!this.orden) {
      return false;
    }
    return !!(this.valorCampo(this.orden, campo) ?? '').trim();
  }

  iniciarEdicion(campo?: CampoTecnicoId): void {
    if (!this.orden || !puedeEditarTextos(this.orden.estado)) {
      return;
    }
    this.patchForm(this.orden);
    this.editError = '';
    this.editando = true;
    this.abrirSeccion('tecnico');
    if (campo) {
      this.enfocarCampo(campo);
    }
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
        this.aplicarOrden(orden, false);
        this.editando = false;
        this.guardando = false;
        this.feedback.success('Información técnica guardada.');
      },
      error: error => {
        this.guardando = false;
        this.editError = mensajeErrorServicio(error, 'No pudimos guardar los cambios.');
      }
    });
  }

  guardarDiagnosticoCompleto(): void {
    if (!this.orden || this.cambiandoEstado || this.guardando) {
      return;
    }
    const diagnostico = (this.form.controls.diagnostico.value ?? '').trim();
    if (!diagnostico) {
      this.iniciarEdicion('diagnostico');
      this.guiaTecnica = 'Completa el diagnóstico técnico para continuar.';
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
        next: t => {
          this.onTransicionOk(t, 'Diagnóstico registrado.');
          this.abrirSeccion('cotizaciones');
          this.actionReveal.reveal(this.panelCotizaciones, { highlight: true });
        },
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
    this.abrirSeccion('cotizaciones');
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
    this.abrirSeccion('documentos');
    queueMicrotask(() => this.documentosPanel?.esperarDocumento(opts));
  }

  refrescarDocumentos(): void {
    this.documentosPanel?.cargar();
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
      this.aplicarOrden(result.orden);
      this.editando = false;
      this.feedback.success(result.mensaje || 'Entrega registrada. Orden cerrada.');
      this.cargarHistorial(result.orden.id);
      this.abrirSeccion('documentos');
      queueMicrotask(() => {
        this.documentosPanel?.esperarDocumento({ tipo: 'ACTA_ENTREGA' });
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
    this.iniciarEdicion('diagnostico');
    if (this.diagnosticoYaDiligenciado) {
      this.guiaTecnica = 'El diagnóstico ya está diligenciado. Guarda la ficha para continuar.';
    } else {
      this.guiaTecnica = 'Escribe el diagnóstico técnico y pulsa Guardar diagnóstico.';
    }
  }

  private intentarMarcarListo(): void {
    if (!this.orden) {
      return;
    }
    const trabajo = (
      this.form.controls.trabajoRealizado.value ??
      this.orden.trabajoRealizado ??
      ''
    ).trim();
    if (!trabajo) {
      this.iniciarEdicion('trabajoRealizado');
      this.guiaTecnica = 'Completa el trabajo realizado antes de marcar la orden como lista.';
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
        if (destino === 'EN_REPARACION') {
          this.abrirSeccion('tecnico');
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
    this.aplicarOrden(transicion.orden);
    this.editando = false;
    this.cambiandoEstado = false;
    this.guardando = false;
    this.guiaTecnica = '';
    this.feedback.success(
      snack || transicion.mensaje || `Estado: ${labelEstadoOrden(transicion.orden.estado)}.`
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

  private aplicarOrden(orden: OrdenServicioResponseDTO, resetSecciones = true): void {
    this.orden = orden;
    this.patchForm(orden);
    if (resetSecciones) {
      this.secciones = seccionesAbiertasPorEstado(orden.estado);
    }
    this.cargarRepuestos(orden.id);
  }

  /** Datos de dominio para workflow/entrega; sin card visual de repuestos (D.11). */
  private cargarRepuestos(ordenId: number): void {
    this.ordenServicioService.listarRepuestos(ordenId).subscribe({
      next: items => this.aplicarDatosRepuestos(items),
      error: () => this.aplicarDatosRepuestos([])
    });
  }

  private aplicarDatosRepuestos(items: RepuestoOrdenServicioResponseDTO[]): void {
    this.repuestosItems = items;
    this.pendingRepuestos = contarRepuestosPendientes(items);
    this.pendientesResumen = items
      .filter(l => !l.anulado && (l.cantidadPendiente ?? 0) > 0)
      .map(l => {
        const nombre = l.productoNombre ?? `Producto #${l.productoId}`;
        return `${nombre} — pendiente: ${l.cantidadPendiente}`;
      });
  }

  private actualizarFaseCancelacion(items: HistorialEstadoOrdenServicioResponseDTO[]): void {
    if (this.orden?.estado !== 'CANCELADO') {
      this.faseAlCancelar = null;
      return;
    }
    const cancel = items.find(i => i.estadoNuevo === 'CANCELADO');
    if (!cancel?.estadoAnterior) {
      this.faseAlCancelar = null;
      return;
    }
    this.faseAlCancelar = estadoOrdenUx(cancel.estadoAnterior).fase;
  }
}
