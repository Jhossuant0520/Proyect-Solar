import { Component, Inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { CotizacionServicioService } from '../../../../../core/services/cotizacion-servicio.service';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import {
  CotizacionServicioRequestDTO,
  CotizacionServicioResponseDTO,
  DetalleCotizacionServicioRequestDTO,
  TipoDetalleCotizacionServicio
} from '../../../../../core/models/cotizacion-servicio.models';
import { RepuestoOrdenServicioResponseDTO } from '../../../../../core/models/orden-servicio.models';
import { formatMoney } from '../../../dashboard/utils/dashboard-format';
import { labelTipoDetalleCotizacion, mensajeErrorServicio } from '../../servicio-ui';

export type CotizacionFormModo = 'inicial' | 'adicional' | 'editar';

export interface CotizacionFormDialogData {
  ordenId: number;
  modo: CotizacionFormModo;
  cotizacion?: CotizacionServicioResponseDTO | null;
}

@Component({
  selector: 'app-cotizacion-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './cotizacion-form-dialog.html',
  styleUrl: './cotizacion-form-dialog.scss'
})
export class CotizacionFormDialogComponent implements OnInit {
  readonly form;
  readonly money = formatMoney;
  readonly labelTipo = labelTipoDetalleCotizacion;

  repuestos: RepuestoOrdenServicioResponseDTO[] = [];
  cargandoRepuestos = true;
  enviando = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private cotizacionService: CotizacionServicioService,
    private ordenServicioService: OrdenServicioService,
    private dialogRef: MatDialogRef<
      CotizacionFormDialogComponent,
      CotizacionServicioResponseDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: CotizacionFormDialogData
  ) {
    this.form = this.fb.group({
      observaciones: ['', Validators.maxLength(1000)],
      motivoAmpliacion: ['', Validators.maxLength(500)],
      detalles: this.fb.array([])
    });
  }

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  get titulo(): string {
    if (this.data.modo === 'editar') {
      return `Editar cotización ${this.data.cotizacion?.numero ?? ''}`.trim();
    }
    return this.data.modo === 'adicional'
      ? 'Cotización adicional'
      : 'Cotización inicial';
  }

  get esAdicional(): boolean {
    return this.data.modo === 'adicional';
  }

  get previewRepuestos(): number {
    return this.sumaTipo('REPUESTO');
  }

  get previewManoObra(): number {
    return this.sumaTipo('MANO_OBRA');
  }

  get previewOtros(): number {
    return this.sumaTipo('OTRO');
  }

  get previewTotal(): number {
    return this.previewRepuestos + this.previewManoObra + this.previewOtros;
  }

  subtotalLinea(index: number): number {
    const ctrl = this.detalles.at(index);
    if (!ctrl) {
      return 0;
    }
    const qty = Number(ctrl.get('cantidad')?.value) || 0;
    const price = Number(ctrl.get('precioUnitario')?.value) || 0;
    return qty * price;
  }

  placeholderConcepto(tipo: TipoDetalleCotizacionServicio | string | null | undefined): string {
    switch (tipo) {
      case 'REPUESTO':
        return 'Nombre del repuesto';
      case 'MANO_OBRA':
        return 'Ej. Diagnóstico, ensamble, configuración';
      case 'OTRO':
        return 'Ej. Transporte, insumos';
      default:
        return 'Descripción del concepto';
    }
  }

  ngOnInit(): void {
    this.ordenServicioService.listarRepuestos(this.data.ordenId).subscribe({
      next: lista => {
        this.repuestos = lista.filter(r => !r.anulado);
        this.cargandoRepuestos = false;
      },
      error: () => {
        this.cargandoRepuestos = false;
      }
    });

    const cot = this.data.cotizacion;
    if (cot) {
      this.form.patchValue({
        observaciones: cot.observaciones ?? '',
        motivoAmpliacion: cot.motivoAmpliacion ?? ''
      });
      for (const d of cot.detalles ?? []) {
        this.detalles.push(
          this.crearLinea({
            tipo: d.tipo,
            descripcion: d.descripcion ?? '',
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario ?? 0,
            productoId: d.productoId,
            ordenServicioRepuestoId: d.ordenServicioRepuestoId
          })
        );
      }
    }
    if (this.detalles.length === 0) {
      this.agregarLinea('MANO_OBRA');
    }
  }

  agregarLinea(tipo: TipoDetalleCotizacionServicio): void {
    this.detalles.push(
      this.crearLinea({
        tipo,
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        productoId: null,
        ordenServicioRepuestoId: null
      })
    );
  }

  agregarDesdeRepuesto(repuesto: RepuestoOrdenServicioResponseDTO): void {
    const ya = this.detalles.controls.some(
      c => Number(c.get('ordenServicioRepuestoId')?.value) === repuesto.id
    );
    if (ya) {
      this.error = 'Ese repuesto ya está en la cotización.';
      return;
    }
    this.error = '';
    this.detalles.push(
      this.crearLinea({
        tipo: 'REPUESTO',
        descripcion: repuesto.productoNombre,
        cantidad: Math.max(1, repuesto.cantidadPlanificada || 1),
        precioUnitario: 0,
        productoId: repuesto.productoId,
        ordenServicioRepuestoId: repuesto.id
      })
    );
  }

  quitarLinea(index: number): void {
    this.detalles.removeAt(index);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    this.error = '';
    if (this.detalles.length === 0) {
      this.error = 'Agrega al menos una línea.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa cantidades y precios. Deben ser válidos.';
      return;
    }
    if (this.esAdicional) {
      const motivo = (this.form.controls.motivoAmpliacion.value ?? '').trim();
      if (!motivo) {
        this.error = 'Indica el motivo de la ampliación.';
        return;
      }
    }

    const request = this.aRequest();
    this.enviando = true;

    const obs =
      this.data.modo === 'editar' && this.data.cotizacion
        ? this.cotizacionService.actualizar(
            this.data.ordenId,
            this.data.cotizacion.id,
            request
          )
        : this.data.modo === 'adicional'
          ? this.cotizacionService.crearAdicional(this.data.ordenId, request)
          : this.cotizacionService.crearInicial(this.data.ordenId, request);

    obs.subscribe({
      next: cot => this.dialogRef.close(cot),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No pudimos guardar la cotización.');
      }
    });
  }

  private crearLinea(vals: {
    tipo: TipoDetalleCotizacionServicio;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    productoId: number | null;
    ordenServicioRepuestoId: number | null;
  }): FormGroup {
    return this.fb.group({
      tipo: [vals.tipo, Validators.required],
      descripcion: [vals.descripcion, Validators.maxLength(255)],
      cantidad: [vals.cantidad, [Validators.required, Validators.min(0.01)]],
      precioUnitario: [vals.precioUnitario, [Validators.required, Validators.min(0)]],
      productoId: [vals.productoId],
      ordenServicioRepuestoId: [vals.ordenServicioRepuestoId]
    });
  }

  private sumaTipo(tipo: TipoDetalleCotizacionServicio): number {
    return this.detalles.controls.reduce((acc, ctrl) => {
      if (ctrl.get('tipo')?.value !== tipo) {
        return acc;
      }
      const qty = Number(ctrl.get('cantidad')?.value) || 0;
      const price = Number(ctrl.get('precioUnitario')?.value) || 0;
      return acc + qty * price;
    }, 0);
  }

  private aRequest(): CotizacionServicioRequestDTO {
    const detalles: DetalleCotizacionServicioRequestDTO[] = this.detalles.controls.map(ctrl => {
      const tipo = ctrl.get('tipo')?.value as TipoDetalleCotizacionServicio;
      const descripcion = (ctrl.get('descripcion')?.value ?? '').trim();
      const cantidad = Number(ctrl.get('cantidad')?.value);
      const precioUnitario = Number(ctrl.get('precioUnitario')?.value);
      const productoId = ctrl.get('productoId')?.value;
      const ordenServicioRepuestoId = ctrl.get('ordenServicioRepuestoId')?.value;
      return {
        tipo,
        descripcion: descripcion || null,
        cantidad,
        precioUnitario,
        productoId: productoId != null ? Number(productoId) : null,
        ordenServicioRepuestoId:
          ordenServicioRepuestoId != null ? Number(ordenServicioRepuestoId) : null
      };
    });
    return {
      observaciones: (this.form.controls.observaciones.value ?? '').trim() || null,
      motivoAmpliacion: (this.form.controls.motivoAmpliacion.value ?? '').trim() || null,
      detalles
    };
  }
}
