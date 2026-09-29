import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import {
  ConsultaCotizacionOtPublicaDTO,
  ConsultaOtPublicaDTO,
  ContactoTallerPublicoDTO
} from '../../../core/models/documento-orden-servicio.models';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixThemeToggleComponent } from '../../../shared/components/solvix-theme-toggle/solvix-theme-toggle';
import { formatFechaOrden, labelTipoEquipo } from '../../panelAdmin/servicios/servicio-ui';
import {
  destacarContactoPublico,
  estadoOrdenUx,
  progresoFasesPublicas,
  EstadoOrdenUx
} from '../../panelAdmin/servicios/estado-orden-ux';
import { formatMoney } from '../../panelAdmin/dashboard/utils/dashboard-format';

type Estado = 'loading' | 'ready' | 'error' | 'sin-token';
type VistaCotizacion = 'cerrada' | 'cargando' | 'lista' | 'error';

@Component({
  selector: 'app-consulta-ot-publica',
  standalone: true,
  imports: [
    RouterLink,
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
    private documentoService: DocumentoOrdenServicioService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token')?.trim();
    if (!token) {
      this.state = 'sin-token';
      this.errorMessage = 'El enlace no es válido.';
      return;
    }
    this.token = token;
    this.documentoService.consultaOtPublica(token).subscribe({
      next: dto => {
        this.data = dto;
        // Siempre por código; nunca por estadoPublico / etiqueta.
        this.ux = estadoOrdenUx(dto.estadoCodigo);
        this.state = 'ready';
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'No encontramos esta orden o el enlace ya no es válido.';
      }
    });
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

  get accionPrimaria(): string | null {
    if (this.puedeVerCotizacion) {
      return 'Ver cotización';
    }
    if (this.data?.estadoCodigo === 'LISTO') {
      return this.ux.accionCliente;
    }
    if (this.data?.estadoCodigo === 'REQUIERE_APROBACION_ADICIONAL') {
      return null; // el contacto es la acción
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
      return;
    }
    this.vistaCotizacion = 'cargando';
    this.cotizacionError = '';
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
}
