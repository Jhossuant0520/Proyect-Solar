import { Component, Inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixFeedbackService } from '../../../../../shared/services/solvix-feedback.service';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { CotizacionServicioService } from '../../../../../core/services/cotizacion-servicio.service';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import {
  CotizacionServicioRequestDTO,
  CotizacionServicioResponseDTO,
  DetalleCotizacionServicioRequestDTO,
  TipoDetalleCotizacionServicio
} from '../../../../../core/models/cotizacion-servicio.models';
import { RepuestoOrdenServicioResponseDTO } from '../../../../../core/models/orden-servicio.models';
import { ProductoModel } from '../../../producto/productoClase';
import { ProductoBuscadorComponent } from '../../../producto/producto-buscador/producto-buscador';
import {
  ProductoRapidoDialogComponent,
  ProductoRapidoDialogData
} from '../../../producto/producto-rapido-dialog/producto-rapido-dialog';
import { formatMoney } from '../../../dashboard/utils/dashboard-format';
import { labelTipoDetalleCotizacion, mensajeErrorServicio } from '../../servicio-ui';

export type CotizacionFormModo = 'inicial' | 'adicional' | 'editar';

export interface CotizacionFormDialogData {
  ordenId: number;
  modo: CotizacionFormModo;
  cotizacion?: CotizacionServicioResponseDTO | null;
}

/** Datos del producto elegido que solo sirven de referencia visual (no se envían). */
interface ProductoReferencia {
  stock: number | null;
  precioSugerido: number | null;
}

@Component({
  selector: 'app-cotizacion-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    SolvixButtonComponent,
    ProductoBuscadorComponent
  ],
  templateUrl: './cotizacion-form-dialog.html',
  styleUrl: './cotizacion-form-dialog.scss'
})
export class CotizacionFormDialogComponent implements OnInit {
  readonly form;
  readonly editor: FormGroup;
  readonly money = formatMoney;
  readonly labelTipo = labelTipoDetalleCotizacion;

  repuestos: RepuestoOrdenServicioResponseDTO[] = [];
  cargandoRepuestos = true;
  enviando = false;
  error = '';

  /** null = editor cerrado; -1 = línea nueva; >= 0 = índice de la línea en edición. */
  editorIndex: number | null = null;
  editorError = '';
  editorReferencia: ProductoReferencia | null = null;

  constructor(
    private fb: FormBuilder,
    private cotizacionService: CotizacionServicioService,
    private ordenServicioService: OrdenServicioService,
    private dialog: MatDialog,
    private feedback: SolvixFeedbackService,
    private dialogRef: MatDialogRef<
      CotizacionFormDialogComponent,
      CotizacionServicioResponseDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: CotizacionFormDialogData
  ) {
    this.form = this.fb.group({
      observaciones: ['', Validators.maxLength(1000)],
      motivoAmpliacion: ['', Validators.maxLength(500)],
      detalles: this.fb.array([])
    });
    this.editor = this.crearLinea({
      tipo: 'MANO_OBRA',
      descripcion: '',
      cantidad: 1,
      precioUnitario: null,
      productoId: null,
      productoNombre: null,
      ordenServicioRepuestoId: null
    });
  }

  get detalles(): FormArray<FormGroup> {
    return this.form.get('detalles') as FormArray<FormGroup>;
  }

  get titulo(): string {
    if (this.data.modo === 'editar') {
      return `Editar cotización ${this.data.cotizacion?.numero ?? ''}`.trim();
    }
    return this.esAdicional ? 'Nueva cotización adicional' : 'Nueva cotización inicial';
  }

  get esAdicional(): boolean {
    return this.data.modo === 'adicional' || this.data.cotizacion?.tipo === 'ADICIONAL';
  }

  get tipoCotizacionLabel(): string {
    return this.esAdicional ? 'Adicional' : 'Inicial';
  }

  /** Editar una cotización ya presentada la devuelve a borrador en el servidor. */
  get estabaPresentada(): boolean {
    return this.data.cotizacion?.estado === 'PENDIENTE_APROBACION';
  }

  get editorAbierto(): boolean {
    return this.editorIndex !== null;
  }

  get editorTipo(): TipoDetalleCotizacionServicio {
    return this.editor.get('tipo')?.value as TipoDetalleCotizacionServicio;
  }

  get editorSubtotal(): number {
    return this.subtotalDe(this.editor);
  }

  get subtotalRepuestos(): number {
    return this.sumaTipo('REPUESTO');
  }

  get subtotalManoObra(): number {
    return this.sumaTipo('MANO_OBRA');
  }

  get subtotalOtros(): number {
    return this.sumaTipo('OTRO');
  }

  get total(): number {
    return this.detalles.controls.reduce((acc, ctrl) => acc + this.subtotalDe(ctrl), 0);
  }

  get repuestosDisponibles(): RepuestoOrdenServicioResponseDTO[] {
    const usados = new Set(
      this.detalles.controls
        .map(c => c.get('ordenServicioRepuestoId')?.value)
        .filter((id): id is number => id != null)
        .map(Number)
    );
    return this.repuestos.filter(r => !usados.has(r.id));
  }

  ngOnInit(): void {
    this.ordenServicioService.listarRepuestos(this.data.ordenId).subscribe({
      next: lista => {
        this.repuestos = lista.filter(r => !r.anulado);
        this.cargandoRepuestos = false;
      },
      error: () => {
        this.cargandoRepuestos = false;
      }
    });

    const cot = this.data.cotizacion;
    if (cot) {
      this.form.patchValue({
        observaciones: cot.observaciones ?? '',
        motivoAmpliacion: cot.motivoAmpliacion ?? ''
      });
      for (const d of cot.detalles ?? []) {
        this.detalles.push(
          this.crearLinea({
            tipo: d.tipo,
            descripcion: d.descripcion ?? '',
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario ?? 0,
            productoId: d.productoId,
            productoNombre: d.productoNombreSnapshot,
            ordenServicioRepuestoId: d.ordenServicioRepuestoId
          })
        );
      }
    }
  }

  subtotalLinea(index: number): number {
    const ctrl = this.detalles.at(index);
    return ctrl ? this.subtotalDe(ctrl) : 0;
  }

  conceptoLinea(index: number): string {
    const ctrl = this.detalles.at(index);
    const desc = (ctrl?.get('descripcion')?.value ?? '').trim();
    return desc || ctrl?.get('productoNombre')?.value || '—';
  }

  /** Nombre de producto cuando difiere del concepto mostrado. */
  productoLinea(index: number): string | null {
    const ctrl = this.detalles.at(index);
    const nombre = ctrl?.get('productoNombre')?.value as string | null;
    if (!nombre || nombre === this.conceptoLinea(index)) {
      return null;
    }
    return nombre;
  }

  lineaInvalida(index: number): string | null {
    const ctrl = this.detalles.at(index);
    return ctrl ? this.validarLinea(ctrl) : null;
  }

  placeholderConcepto(tipo: TipoDetalleCotizacionServicio): string {
    switch (tipo) {
      case 'REPUESTO':
        return 'Detalle visible en la cotización (opcional)';
      case 'MANO_OBRA':
        return 'Ej. Diagnóstico, cambio de pantalla, configuración';
      default:
        return 'Ej. Transporte, insumos';
    }
  }

  // ---- Editor de línea ----

  nuevaLinea(tipo: TipoDetalleCotizacionServicio): void {
    this.editor.reset({
      tipo,
      descripcion: '',
      cantidad: 1,
      precioUnitario: null,
      productoId: null,
      productoNombre: null,
      ordenServicioRepuestoId: null
    });
    this.editorReferencia = null;
    this.editorError = '';
    this.editorIndex = -1;
  }

  editarLinea(index: number): void {
    const ctrl = this.detalles.at(index);
    if (!ctrl) {
      return;
    }
    this.editor.reset(ctrl.getRawValue());
    this.editorReferencia = null;
    this.editorError = '';
    this.editorIndex = index;
  }

  agregarDesdeRepuesto(repuesto: RepuestoOrdenServicioResponseDTO): void {
    this.nuevaLinea('REPUESTO');
    this.editor.patchValue({
      productoId: repuesto.productoId,
      productoNombre: repuesto.productoNombre,
      cantidad: Math.max(1, repuesto.cantidadPlanificada || 1),
      ordenServicioRepuestoId: repuesto.id
    });
  }

  seleccionarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    const precioActual = this.editor.get('precioUnitario')?.value;
    const descripcion = (this.editor.get('descripcion')?.value ?? '').trim();
    const nombreAnterior = this.editor.get('productoNombre')?.value;
    this.editor.patchValue({
      descripcion: descripcion && descripcion !== nombreAnterior ? descripcion : '',
      productoId: producto.id,
      productoNombre: producto.nombre,
      ordenServicioRepuestoId: null,
      precioUnitario:
        precioActual == null || precioActual === '' ? producto.precioVentaActual ?? null : precioActual
    });
    this.editorReferencia = {
      stock: producto.stockActual ?? null,
      precioSugerido: producto.precioVentaActual ?? null
    };
    this.editorError = '';
  }

  quitarProductoEditor(): void {
    this.editor.patchValue({ productoId: null, productoNombre: null, ordenServicioRepuestoId: null });
    this.editorReferencia = null;
  }

  crearProducto(nombreSugerido: string): void {
    const ref = this.dialog.open(ProductoRapidoDialogComponent, {
      width: '520px',
      maxWidth: '96vw',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      data: { nombreSugerido } satisfies ProductoRapidoDialogData
    });
    ref.afterClosed().subscribe(producto => {
      if (!producto) {
        return;
      }
      this.feedback.success('Producto creado correctamente.');
      this.seleccionarProducto(producto);
    });
  }

  aplicarEditor(): void {
    const problema = this.validarLinea(this.editor);
    if (problema) {
      this.editor.markAllAsTouched();
      this.editorError = problema;
      return;
    }
    const valores = this.editor.getRawValue();
    if (this.editorIndex === -1) {
      this.detalles.push(this.crearLinea(valores));
    } else if (this.editorIndex != null) {
      this.detalles.at(this.editorIndex).setValue(valores);
    }
    this.cerrarEditor();
    this.error = '';
  }

  cerrarEditor(): void {
    this.editorIndex = null;
    this.editorError = '';
    this.editorReferencia = null;
  }

  quitarLinea(index: number): void {
    if (this.editorIndex === index) {
      this.cerrarEditor();
    } else if (this.editorIndex != null && this.editorIndex > index) {
      this.editorIndex--;
    }
    this.detalles.removeAt(index);
  }

  // ---- Guardar ----

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    this.error = '';
    if (this.editorAbierto) {
      this.error = 'Aplica o descarta la línea que estás editando antes de guardar.';
      return;
    }
    if (this.detalles.length === 0) {
      this.error = 'Agrega al menos una línea.';
      return;
    }
    const invalida = this.detalles.controls.findIndex(c => this.validarLinea(c) != null);
    if (invalida >= 0) {
      this.error = `Línea ${invalida + 1}: ${this.validarLinea(this.detalles.at(invalida))}`;
      return;
    }
    if (this.total <= 0) {
      this.error = 'El total de la cotización debe ser mayor que cero.';
      return;
    }
    if (this.esAdicional && !(this.form.controls.motivoAmpliacion.value ?? '').trim()) {
      this.error = 'Indica el motivo de la ampliación.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa las observaciones: superan el largo permitido.';
      return;
    }

    const request = this.aRequest();
    this.enviando = true;

    const obs =
      this.data.modo === 'editar' && this.data.cotizacion
        ? this.cotizacionService.actualizar(this.data.ordenId, this.data.cotizacion.id, request)
        : this.data.modo === 'adicional'
          ? this.cotizacionService.crearAdicional(this.data.ordenId, request)
          : this.cotizacionService.crearInicial(this.data.ordenId, request);

    obs.subscribe({
      next: cot => this.dialogRef.close(cot),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No pudimos guardar la cotización.');
      }
    });
  }

  private validarLinea(ctrl: FormGroup): string | null {
    const tipo = ctrl.get('tipo')?.value as TipoDetalleCotizacionServicio;
    const cantidad = Number(ctrl.get('cantidad')?.value);
    const precioRaw = ctrl.get('precioUnitario')?.value;
    const precio = Number(precioRaw);
    const descripcion = (ctrl.get('descripcion')?.value ?? '').trim();

    if (tipo === 'REPUESTO' && ctrl.get('productoId')?.value == null) {
      return 'Selecciona o crea el producto del repuesto.';
    }
    if (tipo !== 'REPUESTO' && !descripcion) {
      return 'Escribe el concepto de la línea.';
    }
    if (descripcion.length > 255) {
      return 'El concepto no puede superar 255 caracteres.';
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return 'La cantidad debe ser mayor que cero.';
    }
    if (precioRaw == null || precioRaw === '' || !Number.isFinite(precio)) {
      return 'Indica el precio unitario.';
    }
    if (precio < 0) {
      return 'El precio no puede ser negativo.';
    }
    return null;
  }

  private crearLinea(vals: {
    tipo: TipoDetalleCotizacionServicio;
    descripcion: string | null;
    cantidad: number | null;
    precioUnitario: number | null;
    productoId: number | null;
    productoNombre: string | null;
    ordenServicioRepuestoId: number | null;
  }): FormGroup {
    return this.fb.group({
      tipo: [vals.tipo, Validators.required],
      descripcion: [vals.descripcion ?? '', Validators.maxLength(255)],
      cantidad: [vals.cantidad, [Validators.required, Validators.min(0.01)]],
      precioUnitario: [vals.precioUnitario, [Validators.required, Validators.min(0)]],
      productoId: [vals.productoId],
      productoNombre: [vals.productoNombre],
      ordenServicioRepuestoId: [vals.ordenServicioRepuestoId]
    });
  }

  private subtotalDe(ctrl: FormGroup): number {
    const qty = Number(ctrl.get('cantidad')?.value) || 0;
    const price = Number(ctrl.get('precioUnitario')?.value) || 0;
    return Math.round(qty * price * 100) / 100;
  }

  private sumaTipo(tipo: TipoDetalleCotizacionServicio): number {
    return this.detalles.controls
      .filter(c => c.get('tipo')?.value === tipo)
      .reduce((acc, c) => acc + this.subtotalDe(c), 0);
  }

  private aRequest(): CotizacionServicioRequestDTO {
    const detalles: DetalleCotizacionServicioRequestDTO[] = this.detalles.controls.map(ctrl => {
      const v = ctrl.getRawValue();
      const descripcion = (v.descripcion ?? '').trim();
      return {
        tipo: v.tipo,
        descripcion: descripcion || null,
        cantidad: Number(v.cantidad),
        precioUnitario: Number(v.precioUnitario),
        productoId: v.productoId != null ? Number(v.productoId) : null,
        ordenServicioRepuestoId:
          v.ordenServicioRepuestoId != null ? Number(v.ordenServicioRepuestoId) : null
      };
    });
    return {
      observaciones: (this.form.controls.observaciones.value ?? '').trim() || null,
      motivoAmpliacion: (this.form.controls.motivoAmpliacion.value ?? '').trim() || null,
      detalles
    };
  }
}
