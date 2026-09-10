import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { InventarioService } from '../../../../core/services/inventario.service';
import { AjusteCostoResponseDTO, MotivoAjusteCosto } from '../../../../core/models/inventario.models';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { MOTIVOS_AJUSTE_COSTO } from '../producto-ui';

export interface AjusteCostoDialogData {
  productoId: number;
  nombre: string;
  costoActual: number | null;
  costoConocido: boolean;
  stockActual: number;
}

@Component({
  selector: 'solvix-ajuste-costo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './ajuste-costo-dialog.html',
  styleUrl: './ajuste-costo-dialog.scss'
})
export class AjusteCostoDialogComponent {
  readonly motivos = MOTIVOS_AJUSTE_COSTO;
  readonly money = formatMoney;
  enviando = false;
  error = '';
  readonly form;

  constructor(
    private fb: FormBuilder,
    private inventario: InventarioService,
    private dialogRef: MatDialogRef<AjusteCostoDialogComponent, AjusteCostoResponseDTO | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: AjusteCostoDialogData
  ) {
    this.form = this.fb.group({
      costoNuevo: [null as number | null, [Validators.required, Validators.min(0)]],
      motivo: ['' as MotivoAjusteCosto | '', Validators.required],
      observaciones: ['']
    });
  }

  get costoIgual(): boolean {
    const nuevo = this.form.controls.costoNuevo.value;
    if (nuevo == null || !this.data.costoConocido || this.data.costoActual == null) {
      return false;
    }
    return Number(nuevo) === Number(this.data.costoActual);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  aplicar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Completa el nuevo costo y el motivo.';
      return;
    }
    if (this.costoIgual) {
      this.error = 'El costo indicado es el que ya está vigente. No hay nada que corregir.';
      return;
    }

    const valores = this.form.getRawValue();
    this.enviando = true;
    this.inventario.ajustarCosto({
      productoId: this.data.productoId,
      costoNuevo: Number(valores.costoNuevo),
      motivo: valores.motivo as MotivoAjusteCosto,
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null
    }).subscribe({
      next: response => this.dialogRef.close(response),
      error: err => {
        this.enviando = false;
        this.error = err?.error?.message ?? 'No pudimos aplicar el ajuste de costo.';
      }
    });
  }
}
