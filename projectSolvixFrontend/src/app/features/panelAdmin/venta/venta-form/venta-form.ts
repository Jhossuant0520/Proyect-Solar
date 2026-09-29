import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { ProductoService } from '../../../../core/services/producto.service';
import { VentaService } from '../../../../core/services/venta.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { DetalleVentaRequestDTO, MetodoPago, VentaRequestDTO } from '../../../../core/models/venta.models';
import { ProductoModel } from '../../producto/productoClase';
import {
  mensajeErrorLookupCodigoBarras,
  resolverProductoPorCodigoBarras
} from '../../producto/producto-barcode-lookup';
import {
  MENSAJE_PRODUCTO_YA_EN_VENTA,
  idsProductosEnLineas,
  labelCodigoBarras
} from '../../producto/producto-ui';
import { formatImporte, mapHttpError, METODOS_PAGO } from '../venta-ui';
import { ClienteBuscadorComponent } from '../../cliente/cliente-buscador/cliente-buscador';

type SubmitEstado = 'idle' | 'processing' | 'error';
type BusquedaEstado = 'idle' | 'buscando' | 'resultados' | 'vacio' | 'error';

export const LIMITE_BUSQUEDA_PRODUCTOS_VENTA = 10;
export const MIN_CARACTERES_PRODUCTO_VENTA = 2;
export const DEBOUNCE_PRODUCTO_VENTA_MS = 250;

/** La cantidad pedida no puede superar el stock disponible (igual es válida). */
export function cantidadDentroDeStock(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const cantidad = Number(group.get('cantidad')?.value);
    const stock = Number(group.get('stockActual')?.value ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return null;
    }
    return cantidad <= stock ? null : { stockInsuficiente: { disponible: stock, requerido: cantidad } };
  };
}

@Component({
  selector: 'app-venta-form',
  standalone: true,
  templateUrl: './venta-form.html',
  styleUrl: './venta-form.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    ClienteBuscadorComponent
  ]
})
export class VentaFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  cliente: ClienteResponseDTO | null = null;
  resultados: ProductoModel[] = [];
  busquedaProducto = '';
  busquedaEstado: BusquedaEstado = 'idle';
  buscandoCodigo = false;
  submitState: SubmitEstado = 'idle';
  submitError = '';

  readonly metodos = METODOS_PAGO;
  readonly money = formatImporte;
  readonly labelCodigo = labelCodigoBarras;
  readonly limiteBusqueda = LIMITE_BUSQUEDA_PRODUCTOS_VENTA;
  readonly minCaracteres = MIN_CARACTERES_PRODUCTO_VENTA;

  private readonly consultas = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private ventaService: VentaService,
    private productoService: ProductoService,
    private feedback: SolvixFeedbackService,
    private actionReveal: SolvixActionRevealService,
    private router: Router
  ) {
    this.form = this.fb.group({
      clienteId: [null as number | null],
      metodoPago: ['EFECTIVO' as MetodoPago, Validators.required],
      descuento: [0, [Validators.min(0)]],
      observaciones: [''],
      detalles: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.sub = this.consultas
      .pipe(
        map(t => t.trim()),
        debounceTime(DEBOUNCE_PRODUCTO_VENTA_MS),
        distinctUntilChanged(),
        tap(t => {
          if (t.length < MIN_CARACTERES_PRODUCTO_VENTA) {
            this.resultados = [];
            this.busquedaEstado = 'idle';
          } else {
            this.busquedaEstado = 'buscando';
          }
        }),
        switchMap(t =>
          t.length < MIN_CARACTERES_PRODUCTO_VENTA
            ? of(null)
            : this.productoService
                .buscar(t, LIMITE_BUSQUEDA_PRODUCTOS_VENTA)
                .pipe(catchError(() => of(undefined)))
        )
      )
      .subscribe(lista => {
        if (lista === null) {
          return;
        }
        if (lista === undefined) {
          this.resultados = [];
          this.busquedaEstado = 'error';
          return;
        }
        this.resultados = lista;
        this.busquedaEstado = lista.length ? 'resultados' : 'vacio';
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  get productosFiltrados(): ProductoModel[] {
    const usados = idsProductosEnLineas(this.detalles.controls);
    return this.resultados.filter(producto => producto.id != null && !usados.has(producto.id));
  }

  get lineasSinStock(): number {
    return this.detalles.controls.filter(c => c.hasError('stockInsuficiente')).length;
  }

  onClienteSeleccionado(cliente: ClienteResponseDTO | null): void {
    this.cliente = cliente;
    this.form.patchValue({ clienteId: cliente?.id ?? null });
  }

  onBuscarProducto(event: Event): void {
    this.busquedaProducto = (event.target as HTMLInputElement).value;
    this.consultas.next(this.busquedaProducto);
  }

  /** HID/teclado: Enter confirma el código sin enviar el formulario. */
  onBusquedaEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.resolverYAgregarPorCodigo();
  }

  resolverYAgregarPorCodigo(): void {
    const query = this.busquedaProducto.trim();
    if (!query || this.buscandoCodigo) {
      return;
    }

    const unSoloResultado = this.productosFiltrados;
    if (unSoloResultado.length === 1) {
      this.agregarProducto(unSoloResultado[0]);
      return;
    }

    this.buscandoCodigo = true;
    resolverProductoPorCodigoBarras(this.productoService, this.resultados, query).subscribe({
      next: producto => {
        this.buscandoCodigo = false;
        this.integrarProductoResuelto(producto);
      },
      error: error => {
        this.buscandoCodigo = false;
        const mapped = mapHttpError(error, 'No pudimos buscar el producto.');
        this.feedback.error(mensajeErrorLookupCodigoBarras(error, mapped.message), 4000);
      }
    });
  }

  agregarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    if (idsProductosEnLineas(this.detalles.controls).has(producto.id)) {
      const index = this.detalles.controls.findIndex(c => Number(c.get('productoId')?.value) === producto.id);
      this.actionReveal.info({
        message: MENSAJE_PRODUCTO_YA_EN_VENTA,
        target: index >= 0 ? `[data-linea-index="${index}"]` : null
      });
      this.limpiarBusqueda();
      return;
    }
    const stock = producto.stockActual ?? 0;
    if (stock <= 0) {
      this.feedback.warning(`"${producto.nombre}" no tiene stock disponible.`, 4000);
      return;
    }
    this.detalles.push(this.fb.group({
      productoId: [producto.id, Validators.required],
      productoNombre: [producto.nombre],
      productoCodigoBarras: [producto.codigoBarras ?? null],
      stockActual: [stock],
      precioCatalogo: [producto.precioVentaActual],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precioUnitario: [producto.precioVentaActual, [Validators.required, Validators.min(0)]],
      descuentoLinea: [0, [Validators.min(0)]]
    }, { validators: cantidadDentroDeStock() }));
    const index = this.detalles.length - 1;
    this.limpiarBusqueda();
    this.actionReveal.success({
      message: 'Producto agregado',
      target: `[data-linea-index="${index}"]`
    });
  }

  quitarLinea(index: number): void {
    this.detalles.removeAt(index);
    this.feedback.info('Producto eliminado');
  }

  registrar(): void {
    if (this.form.invalid || this.detalles.length === 0) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = this.detalles.length === 0
        ? 'Agrega al menos un producto.'
        : this.lineasSinStock > 0
          ? 'Hay líneas con más unidades que el stock disponible.'
          : 'Revisa las cantidades, precios y descuentos.';
      return;
    }

    const valores = this.form.getRawValue();
    const request: VentaRequestDTO = {
      clienteId: valores.clienteId == null || valores.clienteId === '' ? null : Number(valores.clienteId),
      metodoPago: valores.metodoPago,
      descuento: Number(valores.descuento ?? 0),
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null,
      detalles: (valores.detalles as Array<{
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        descuentoLinea: number;
      }>).map((linea): DetalleVentaRequestDTO => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad),
        precioUnitario: Number(linea.precioUnitario),
        descuentoLinea: Number(linea.descuentoLinea ?? 0)
      }))
    };

    this.submitState = 'processing';
    this.submitError = '';
    this.ventaService.crear(request).subscribe({
      next: venta => {
        this.submitState = 'idle';
        this.feedback.success(`Venta ${venta.numero} registrada`);
        this.router.navigate(['/ventas', venta.id]);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos registrar la venta.');
        this.submitState = 'error';
        this.submitError = mapped.message;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/ventas']);
  }

  private limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.resultados = [];
    this.busquedaEstado = 'idle';
    this.consultas.next('');
  }

  private integrarProductoResuelto(producto: ProductoModel): void {
    if (producto.activo === false) {
      this.feedback.warning('Ese producto está inactivo y no se puede vender.', 4000);
      return;
    }
    this.agregarProducto(producto);
  }
}
