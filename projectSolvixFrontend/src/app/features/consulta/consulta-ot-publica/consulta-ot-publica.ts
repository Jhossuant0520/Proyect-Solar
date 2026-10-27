import { Component, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import {
  AccionPublicaCotizacionResponseDTO,
  ConsultaCotizacionOtPublicaDTO,
  ConsultaOtPublicaDTO,
  ContactoTallerPublicoDTO
} from '../../../core/models/documento-orden-servicio.models';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { ThemeService } from '../../../core/services/theme.service';
import { SolvixActionRevealService } from '../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../shared/services/solvix-feedback.service';
import { formatFechaOrden, labelTipoEquipo } from '../../panelAdmin/servicios/servicio-ui';
import {
  destacarContactoPublico,
  estadoOrdenUx,
  progresoFasesPublicas,
  EstadoOrdenUx
} from '../../panelAdmin/servicios/estado-orden-ux';
import { formatMoney } from '../../panelAdmin/dashboard/utils/dashboard-format';
import { mensajeErrorAccionPublicaCotizacion } from './consulta-ot-publica-accion.util';

export type Estado = 'loading' | 'ready' | 'error' | 'sin-token';
export type FaseExperiencia = 'inicializando' | 'bienvenida' | 'seguimiento';
type VistaCotizacion = 'cerrada' | 'cargando' | 'lista' | 'error';
type PanelAccion = 'cerrado' | 'aprobar' | 'rechazar';

@Component({
  selector: 'app-consulta-ot-publica',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ],
  templateUrl: './consulta-ot-publica.html',
  styleUrl: './consulta-ot-publica.scss'
})
export class ConsultaOtPublicaComponent implements OnInit {
  state: Estado = 'loading';
  faseExperiencia: FaseExperiencia = 'inicializando';
  data: ConsultaOtPublicaDTO | null = null;
  ux: EstadoOrdenUx = estadoOrdenUx(null);
  errorMessage = 'No encontramos esta orden.';
  token = '';

  // Búsqueda rápida de orden (Centro de Experiencia C&E)
  codigoOrdenInput = '';
  buscandoOrden = false;
  errorBusqueda = '';

  /** Duración de la transición ambiental (en ms). En Karma tests es 0 para ejecución sincrónica. */
  duracionLoaderMs: number =
    typeof window !== 'undefined' && (window as unknown as { __karma__?: unknown }).__karma__
      ? 0
      : 1600;

  vistaCotizacion: VistaCotizacion = 'cerrada';
  cotizacion: ConsultaCotizacionOtPublicaDTO | null = null;
  cotizacionError = '';
  mostrarIndicacionesEntrega = false;

  panelAccion: PanelAccion = 'cerrado';
  enviandoAccion = false;
  errorAccion = '';
  resultadoAccion: AccionPublicaCotizacionResponseDTO | null = null;

  readonly identidadForm;

  readonly fecha = formatFechaOrden;
  readonly tipoEquipo = labelTipoEquipo;

  money(value: number | string | null | undefined): string {
    if (value == null || value === '') {
      return '—';
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? formatMoney(n) : '—';
  }

  readonly fases = () => progresoFasesPublicas(this.data?.estadoCodigo);

  constructor(
    private route: ActivatedRoute,
    private documentoService: DocumentoOrdenServicioService,
    private fb: FormBuilder,
    private feedback: SolvixFeedbackService,
    private actionReveal: SolvixActionRevealService,
    @Optional() private router?: Router,
    @Optional() private themeService?: ThemeService
  ) {
    this.identidadForm = this.fb.nonNullable.group({
      numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
      telefono: ['', [Validators.required, Validators.maxLength(40)]]
    });
  }

  readonly anioActual = new Date().getFullYear();

  get numeroEtapaActual(): number {
    return this.data?.etapaPublicaNumero ?? 1;
  }

  get totalEtapas(): number {
    return this.data?.totalEtapasPublicas ?? 5;
  }

  iconoFase(codigo: string): string {
    switch (codigo) {
      case 'RECEPCION':
        return 'inventory_2';
      case 'DIAGNOSTICO':
        return 'search';
      case 'COTIZACION':
        return 'request_quote';
      case 'REPARACION':
        return 'build';
      case 'ENTREGA':
        return 'task_alt';
      default:
        return 'circle';
    }
  }

  detalleFase(codigo: string, estado: string): string {
    if (codigo === 'RECEPCION') {
      return 'Ingreso a taller y registro';
    }
    if (codigo === 'DIAGNOSTICO') {
      return estado === 'completada' ? 'Pruebas en banco técnico' : 'Evaluación técnica';
    }
    if (codigo === 'COTIZACION') {
      return estado === 'actual' ? 'Pendiente de autorización' : 'Propuesta de servicio';
    }
    if (codigo === 'REPARACION') {
      return estado === 'actual' ? 'Intervención en curso' : 'Intervención técnica certificada';
    }
    if (codigo === 'ENTREGA') {
      return estado === 'actual' ? 'Listo para entrega en taller' : 'Control de calidad y entrega';
    }
    return '';
  }

  irACotizacion(): void {
    if (this.vistaCotizacion !== 'lista') {
      this.abrirCotizacion();
    }
    setTimeout(() => {
      const el = document.getElementById('seccion-cotizacion');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  }

  revisarYAutorizarPresupuesto(): void {
    if (this.vistaCotizacion !== 'lista') {
      this.documentoService.consultaCotizacionOtPublica(this.token).subscribe({
        next: dto => {
          this.cotizacion = dto;
          this.vistaCotizacion = 'lista';
          setTimeout(() => {
            this.iniciarAprobar();
          }, 60);
        },
        error: () => {
          this.iniciarAprobar();
        }
      });
    } else {
      this.iniciarAprobar();
    }
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    this.themeService?.setPreference('light');

    const token = this.route.snapshot.paramMap.get('token')?.trim();
    if (!token) {
      this.state = 'sin-token';
      this.errorMessage = 'El enlace no es válido.';
      if (this.duracionLoaderMs > 0) {
        setTimeout(() => {
          this.faseExperiencia = 'bienvenida';
        }, this.duracionLoaderMs);
      } else {
        this.faseExperiencia = 'bienvenida';
      }
      return;
    }
    this.token = token;
    this.iniciarCargaConAmbient();
  }

  equipoResumen(): string {
    if (!this.data) {
      return '—';
    }
    const partes = [
      this.tipoEquipo(this.data.equipoTipo),
      this.data.equipoMarca,
      this.data.equipoModelo
    ].filter(p => !!(p && String(p).trim()));
    return partes.length ? partes.join(' · ') : 'Equipo sin detalle público';
  }

  readonly whatsappPrincipal = '+57 302 5499616';
  readonly direccionPrincipal = 'B.Gaitan Calle 50 #53-04';
  readonly telefonoPrincipal = '+57 302 5499616';

  get contacto(): ContactoTallerPublicoDTO {
    return {
      empresa: this.data?.contacto?.empresa ?? 'Computer & Electronic',
      telefono: this.data?.contacto?.telefono?.trim() || this.telefonoPrincipal,
      whatsapp: this.data?.contacto?.whatsapp?.trim() || this.whatsappPrincipal,
      direccion: this.data?.contacto?.direccion?.trim() || this.direccionPrincipal,
      sitioWeb: this.data?.contacto?.sitioWeb ?? null
    };
  }

  get whatsappTaller(): string {
    return this.contacto.whatsapp?.trim() || this.whatsappPrincipal;
  }

  get direccionTaller(): string {
    return this.contacto.direccion?.trim() || this.direccionPrincipal;
  }

  get telefonoTaller(): string {
    return this.contacto.telefono?.trim() || this.telefonoPrincipal;
  }

  get destacarContacto(): boolean {
    return destacarContactoPublico(this.data?.estadoCodigo);
  }

  get mostrarBloqueContacto(): boolean {
    return true;
  }

  get puedeVerCotizacion(): boolean {
    return !!this.data?.cotizacionDisponible && this.data?.estadoCodigo === 'PENDIENTE_APROBACION';
  }

  /** Acciones sensibles solo cuando la consulta indica cotización pendiente. */
  get puedeAccionarCotizacion(): boolean {
    return this.puedeVerCotizacion && this.vistaCotizacion === 'lista' && !!this.cotizacion;
  }

  get tituloPanelAccion(): string {
    return this.panelAccion === 'aprobar'
      ? '¿Deseas aprobar esta cotización?'
      : '¿Deseas rechazar esta cotización?';
  }

  get etiquetaConfirmarAccion(): string {
    return this.panelAccion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo';
  }

  get accionPrimaria(): string | null {
    if (this.puedeVerCotizacion) {
      return 'Ver cotización';
    }
    if (this.data?.estadoCodigo === 'LISTO') {
      return this.ux.accionCliente;
    }
    if (this.data?.estadoCodigo === 'REQUIERE_APROBACION_ADICIONAL') {
      return null;
    }
    return this.ux.requiereAccionCliente ? this.ux.accionCliente : null;
  }

  ejecutarAccionPrimaria(): void {
    if (this.puedeVerCotizacion) {
      this.abrirCotizacion();
      return;
    }
    if (this.data?.estadoCodigo === 'LISTO') {
      this.mostrarIndicacionesEntrega = !this.mostrarIndicacionesEntrega;
    }
  }

  abrirCotizacion(): void {
    if (!this.token || this.vistaCotizacion === 'cargando') {
      return;
    }
    if (this.vistaCotizacion === 'lista' && this.cotizacion) {
      this.vistaCotizacion = 'cerrada';
      this.cerrarPanelAccion();
      return;
    }
    this.vistaCotizacion = 'cargando';
    this.cotizacionError = '';
    this.resultadoAccion = null;
    this.documentoService.consultaCotizacionOtPublica(this.token).subscribe({
      next: dto => {
        this.cotizacion = dto;
        this.vistaCotizacion = 'lista';
      },
      error: () => {
        this.cotizacion = null;
        this.vistaCotizacion = 'error';
        this.cotizacionError = 'No pudimos cargar la cotización. Contáctanos al taller.';
      }
    });
  }

  cerrarCotizacion(): void {
    this.vistaCotizacion = 'cerrada';
    this.cerrarPanelAccion();
  }

  iniciarAprobar(): void {
    if (!this.puedeAccionarCotizacion || this.enviandoAccion) {
      return;
    }
    this.abrirPanel('aprobar');
  }

  iniciarRechazar(): void {
    if (!this.puedeAccionarCotizacion || this.enviandoAccion) {
      return;
    }
    this.abrirPanel('rechazar');
  }

  cancelarPanelAccion(): void {
    if (this.enviandoAccion) {
      return;
    }
    this.cerrarPanelAccion();
  }

  confirmarAccion(): void {
    if (this.enviandoAccion || this.panelAccion === 'cerrado' || !this.token) {
      return;
    }
    this.identidadForm.markAllAsTouched();
    if (this.identidadForm.invalid) {
      this.errorAccion = 'Completa documento y teléfono para continuar.';
      return;
    }

    const body = {
      numeroDocumento: this.identidadForm.controls.numeroDocumento.value.trim(),
      telefono: this.identidadForm.controls.telefono.value.trim()
    };
    if (!body.numeroDocumento || !body.telefono) {
      this.errorAccion = 'Completa documento y teléfono para continuar.';
      return;
    }

    this.enviandoAccion = true;
    this.errorAccion = '';
    this.identidadForm.disable({ emitEvent: false });
    const accion = this.panelAccion;
    const request$ =
      accion === 'aprobar'
        ? this.documentoService.aprobarCotizacionOtPublica(this.token, body)
        : this.documentoService.rechazarCotizacionOtPublica(this.token, body);

    request$.subscribe({
      next: resp => this.onAccionExitosa(resp, accion),
      error: err => {
        this.enviandoAccion = false;
        this.identidadForm.enable({ emitEvent: false });
        this.errorAccion = mensajeErrorAccionPublicaCotizacion(err);
        this.feedback.error(this.errorAccion);
      }
    });
  }

  telHref(valor: string | null | undefined): string | null {
    if (!valor?.trim()) {
      return null;
    }
    const digits = valor.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
  }

  waHref(valor: string | null | undefined): string | null {
    if (!valor?.trim()) {
      return null;
    }
    const digits = valor.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }

  private abrirPanel(modo: 'aprobar' | 'rechazar'): void {
    this.panelAccion = modo;
    this.errorAccion = '';
    this.identidadForm.reset({ numeroDocumento: '', telefono: '' });
    this.actionReveal.reveal('#panel-identidad-cotizacion', {
      scroll: true,
      highlight: true
    });
  }

  private cerrarPanelAccion(): void {
    this.panelAccion = 'cerrado';
    this.errorAccion = '';
    this.identidadForm.reset({ numeroDocumento: '', telefono: '' });
  }

  private onAccionExitosa(
    resp: AccionPublicaCotizacionResponseDTO,
    accion: 'aprobar' | 'rechazar'
  ): void {
    this.enviandoAccion = false;
    this.identidadForm.enable({ emitEvent: false });
    this.resultadoAccion = resp;
    this.cerrarPanelAccion();
    this.vistaCotizacion = 'cerrada';
    this.cotizacion = null;

    const mensaje =
      (resp.mensaje && resp.mensaje.trim()) ||
      (accion === 'aprobar'
        ? 'Tu cotización fue aprobada correctamente.'
        : 'Tu cotización fue rechazada.');

    this.cargarConsulta(() => {
      this.actionReveal.success({
        message: mensaje,
        target: '#bloque-estado-publico',
        scroll: true,
        highlight: true
      });
    });
  }

  /** Inicia la consulta respetando la transición ambiental C&E */
  private iniciarCargaConAmbient(): void {
    if (this.duracionLoaderMs <= 0) {
      this.cargarConsulta(
        () => {
          this.faseExperiencia = 'seguimiento';
        },
        () => {
          this.faseExperiencia = 'seguimiento';
        }
      );
      return;
    }

    const start = Date.now();
    this.cargarConsulta(
      () => {
        const elapsed = Date.now() - start;
        const wait = Math.max(0, this.duracionLoaderMs - elapsed);
        if (wait > 0) {
          setTimeout(() => {
            this.faseExperiencia = 'seguimiento';
          }, wait);
        } else {
          this.faseExperiencia = 'seguimiento';
        }
      },
      () => {
        const elapsed = Date.now() - start;
        const wait = Math.max(0, this.duracionLoaderMs - elapsed);
        if (wait > 0) {
          setTimeout(() => {
            this.faseExperiencia = 'seguimiento';
          }, wait);
        } else {
          this.faseExperiencia = 'seguimiento';
        }
      }
    );
  }

  consultarCodigo(): void {
    if (this.buscandoOrden) {
      return;
    }
    const raw = this.codigoOrdenInput.trim();
    if (!raw) {
      this.errorBusqueda = 'Por favor, ingresa el código o token de tu orden.';
      return;
    }
    const token = this.extraerToken(raw);
    if (!token) {
      this.errorBusqueda = 'El código ingresado no tiene un formato válido.';
      return;
    }

    this.buscandoOrden = true;
    this.errorBusqueda = '';

    this.documentoService.consultaOtPublica(token).subscribe({
      next: dto => {
        this.buscandoOrden = false;
        this.token = token;
        this.data = dto;
        this.ux = estadoOrdenUx(dto.estadoCodigo);
        this.state = 'ready';
        this.faseExperiencia = 'seguimiento';
        if (!this.puedeVerCotizacion) {
          this.vistaCotizacion = 'cerrada';
          this.cotizacion = null;
          this.cerrarPanelAccion();
        }
        this.router?.navigate(['/consulta/ot', token], { replaceUrl: false });
      },
      error: () => {
        this.buscandoOrden = false;
        this.errorBusqueda =
          'No encontramos ninguna orden con este código. Verifica el comprobante o mensaje de WhatsApp e inténtalo de nuevo.';
      }
    });
  }

  extraerToken(input: string): string {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/\/consulta\/ot\/([a-zA-Z0-9\-_]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    return trimmed;
  }

  limpiarCodigo(): void {
    this.codigoOrdenInput = '';
    this.errorBusqueda = '';
  }

  volverABienvenida(): void {
    this.faseExperiencia = 'bienvenida';
    this.router?.navigate(['/consulta/ot'], { replaceUrl: false });
  }

  private cargarConsulta(after?: () => void, onError?: () => void): void {
    this.documentoService.consultaOtPublica(this.token).subscribe({
      next: dto => {
        this.data = dto;
        this.ux = estadoOrdenUx(dto.estadoCodigo);
        this.state = 'ready';
        if (!this.puedeVerCotizacion) {
          this.vistaCotizacion = 'cerrada';
          this.cotizacion = null;
          this.cerrarPanelAccion();
        }
        after?.();
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'No encontramos esta orden o el enlace ya no es válido.';
        onError?.();
      }
    });
  }
}
