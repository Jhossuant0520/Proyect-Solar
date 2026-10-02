import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import {
  AccionPublicaCotizacionResponseDTO,
  ConsultaCotizacionOtPublicaDTO,
  ConsultaOtPublicaDTO,
  ContactoTallerPublicoDTO
} from '../../../core/models/documento-orden-servicio.models';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixThemeToggleComponent } from '../../../shared/components/solvix-theme-toggle/solvix-theme-toggle';
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

type Estado = 'loading' | 'ready' | 'error' | 'sin-token';
type VistaCotizacion = 'cerrada' | 'cargando' | 'lista' | 'error';
type PanelAccion = 'cerrado' | 'aprobar' | 'rechazar';

@Component({
  selector: 'app-consulta-ot-publica',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    SolvixThemeToggleComponent
  ],
  templateUrl: './consulta-ot-publica.html',
  styleUrl: './consulta-ot-publica.scss'
})
export class ConsultaOtPublicaComponent implements OnInit {
  state: Estado = 'loading';
  data: ConsultaOtPublicaDTO | null = null;
  ux: EstadoOrdenUx = estadoOrdenUx(null);
  errorMessage = 'No encontramos esta orden.';
  token = '';

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
    private actionReveal: SolvixActionRevealService
  ) {
    this.identidadForm = this.fb.nonNullable.group({
      numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
      telefono: ['', [Validators.required, Validators.maxLength(40)]]
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token')?.trim();
    if (!token) {
      this.state = 'sin-token';
      this.errorMessage = 'El enlace no es válido.';
      return;
    }
    this.token = token;
    this.cargarConsulta();
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

  get contacto(): ContactoTallerPublicoDTO | null {
    return this.data?.contacto ?? null;
  }

  get destacarContacto(): boolean {
    return destacarContactoPublico(this.data?.estadoCodigo);
  }

  get mostrarBloqueContacto(): boolean {
    const c = this.contacto;
    if (!c) {
      return false;
    }
    return !!(c.telefono || c.whatsapp || c.direccion || c.empresa || c.sitioWeb);
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

  private cargarConsulta(after?: () => void): void {
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
      }
    });
  }
}
