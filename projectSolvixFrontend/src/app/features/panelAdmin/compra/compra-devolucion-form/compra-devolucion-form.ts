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
import { CompraService } from '../../../../core/services/compra.service';
import {
  CompraResponseDTO,
  DevolucionCompraRequestDTO,
  MotivoDevolucionCompra
} from '../../../../core/models/compra.models';
import { MetodoReembolso } from '../../../../core/models/venta.models';
import { proveedorVisible, cantidadPendienteDevolucion } from '../compra-mapper';
import { labelEstadoCompra, MOTIVOS_DEVOLUCION_COMPRA, permiteDevolucionCompra, toneEstadoCompra } from '../compra-ui';
import { formatFechaVenta, formatImporte, mapHttpError, METODOS_REEMBOLSO } from '../../venta/venta-ui';

type LoadEstado = 'loading' | 'ready' | 'error';
type SubmitEstado = 'idle' | 'processing' | 'error';

@Component({
  selector: 'app-compra-devolucion-form',
  standalone: true,
  templateUrl: './compra-devolucion-form.html',
  styleUrl: './compra-devolucion-form.scss',
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
export class CompraDevolucionFormComponent implements OnInit {
  compra: CompraResponseDTO | null = null;
  form: FormGroup;
  loadState: LoadEstado = 'loading';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar esta compra.';
  errorMessage = 'La compra no existe o no permite devolución.';
  submitError = '';

  readonly motivos = MOTIVOS_DEVOLUCION_COMPRA;
  readonly metodos = METODOS_REEMBOLSO;
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly estadoLabel = labelEstadoCompra;
  readonly estadoTone = toneEstadoCompra;
  readonly proveedor = proveedorVisible;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private compraService: CompraService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      motivo: [null as MotivoDevolucionCompra | null, Validators.required],
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

  get compraId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.compraId;
    if (id == null) {
      this.loadState = 'error';
      return;
    }
    this.loadState = 'loading';
    this.compraService.obtenerPorId(id).subscribe({
      next: compra => {
        this.compra = compra;
        if (!permiteDevolucionCompra(compra.estado)) {
          this.errorTitle = 'Esta compra no admite devolución.';
          this.errorMessage = `Solo se puede devolver una compra completada. Estado actual: ${labelEstadoCompra(compra.estado)}.`;
          this.loadState = 'error';
          return;
        }
        this.armarLineas(compra);
        this.loadState = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta compra.');
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
    if (!this.compra) {
      return;
    }
    this.clampCantidades();
    const lineas = this.lineasSeleccionadas();
    if (this.form.get('motivo')?.invalid) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = 'Elige el motivo de la devolución.';
      return;
    }
    if (this.lineas.invalid) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = 'Hay cantidades que superan lo pendiente de devolver.';
      return;
    }
    if (lineas.length === 0) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = 'Indica al menos una cantidad a devolver.';
      return;
    }

    const valores = this.form.getRawValue();
    const request: DevolucionCompraRequestDTO = {
      lineas,
      motivo: valores.motivo,
      metodoReembolso: valores.metodoReembolso || null,
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null
    };

    this.submitState = 'processing';
    this.submitError = '';
    this.compraService.registrarDevolucion(this.compra.id, request).subscribe({
      next: devolucion => {
        this.submitState = 'idle';
        this.snackBar.open(`Devolución ${devolucion.numero} registrada. La compra original no cambia.`, 'Cerrar', {
          duration: 4000
        });
        this.router.navigate(['/compras', this.compra?.id, 'devoluciones', devolucion.id]);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos registrar la devolución.');
        this.submitState = 'error';
        this.submitError = mapped.message;
      }
    });
  }

  cancelar(): void {
    if (this.compra) {
      this.router.navigate(['/compras', this.compra.id]);
      return;
    }
    this.router.navigate(['/compras']);
  }

  private armarLineas(compra: CompraResponseDTO): void {
    this.lineas.clear();
    for (const detalle of compra.detalles) {
      const pendiente = cantidadPendienteDevolucion(detalle);
      this.lineas.push(this.fb.group({
        detalleId: [detalle.id],
        productoNombre: [detalle.productoNombre],
        costoUnitario: [detalle.costoUnitario],
        cantidad: [detalle.cantidad],
        cantidadDevuelta: [detalle.cantidadDevuelta],
        cantidadDevolver: [
          { value: 0, disabled: pendiente === 0 },
          [Validators.min(0), Validators.max(pendiente)]
        ]
      }));
    }
  }

  private clampCantidades(): void {
    for (const control of this.lineas.controls) {
      const max = this.pendiente(
        Number(control.get('cantidad')?.value ?? 0),
        Number(control.get('cantidadDevuelta')?.value ?? 0)
      );
      const actual = Number(control.get('cantidadDevolver')?.value ?? 0);
      if (actual > max) {
        control.get('cantidadDevolver')?.setValue(max);
      }
    }
  }

  private lineasSeleccionadas(): Array<{ detalleId: number; cantidad: number }> {
    return this.lineas.controls
      .map(control => {
        const max = this.pendiente(
          Number(control.get('cantidad')?.value ?? 0),
          Number(control.get('cantidadDevuelta')?.value ?? 0)
        );
        return {
          detalleId: Number(control.get('detalleId')?.value),
          cantidad: Math.min(max, Number(control.get('cantidadDevolver')?.value ?? 0))
        };
      })
      .filter(linea => linea.cantidad > 0);
  }
}
