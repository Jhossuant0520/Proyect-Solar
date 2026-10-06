import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { CxpService } from '../../../../core/services/cxp.service';
import {
  CuentaPorPagarResponseDTO,
  MetodoPagoCxP,
  PagoCxPResponseDTO
} from '../../../../core/models/cxp.models';
import { formatFechaVenta, formatImporte, mapHttpError } from '../../venta/venta-ui';
import {
  labelEstadoCxp,
  labelMetodoPagoCxp,
  METODOS_PAGO_CXP,
  pagoValorInvalido,
  toneEstadoCxp
} from '../cxp-ui';

@Component({
  selector: 'app-cxp-detail',
  standalone: true,
  templateUrl: './cxp-detail.html',
  styleUrl: './cxp-detail.scss',
  imports: [
    FormsModule,
    MatSnackBarModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class CxpDetailComponent implements OnInit {
  cuenta: CuentaPorPagarResponseDTO | null = null;
  state: 'loading' | 'ready' | 'error' = 'loading';
  guardando = false;
  errorTitle = 'No pudimos cargar esta cuenta por pagar.';
  errorMessage = 'La cuenta no existe o no está disponible.';

  valorPago: number | null = null;
  metodoPago: MetodoPagoCxP = 'TRANSFERENCIA';
  fechaPago = '';
  referencia = '';
  observacion = '';

  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCxp;
  readonly estadoTone = toneEstadoCxp;
  readonly metodoLabel = labelMetodoPagoCxp;
  readonly metodos = METODOS_PAGO_CXP;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cxpService: CxpService,
    private feedback: SolvixFeedbackService
  ) {}

  ngOnInit(): void {
    this.fechaPago = this.hoyLocalInput();
    this.cargar();
  }

  get cxpId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  get pagos(): PagoCxPResponseDTO[] {
    return this.cuenta?.pagos ?? [];
  }

  get puedePagar(): boolean {
    return (
      this.cuenta != null &&
      this.cuenta.estado !== 'PAGADA' &&
      this.cuenta.estado !== 'ANULADA' &&
      (this.cuenta.saldoPendiente ?? 0) > 0
    );
  }

  /** Protección anti-sobrepago en el cliente (MUST). */
  get pagoFormInvalido(): boolean {
    return pagoValorInvalido(this.valorPago, this.cuenta?.saldoPendiente);
  }

  get badgeLabel(): string {
    if (!this.cuenta) {
      return '';
    }
    return this.cuenta.vencida
      ? `Vencida · ${this.estadoLabel(this.cuenta.estado)}`
      : this.estadoLabel(this.cuenta.estado);
  }

  cargar(): void {
    const id = this.cxpId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.cxpService.obtenerPorId(id).subscribe({
      next: cuenta => {
        this.cuenta = cuenta;
        this.state = 'ready';
        this.resetFormularioPago();
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta cuenta por pagar.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  volver(): void {
    this.router.navigate(['/cxp']);
  }

  verCompra(): void {
    if (this.cuenta?.compraId != null) {
      this.router.navigate(['/compras', this.cuenta.compraId]);
    }
  }

  registrarPago(): void {
    if (!this.cuenta || this.pagoFormInvalido || this.guardando) {
      return;
    }

    this.guardando = true;
    this.cxpService
      .registrarPago(this.cuenta.id, {
        valor: Number(this.valorPago),
        metodoPago: this.metodoPago,
        fecha: this.fechaPago ? `${this.fechaPago}T12:00:00` : null,
        referencia: this.referencia.trim() || null,
        observacion: this.observacion.trim() || null
      })
      .subscribe({
        next: actualizada => {
          this.cuenta = actualizada;
          this.guardando = false;
          this.resetFormularioPago();
          this.feedback.success('Pago registrado. Saldos actualizados.', 3500);
        },
        error: error => {
          this.guardando = false;
          this.feedback.error(mapHttpError(error, 'No se pudo registrar el pago.').message, 4500);
        }
      });
  }

  private resetFormularioPago(): void {
    this.valorPago = null;
    this.metodoPago = 'TRANSFERENCIA';
    this.fechaPago = this.hoyLocalInput();
    this.referencia = '';
    this.observacion = '';
  }

  private hoyLocalInput(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
