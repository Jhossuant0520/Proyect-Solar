import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { VentaService } from '../../../../core/services/venta.service';
import {
  DevolucionLineaDTO,
  DevolucionVentaRequestDTO,
  MetodoReembolso,
  MotivoDevolucion,
  VentaResponseDTO
} from '../../../../core/models/venta.models';
import { clienteVisible } from '../venta-mapper';
import {
  formatFechaVenta,
  formatImporte,
  labelEstadoVenta,
  mapHttpError,
  METODOS_REEMBOLSO,
  MOTIVOS_DEVOLUCION,
  permiteDevolucion,
  toneEstadoVenta
} from '../venta-ui';

type LoadEstado = 'loading' | 'ready' | 'error';
type SubmitEstado = 'idle' | 'processing' | 'error';

@Component({
  selector: 'app-venta-devolucion-form',
  standalone: true,
  templateUrl: './venta-devolucion-form.html',
  styleUrl: './venta-devolucion-form.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class VentaDevolucionFormComponent implements OnInit {
  venta: VentaResponseDTO | null = null;
  form: FormGroup;
  loadState: LoadEstado = 'loading';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar esta venta.';
  errorMessage = 'La venta no existe o no permite devolución.';
  submitError = '';

  readonly motivos = MOTIVOS_DEVOLUCION;
  readonly metodos = METODOS_REEMBOLSO;
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoVenta;
  readonly estadoTone = toneEstadoVenta;
  readonly cliente = clienteVisible;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ventaService: VentaService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      motivo: [null as MotivoDevolucion | null, Validators.required],
      metodoReembolso: [null as MetodoReembolso | null],
      observaciones: [''],
      lineas: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  get lineas(): FormArray {
    return this.form.get('lineas') as FormArray;
  }

  get ventaId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.ventaId;
    if (id == null) {
      this.loadState = 'error';
      return;
    }
    this.loadState = 'loading';
    this.ventaService.obtenerPorId(id).subscribe({
      next: venta => {
        this.venta = venta;
        if (!permiteDevolucion(venta.estado)) {
          this.errorTitle = 'Esta venta no admite devolución.';
          this.errorMessage = `Solo se puede devolver una venta completada. Estado actual: ${labelEstadoVenta(venta.estado)}.`;
          this.loadState = 'error';
          return;
        }
        this.armarLineas(venta);
        this.loadState = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta venta.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.loadState = 'error';
      }
    });
  }

  pendiente(cantidad: number, cantidadDevuelta: number): number {
    return Math.max(0, cantidad - cantidadDevuelta);
  }

  registrar(): void {
    if (!this.venta) {
      return;
    }
    const lineas = this.lineasSeleccionadas();
    if (this.form.get('motivo')?.invalid || lineas.length === 0) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = lineas.length === 0
        ? 'Indica al menos una cantidad a devolver.'
        : 'Elige el motivo de la devolución.';
      return;
    }

    const valores = this.form.getRawValue();
    const request: DevolucionVentaRequestDTO = {
      lineas,
      motivo: valores.motivo,
      metodoReembolso: valores.metodoReembolso || null,
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null
    };

    this.submitState = 'processing';
    this.submitError = '';
    this.ventaService.registrarDevolucion(this.venta.id, request).subscribe({
      next: devolucion => {
        this.submitState = 'idle';
        this.snackBar.open(`Devolución ${devolucion.numero} registrada. La venta original no cambia.`, 'Cerrar', {
          duration: 4000
        });
        this.router.navigate(['/ventas', this.venta?.id, 'devoluciones', devolucion.id]);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos registrar la devolución.');
        this.submitState = 'error';
        this.submitError = mapped.message;
      }
    });
  }

  cancelar(): void {
    if (this.venta) {
      this.router.navigate(['/ventas', this.venta.id]);
      return;
    }
    this.router.navigate(['/ventas']);
  }

  private armarLineas(venta: VentaResponseDTO): void {
    this.lineas.clear();
    for (const detalle of venta.detalles) {
      this.lineas.push(this.fb.group({
        detalleId: [detalle.id],
        productoNombre: [detalle.productoNombre],
        cantidad: [detalle.cantidad],
        cantidadDevuelta: [detalle.cantidadDevuelta],
        cantidadDevolver: [0, [Validators.min(0)]]
      }));
    }
  }

  private lineasSeleccionadas(): DevolucionLineaDTO[] {
    return this.lineas.controls
      .map(control => ({
        detalleId: Number(control.get('detalleId')?.value),
        cantidad: Number(control.get('cantidadDevolver')?.value ?? 0)
      }))
      .filter(linea => linea.cantidad > 0);
  }
}
