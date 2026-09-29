import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import {
  CotizacionComercialRequestDTO,
  CotizacionComercialResponseDTO,
  TipoLineaCotizacionComercial
} from '../../../../core/models/cotizacion-comercial.models';
import { ProductoModel } from '../../producto/productoClase';
import { ProductoBuscadorComponent } from '../../producto/producto-buscador/producto-buscador';
import {
  ProductoRapidoDialogComponent,
  ProductoRapidoDialogData
} from '../../producto/producto-rapido-dialog/producto-rapido-dialog';
import { ClienteBuscadorComponent } from '../../cliente/cliente-buscador/cliente-buscador';
import { formatImporte, mapHttpError } from '../../venta/venta-ui';
import { labelTipoLinea, participaEnResumenCotizacion, subtotalLinea } from '../cotizacion-comercial-ui';

type CargaEstado = 'loading' | 'ready' | 'error';
type SubmitEstado = 'idle' | 'processing' | 'error';

@Component({
  selector: 'app-cotizacion-comercial-form',
  standalone: true,
  templateUrl: './cotizacion-comercial-form.html',
  styleUrl: './cotizacion-comercial-form.scss',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    ClienteBuscadorComponent,
    ProductoBuscadorComponent
  ]
})
export class CotizacionComercialFormComponent implements OnInit {
  readonly form: FormGroup;
  cotizacionId: number | null = null;
  original: CotizacionComercialResponseDTO | null = null;
  cliente: ClienteResponseDTO | null = null;
  cargaEstado: CargaEstado = 'ready';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar la cotización.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';

  readonly money = formatImporte;
  readonly labelTipo = labelTipoLinea;
  readonly subtotal = subtotalLinea;
  /** D.6: categoría del resumen solo si importe &gt; 0. */
  readonly participaEnResumen = participaEnResumenCotizacion;

  private readonly fb = inject(FormBuilder);
  private readonly cotizacionService = inject(CotizacionComercialService);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(SolvixFeedbackService);
  private readonly actionReveal = inject(SolvixActionRevealService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    this.form = this.fb.group({
      clienteId: [null as number | null],
      observaciones: ['', Validators.maxLength(1000)],
      detalles: this.fb.array([])
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(id) && id > 0) {
      this.cotizacionId = id;
      this.cargar(id);
    }
  }

  get esEdicion(): boolean {
    return this.cotizacionId != null;
  }

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  get lineas(): FormGroup[] {
    return this.detalles.controls as FormGroup[];
  }

  get subtotalProductos(): number {
    return this.sumar('PRODUCTO');
  }

  get subtotalManoObra(): number {
    return this.sumar('MANO_OBRA');
  }

  get subtotalOtros(): number {
    return this.sumar('OTRO');
  }

  get total(): number {
    return Math.round((this.subtotalProductos + this.subtotalManoObra + this.subtotalOtros) * 100) / 100;
  }

  get volveraABorrador(): boolean {
    return this.original?.estado === 'PENDIENTE_APROBACION';
  }

  /** true si ya hay una línea MANO_OBRA en el formulario. */
  get tieneManoObra(): boolean {
    return this.lineas.some(linea => linea.get('tipo')?.value === 'MANO_OBRA');
  }

  /** IDs de productos ya en líneas (estado real del form). */
  get productoIdsAgregados(): number[] {
    return this.lineas
      .map(l => Number(l.get('productoId')?.value))
      .filter(id => Number.isFinite(id) && id > 0);
  }

  productoYaAgregado(productoId: number | null | undefined): boolean {
    if (productoId == null) {
      return false;
    }
    return this.productoIdsAgregados.includes(productoId);
  }

  indiceLineaProducto(productoId: number): number {
    return this.lineas.findIndex(l => Number(l.get('productoId')?.value) === productoId);
  }

  cargar(id: number): void {
    this.cargaEstado = 'loading';
    this.cotizacionService.obtener(id).subscribe({
      next: cot => {
        if (!cot.puedeEditar) {
          this.errorTitle = 'Esta cotización ya no se puede editar.';
          this.errorMessage = cot.estado === 'APROBADA'
            ? 'La cotización aprobada conserva lo que aceptó el cliente.'
            : 'Solo se editan cotizaciones en borrador o pendientes de aprobación.';
          this.original = cot;
          this.cargaEstado = 'error';
          return;
        }
        this.poblar(cot);
        this.cargaEstado = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar la cotización.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.cargaEstado = 'error';
      }
    });
  }

  onClienteSeleccionado(cliente: ClienteResponseDTO | null): void {
    this.cliente = cliente;
    this.form.patchValue({ clienteId: cliente?.id ?? null });
  }

  agregarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    if (this.productoYaAgregado(producto.id)) {
      this.onProductoYaAgregado(producto);
      return;
    }
    this.detalles.push(this.nuevaLinea('PRODUCTO', {
      productoId: producto.id,
      productoNombre: producto.nombre,
      stockActual: producto.stockActual ?? 0,
      productoActivo: producto.activo !== false,
      descripcion: producto.nombre,
      cantidad: 1,
      precioUnitario: producto.precioVentaActual ?? 0
    }));
    const index = this.detalles.length - 1;
    this.actionReveal.success({
      message: 'Producto agregado',
      target: `[data-linea-index="${index}"]`
    });
  }

  onProductoYaAgregado(producto: ProductoModel): void {
    const index = producto.id != null ? this.indiceLineaProducto(producto.id) : -1;
    this.actionReveal.info({
      message: 'Producto ya agregado',
      target: index >= 0 ? `[data-linea-index="${index}"]` : null,
      highlight: index >= 0
    });
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
      if (producto) {
        this.agregarProducto(producto);
      }
    });
  }

  agregarManoObra(): void {
    if (this.tieneManoObra) {
      this.feedback.info('La mano de obra ya está en la cotización.');
      const index = this.lineas.findIndex(l => l.get('tipo')?.value === 'MANO_OBRA');
      if (index >= 0) {
        this.actionReveal.reveal(`[data-linea-index="${index}"]`);
      }
      return;
    }
    this.detalles.push(this.nuevaLinea('MANO_OBRA'));
    const index = this.detalles.length - 1;
    this.actionReveal.success({
      message: 'Mano de obra agregada',
      target: `[data-linea-index="${index}"]`
    });
  }

  agregarOtro(): void {
    this.detalles.push(this.nuevaLinea('OTRO'));
    const index = this.detalles.length - 1;
    this.actionReveal.success({
      message: 'Concepto agregado',
      target: `[data-linea-index="${index}"]`
    });
  }

  quitarLinea(index: number): void {
    const tipo = this.lineas[index]?.get('tipo')?.value;
    this.detalles.removeAt(index);
    this.feedback.info(tipo === 'PRODUCTO' ? 'Producto eliminado' : 'Línea eliminada');
  }

  guardar(): void {
    if (this.detalles.length === 0) {
      this.submitState = 'error';
      this.submitError = 'Agrega al menos una línea a la cotización.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = 'Revisa descripciones, cantidades y precios de las líneas.';
      return;
    }

    const request = this.construirRequest();
    this.submitState = 'processing';
    this.submitError = '';
    const peticion = this.cotizacionId != null
      ? this.cotizacionService.actualizar(this.cotizacionId, request)
      : this.cotizacionService.crear(request);

    peticion.subscribe({
      next: cot => {
        this.submitState = 'idle';
        this.feedback.success(`Cotización ${cot.numero} guardada como borrador.`);
        this.router.navigate(['/cotizaciones', cot.id]);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos guardar la cotización.');
        this.submitState = 'error';
        this.submitError = mapped.message;
        this.feedback.error(mapped.message);
      }
    });
  }

  cancelar(): void {
    if (this.cotizacionId != null) {
      this.router.navigate(['/cotizaciones', this.cotizacionId]);
    } else {
      this.router.navigate(['/cotizaciones']);
    }
  }

  private sumar(tipo: TipoLineaCotizacionComercial): number {
    return this.lineas
      .filter(l => l.get('tipo')?.value === tipo)
      .reduce((acc, l) => acc + subtotalLinea(l.get('cantidad')?.value, l.get('precioUnitario')?.value), 0);
  }

  private nuevaLinea(
    tipo: TipoLineaCotizacionComercial,
    valores: Partial<{
      productoId: number | null;
      productoNombre: string | null;
      stockActual: number | null;
      productoActivo: boolean;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
    }> = {}
  ): FormGroup {
    const esProducto = tipo === 'PRODUCTO';
    return this.fb.group({
      tipo: [tipo],
      productoId: [valores.productoId ?? null],
      productoNombre: [valores.productoNombre ?? null],
      stockActual: [valores.stockActual ?? null],
      productoActivo: [valores.productoActivo ?? true],
      descripcion: [
        valores.descripcion ?? '',
        esProducto ? [Validators.maxLength(255)] : [Validators.required, Validators.maxLength(255)]
      ],
      cantidad: [valores.cantidad ?? 1, [Validators.required, Validators.min(0.01)]],
      precioUnitario: [valores.precioUnitario ?? null, [Validators.required, Validators.min(0)]]
    });
  }

  private poblar(cot: CotizacionComercialResponseDTO): void {
    this.original = cot;
    this.cliente = cot.clienteConsumidorFinal || cot.clienteId == null
      ? null
      : {
          id: cot.clienteId,
          nombre: cot.clienteNombre,
          tipoCliente: 'PERSONA',
          consumidorFinal: false,
          tipoDocumento: null,
          numeroDocumento: cot.clienteDocumento,
          email: null,
          telefono: null,
          notas: null,
          activo: true,
          fechaRegistro: null
        };
    this.form.patchValue({
      clienteId: this.cliente?.id ?? null,
      observaciones: cot.observaciones ?? ''
    });
    this.detalles.clear();
    for (const d of cot.detalles) {
      this.detalles.push(this.nuevaLinea(d.tipo, {
        productoId: d.productoId,
        productoNombre: d.productoNombreSnapshot,
        stockActual: null,
        productoActivo: d.productoActivo !== false,
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario)
      }));
    }
  }

  private construirRequest(): CotizacionComercialRequestDTO {
    const valores = this.form.getRawValue();
    const observaciones = (valores.observaciones ?? '').trim();
    return {
      clienteId: valores.clienteId == null ? null : Number(valores.clienteId),
      observaciones: observaciones || null,
      detalles: (valores.detalles as Array<{
        tipo: TipoLineaCotizacionComercial;
        productoId: number | null;
        descripcion: string;
        cantidad: number;
        precioUnitario: number;
      }>).map(l => ({
        tipo: l.tipo,
        productoId: l.tipo === 'PRODUCTO' ? l.productoId : null,
        descripcion: (l.descripcion ?? '').trim() || null,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario)
      }))
    };
  }
}
