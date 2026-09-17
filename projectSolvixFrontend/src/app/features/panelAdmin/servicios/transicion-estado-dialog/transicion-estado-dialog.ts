import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { EstadoOrdenServicio } from '../../../../core/models/orden-servicio.models';
import { AccionWorkflowUi, TipoAccionWorkflow } from '../servicio-ui';

export type TransicionDialogModo =
  | 'motivoCancelacion'
  | 'nuevaFalla'
  | 'esperaRepuesto'
  | 'confirmacion';

export interface TransicionEstadoDialogData {
  accion: AccionWorkflowUi;
  modo: TransicionDialogModo;
  /** Líneas pendientes (espera repuesto). */
  pendientesResumen?: string[];
  mensajeConfirmacion?: string;
}

export interface TransicionEstadoDialogResult {
  nuevoEstado: EstadoOrdenServicio;
  motivo?: string | null;
  observacion?: string | null;
  nuevaFalla?: string | null;
  confirmado: true;
}

@Component({
  selector: 'app-transicion-estado-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './transicion-estado-dialog.html',
  styleUrl: './transicion-estado-dialog.scss'
})
export class TransicionEstadoDialogComponent {
  readonly form;
  error = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<
      TransicionEstadoDialogComponent,
      TransicionEstadoDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: TransicionEstadoDialogData
  ) {
    if (data.modo === 'motivoCancelacion') {
      this.form = this.fb.group({
        motivo: ['', [Validators.required, Validators.maxLength(500)]],
        observacion: ['', Validators.maxLength(1000)]
      });
    } else if (data.modo === 'nuevaFalla') {
      this.form = this.fb.group({
        nuevaFalla: ['', [Validators.required, Validators.maxLength(500)]],
        observacion: ['', Validators.maxLength(1000)]
      });
    } else {
      this.form = this.fb.group({
        observacion: ['', Validators.maxLength(1000)]
      });
    }
  }

  get esCancelacion(): boolean {
    return this.data.modo === 'motivoCancelacion';
  }

  get esNuevaFalla(): boolean {
    return this.data.modo === 'nuevaFalla';
  }

  get esEspera(): boolean {
    return this.data.modo === 'esperaRepuesto';
  }

  get esConfirmacion(): boolean {
    return this.data.modo === 'confirmacion';
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    this.error = '';
    if (this.esCancelacion || this.esNuevaFalla) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.error = this.esCancelacion
          ? 'El motivo de cancelación es obligatorio.'
          : 'Describe la nueva falla o situación detectada.';
        return;
      }
    }
    const valores = this.form.getRawValue() as Record<string, string>;
    this.dialogRef.close({
      nuevoEstado: this.data.accion.destino,
      motivo: this.esCancelacion ? (valores['motivo'] ?? '').trim() : null,
      nuevaFalla: this.esNuevaFalla ? (valores['nuevaFalla'] ?? '').trim() : null,
      observacion: (valores['observacion'] ?? '').trim() || null,
      confirmado: true
    });
  }
}

/** Mapea tipo de acción a modo de diálogo (null = sin diálogo). */
export function modoDialogoDesdeTipo(tipo: TipoAccionWorkflow): TransicionDialogModo | null {
  switch (tipo) {
    case 'motivoCancelacion':
    case 'nuevaFalla':
    case 'esperaRepuesto':
    case 'confirmacion':
      return tipo;
    default:
      return null;
  }
}
