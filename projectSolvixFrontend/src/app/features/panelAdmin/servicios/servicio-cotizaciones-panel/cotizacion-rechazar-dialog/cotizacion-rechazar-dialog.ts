import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { RechazarCotizacionRequestDTO } from '../../../../../core/models/cotizacion-servicio.models';

export interface CotizacionRechazarDialogData {
  numero: string;
}

@Component({
  selector: 'app-cotizacion-rechazar-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './cotizacion-rechazar-dialog.html',
  styleUrl: './cotizacion-rechazar-dialog.scss'
})
export class CotizacionRechazarDialogComponent {
  readonly form;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<
      CotizacionRechazarDialogComponent,
      RechazarCotizacionRequestDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: CotizacionRechazarDialogData
  ) {
    this.form = this.fb.group({
      observacion: ['', Validators.maxLength(1000)]
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const observacion = (this.form.controls.observacion.value ?? '').trim();
    this.dialogRef.close({ observacion: observacion || null });
  }
}
