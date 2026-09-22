import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import { RepuestoOrdenServicioResponseDTO } from '../../../../../core/models/orden-servicio.models';
import { mensajeErrorServicio } from '../../servicio-ui';

export type CantidadRepuestoModo = 'editar' | 'consumir' | 'devolver';

export interface CantidadRepuestoDialogData {
  ordenId: number;
  linea: RepuestoOrdenServicioResponseDTO;
  modo: CantidadRepuestoModo;
  maxCantidad: number;
  /** Mínimo permitido (p. ej. neta consumida al editar). Default 1. */
  minCantidad?: number;
}

@Component({
  selector: 'app-cantidad-repuesto-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './cantidad-repuesto-dialog.html',
  styleUrl: './cantidad-repuesto-dialog.scss'
})
export class CantidadRepuestoDialogComponent {
  enviando = false;
  error = '';
  readonly form;
  readonly minCantidad: number;
  readonly maxCantidad: number;

  constructor(
    private fb: FormBuilder,
    private ordenServicioService: OrdenServicioService,
    private dialogRef: MatDialogRef<
      CantidadRepuestoDialogComponent,
      RepuestoOrdenServicioResponseDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: CantidadRepuestoDialogData
  ) {
    const min = Math.max(1, data.minCantidad ?? 1);
    const max = Math.max(min, data.maxCantidad);
    const inicial =
      data.modo === 'editar'
        ? Math.min(Math.max(data.linea.cantidadPlanificada, min), max)
        : min;
    this.minCantidad = min;
    this.maxCantidad = max;
    this.form = this.fb.group({
      cantidad: [inicial, [Validators.required, Validators.min(min), Validators.max(max)]]
    });
  }

  get titulo(): string {
    switch (this.data.modo) {
      case 'editar':
        return 'Editar cantidad';
      case 'consumir':
        return 'Consumir repuesto';
      case 'devolver':
        return 'Devolver repuesto';
    }
  }

  get descripcion(): string {
    switch (this.data.modo) {
      case 'editar':
        return 'Actualiza la cantidad planificada. No mueve inventario.';
      case 'consumir':
        return 'Confirma cuántas unidades usarás ahora. Esto descuenta inventario.';
      case 'devolver':
        return 'Devuelve unidades al inventario. Usa el costo histórico de la línea.';
    }
  }

  get labelCantidad(): string {
    switch (this.data.modo) {
      case 'editar':
        return 'Cantidad planificada';
      case 'consumir':
        return 'Cantidad a consumir';
      case 'devolver':
        return 'Cantidad a devolver';
    }
  }

  get boton(): string {
    switch (this.data.modo) {
      case 'editar':
        return 'Guardar';
      case 'consumir':
        return 'Consumir';
      case 'devolver':
        return 'Devolver';
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = `La cantidad debe estar entre ${this.minCantidad} y ${this.maxCantidad}.`;
      return;
    }
    const cantidad = Number(this.form.controls.cantidad.value);
    this.enviando = true;
    const { ordenId, linea, modo } = this.data;

    const request$ =
      modo === 'editar'
        ? this.ordenServicioService.actualizarRepuesto(ordenId, linea.id, {
            productoId: linea.productoId,
            cantidadPlanificada: cantidad
          })
        : modo === 'consumir'
          ? this.ordenServicioService.consumirRepuesto(ordenId, linea.id, { cantidad })
          : this.ordenServicioService.devolverRepuesto(ordenId, linea.id, { cantidad });

    request$.subscribe({
      next: result => this.dialogRef.close(result),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No pudimos completar la operación.');
      }
    });
  }
}
