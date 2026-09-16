import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { InventarioService } from '../../../../core/services/inventario.service';
import { MovimientoInventarioResponseDTO, TipoAjusteUnidades } from '../../../../core/models/inventario.models';
import { TIPOS_AJUSTE_UNIDADES } from '../inventario-ui';

export interface AjusteUnidadesDialogData {
  productoId: number;
  nombre: string;
  stockActual: number;
}

@Component({
  selector: 'solvix-ajuste-unidades-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './ajuste-unidades-dialog.html',
  styleUrl: './ajuste-unidades-dialog.scss'
})
export class AjusteUnidadesDialogComponent {
  readonly tipos = TIPOS_AJUSTE_UNIDADES;
  enviando = false;
  error = '';
  readonly form;

  constructor(
    private fb: FormBuilder,
    private inventario: InventarioService,
    private dialogRef: MatDialogRef<AjusteUnidadesDialogComponent, MovimientoInventarioResponseDTO | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: AjusteUnidadesDialogData
  ) {
    this.form = this.fb.group({
      tipo: ['' as TipoAjusteUnidades | '', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      observaciones: ['', Validators.maxLength(500)]
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  aplicar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Elige el tipo y una cantidad mayor que cero.';
      return;
    }

    const valores = this.form.getRawValue();
    this.enviando = true;
    this.inventario.registrarAjuste({
      productoId: this.data.productoId,
      tipo: valores.tipo as TipoAjusteUnidades,
      cantidad: Number(valores.cantidad),
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null
    }).subscribe({
      next: response => this.dialogRef.close(response),
      error: err => {
        this.enviando = false;
        this.error = err?.error?.message ?? 'No pudimos registrar el ajuste de unidades.';
      }
    });
  }
}
