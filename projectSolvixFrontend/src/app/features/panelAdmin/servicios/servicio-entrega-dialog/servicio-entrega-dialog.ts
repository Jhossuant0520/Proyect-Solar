import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
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
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './servicio-entrega-dialog.html',
  styleUrl: './servicio-entrega-dialog.scss'
})
export class ServicioEntregaDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('firmaCanvas') firmaCanvas?: ElementRef<HTMLCanvasElement>;

  firmado = false;
  enviando = false;
  error = '';
  cargandoCliente = true;
  documentoClienteOrigen: 'cliente' | 'manual' | 'vacio' = 'vacio';
  documentoClienteReadonly = false;

  private dibujando = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private firmaBase64: string | null = null;
  private pointerIds = new Set<number>();

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
    return this.form.valid && this.firmado && !!this.firmaBase64 && !this.enviando;
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.initCanvas());
    this.cargarDocumentoCliente();
  }

  ngOnDestroy(): void {
    this.detachPointer();
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  limpiarFirma(): void {
    if (!this.ctx || !this.firmaCanvas) {
      return;
    }
    const canvas = this.firmaCanvas.nativeElement;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();
    this.pintarFondo();
    this.firmado = false;
    this.firmaBase64 = null;
  }

  registrar(): void {
    this.error = '';
    if (!this.form.controls.clienteConfirmo.value) {
      this.error = 'Marca la confirmación de recepción del cliente.';
      return;
    }
    if (!this.firmado || !this.firmaBase64) {
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
      firmaBase64: this.firmaBase64,
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

  private initCanvas(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    this.detachPointer();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(320, Math.floor(canvas.clientWidth || 480));
    const height = 180;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
    this.ctx.strokeStyle = '#F8FAFC';
    this.ctx.lineWidth = 2.25;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.firmado = false;
    this.firmaBase64 = null;
    this.pintarFondo();
    this.attachPointer(canvas);
  }

  private pintarFondo(): void {
    if (!this.ctx || !this.firmaCanvas) {
      return;
    }
    const canvas = this.firmaCanvas.nativeElement;
    const w = canvas.clientWidth || 480;
    const h = 180;
    this.ctx.fillStyle = '#020617';
    this.ctx.fillRect(0, 0, w, h);
  }

  private attachPointer(canvas: HTMLCanvasElement): void {
    const pos = (e: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = (canvas.clientWidth || rect.width) / rect.width;
      const scaleY = (canvas.clientHeight || rect.height) / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    canvas.onpointerdown = e => {
      e.preventDefault();
      if (!this.ctx) {
        return;
      }
      this.dibujando = true;
      this.pointerIds.add(e.pointerId);
      const p = pos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.onpointermove = e => {
      if (!this.dibujando || !this.ctx || !this.pointerIds.has(e.pointerId)) {
        return;
      }
      e.preventDefault();
      const p = pos(e);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
      this.firmado = true;
    };

    const end = (e: PointerEvent) => {
      if (!this.pointerIds.has(e.pointerId)) {
        return;
      }
      this.pointerIds.delete(e.pointerId);
      this.dibujando = this.pointerIds.size > 0;
      if (this.firmado) {
        this.capturarFirma();
      }
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.onpointerup = end;
    canvas.onpointercancel = end;
  }

  private capturarFirma(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas || !this.firmado) {
      this.firmaBase64 = null;
      return;
    }
    this.firmaBase64 = canvas.toDataURL('image/png');
  }

  private detachPointer(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    canvas.onpointerdown = null;
    canvas.onpointermove = null;
    canvas.onpointerup = null;
    canvas.onpointercancel = null;
    this.pointerIds.clear();
    this.dibujando = false;
  }
}
