import {
  Component,
  Inject,
  ViewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixSignaturePadComponent } from '../../../../shared/components/solvix-signature-pad/solvix-signature-pad';
import {
  OrdenServicioResponseDTO,
  RegistrarEntregaRequestDTO,
  RegistrarEntregaResponseDTO,
  RepuestoOrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { equipoResumen, formatFechaOrden, mensajeErrorServicio } from '../servicio-ui';

export interface ServicioEntregaDialogData {
  orden: OrdenServicioResponseDTO;
  repuestos: RepuestoOrdenServicioResponseDTO[];
}

@Component({
  selector: 'app-servicio-entrega-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    SolvixButtonComponent,
    SolvixSignaturePadComponent
  ],
  templateUrl: './servicio-entrega-dialog.html',
  styleUrl: './servicio-entrega-dialog.scss'
})
export class ServicioEntregaDialogComponent {
  @ViewChild(SolvixSignaturePadComponent) pad?: SolvixSignaturePadComponent;

  firmado = false;
  enviando = false;
  error = '';
  cargandoCliente = true;
  documentoClienteOrigen: 'cliente' | 'manual' | 'vacio' = 'vacio';
  documentoClienteReadonly = false;

  readonly form;
  readonly fecha = formatFechaOrden;
  readonly equipoLabel = equipoResumen;

  constructor(
    private fb: FormBuilder,
    private ordenService: OrdenServicioService,
    private clienteService: ClienteService,
    private dialogRef: MatDialogRef<
      ServicioEntregaDialogComponent,
      RegistrarEntregaResponseDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: ServicioEntregaDialogData
  ) {
    this.form = this.fb.group({
      clienteConfirmo: [false, Validators.requiredTrue],
      nombreFirmante: [data.orden.clienteNombre ?? '', [Validators.required, Validators.maxLength(150)]],
      documentoFirmante: ['', Validators.maxLength(50)],
      observaciones: ['', Validators.maxLength(1000)]
    });
    this.cargarDocumentoCliente();
  }

  get orden(): OrdenServicioResponseDTO {
    return this.data.orden;
  }

  get repuestosUsados(): RepuestoOrdenServicioResponseDTO[] {
    return (this.data.repuestos ?? []).filter(
      r => !r.anulado && (r.cantidadNetaConsumida ?? 0) > 0
    );
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
    const body: RegistrarEntregaRequestDTO = {
      clienteConfirmo: true,
      nombreCliente: (valores.nombreFirmante ?? '').trim() || null,
      documentoCliente: (valores.documentoFirmante ?? '').trim() || null,
      firmaBase64: firma,
      observaciones: (valores.observaciones ?? '').trim() || null
    };
    this.enviando = true;
    this.ordenService.registrarEntrega(this.orden.id, body).subscribe({
      next: res => this.dialogRef.close(res),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No pudimos registrar la entrega.');
      }
    });
  }

  private cargarDocumentoCliente(): void {
    const clienteId = this.orden.clienteId;
    if (clienteId == null) {
      this.cargandoCliente = false;
      this.documentoClienteOrigen = 'vacio';
      return;
    }
    this.clienteService.obtenerPorId(clienteId).subscribe({
      next: cliente => {
        this.cargandoCliente = false;
        const doc = (cliente.numeroDocumento ?? '').trim();
        if (doc) {
          this.form.controls.documentoFirmante.setValue(doc);
          this.documentoClienteReadonly = true;
          this.documentoClienteOrigen = 'cliente';
        } else {
          this.documentoClienteReadonly = false;
          this.documentoClienteOrigen = 'vacio';
        }
        if (!(this.form.controls.nombreFirmante.value ?? '').trim() && cliente.nombre) {
          this.form.controls.nombreFirmante.setValue(cliente.nombre);
        }
      },
      error: () => {
        this.cargandoCliente = false;
        this.documentoClienteReadonly = false;
        this.documentoClienteOrigen = 'vacio';
      }
    });
  }
}
