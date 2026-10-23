import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';

export type CotizacionConfirmarModo = 'presentar' | 'aprobar' | 'decision';

export interface CotizacionConfirmarDialogData {
  modo: CotizacionConfirmarModo;
  numero: string;
  clienteNombre?: string | null;
  totalFormateado?: string | null;
  permiteRechazar?: boolean;
}

export interface CotizacionDecisionDialogResult {
  decision: 'aprobar' | 'rechazar';
  observacion?: string | null;
}

@Component({
  selector: 'app-cotizacion-confirmar-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './cotizacion-confirmar-dialog.html',
  styleUrl: './cotizacion-confirmar-dialog.scss'
})
export class CotizacionConfirmarDialogComponent {
  decisionSeleccionada: 'aprobar' | 'rechazar' = 'aprobar';
  observacion = '';

  constructor(
    private dialogRef: MatDialogRef<
      CotizacionConfirmarDialogComponent,
      boolean | CotizacionDecisionDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: CotizacionConfirmarDialogData
  ) {}

  get esDecision(): boolean {
    return this.data.modo === 'decision';
  }

  get titulo(): string {
    if (this.data.modo === 'decision') {
      return 'Registrar decisión del cliente';
    }
    return this.data.modo === 'aprobar' ? 'Confirmar aprobación' : 'Presentar cotización';
  }

  get kicker(): string {
    if (this.data.modo === 'decision') {
      return 'Decisión del cliente';
    }
    return this.data.modo === 'aprobar' ? 'Aprobación' : 'Cotización';
  }

  get icono(): string {
    if (this.data.modo === 'decision') {
      return 'how_to_reg';
    }
    return this.data.modo === 'aprobar' ? 'verified' : 'send';
  }

  get iconoConfirmar(): string {
    if (this.esDecision && this.decisionSeleccionada === 'rechazar') {
      return 'cancel';
    }
    return this.data.modo === 'presentar' ? 'send' : 'check_circle';
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
    if (this.esDecision) {
      const obs = this.observacion.trim();
      this.dialogRef.close({
        decision: this.decisionSeleccionada,
        observacion: obs || null
      });
      return;
    }
    this.dialogRef.close(true);
  }
}
