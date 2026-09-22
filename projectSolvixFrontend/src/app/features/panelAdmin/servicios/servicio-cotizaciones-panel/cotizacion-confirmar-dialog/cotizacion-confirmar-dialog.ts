import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';

export type CotizacionConfirmarModo = 'presentar' | 'aprobar';

export interface CotizacionConfirmarDialogData {
  modo: CotizacionConfirmarModo;
  numero: string;
}

@Component({
  selector: 'app-cotizacion-confirmar-dialog',
  standalone: true,
  imports: [MatDialogModule, SolvixButtonComponent],
  templateUrl: './cotizacion-confirmar-dialog.html',
  styleUrl: './cotizacion-confirmar-dialog.scss'
})
export class CotizacionConfirmarDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CotizacionConfirmarDialogComponent, boolean | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: CotizacionConfirmarDialogData
  ) {}

  get titulo(): string {
    return this.data.modo === 'aprobar' ? 'Confirmar aprobación' : 'Presentar cotización';
  }

  get mensaje(): string {
    return this.data.modo === 'aprobar'
      ? '¿Confirmas que el cliente aprobó la cotización vigente?'
      : '¿Presentar esta cotización al cliente?';
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}
