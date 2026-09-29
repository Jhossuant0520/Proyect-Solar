import { Component, Inject, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixSignaturePadComponent } from '../../../../shared/components/solvix-signature-pad/solvix-signature-pad';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';
import { OrdenServicioRequestDTO } from '../../../../core/models/orden-servicio.models';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { equipoOpcionLabel, mensajeErrorServicio } from '../servicio-ui';

export interface ServicioRecepcionDialogData {
  request: OrdenServicioRequestDTO;
  cliente: ClienteResponseDTO;
  equipo: EquipoResponseDTO;
}

export interface ServicioRecepcionDialogResult {
  ordenId: number;
  numero: string;
}

@Component({
  selector: 'app-servicio-recepcion-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    SolvixButtonComponent,
    SolvixSignaturePadComponent
  ],
  templateUrl: './servicio-recepcion-dialog.html',
  styleUrl: './servicio-recepcion-dialog.scss'
})
export class ServicioRecepcionDialogComponent {
  @ViewChild(SolvixSignaturePadComponent) pad?: SolvixSignaturePadComponent;

  firmado = false;
  enviando = false;
  error = '';

  readonly form;
  readonly equipoLabel = equipoOpcionLabel;

  constructor(
    private fb: FormBuilder,
    private ordenService: OrdenServicioService,
    private dialogRef: MatDialogRef<
      ServicioRecepcionDialogComponent,
      ServicioRecepcionDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: ServicioRecepcionDialogData
  ) {
    const doc = (data.cliente.numeroDocumento ?? '').trim();
    this.form = this.fb.group({
      clienteConfirmo: [false, Validators.requiredTrue],
      nombreFirmante: [
        data.cliente.nombre ?? '',
        [Validators.required, Validators.maxLength(150)]
      ],
      documentoFirmante: [doc, Validators.maxLength(50)]
    });
  }

  get documentoReadonly(): boolean {
    return !!(this.data.cliente.numeroDocumento ?? '').trim();
  }

  get puedeRegistrar(): boolean {
    return this.form.valid && this.firmado && !!this.pad?.getFirmaBase64() && !this.enviando;
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  onFirmadoChange(ok: boolean): void {
    this.firmado = ok;
  }

  registrar(): void {
    this.error = '';
    if (!this.form.controls.clienteConfirmo.value) {
      this.error = 'Marca la confirmación de recepción del cliente.';
      return;
    }
    const firma = this.pad?.getFirmaBase64();
    if (!this.firmado || !firma) {
      this.error = 'La firma del cliente es obligatoria.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa el nombre del firmante.';
      return;
    }

    const valores = this.form.getRawValue();
    const body: OrdenServicioRequestDTO = {
      ...this.data.request,
      clienteConfirmoRecepcion: true,
      nombreFirmanteRecepcion: (valores.nombreFirmante ?? '').trim() || null,
      documentoFirmanteRecepcion: (valores.documentoFirmante ?? '').trim() || null,
      firmaBase64Recepcion: firma
    };

    this.enviando = true;
    this.ordenService.crear(body).subscribe({
      next: orden =>
        this.dialogRef.close({ ordenId: orden.id, numero: orden.numero }),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No se pudo registrar la recepción.');
      }
    });
  }
}
