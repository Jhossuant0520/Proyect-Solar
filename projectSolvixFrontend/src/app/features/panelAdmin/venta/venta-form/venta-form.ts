import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { ClienteService } from '../../../../core/services/cliente.service';
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
  labelCodigoBarras,
  productoCoincideBusqueda
} from '../../producto/producto-ui';
import { formatImporte, mapHttpError, METODOS_PAGO } from '../venta-ui';
import { clientesParaVenta } from '../../cliente/cliente-ui';

type FormEstado = 'loading' | 'ready' | 'error';
type SubmitEstado = 'idle' | 'processing' | 'error';

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
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class VentaFormComponent implements OnInit {
  form: FormGroup;
  clientes: ClienteResponseDTO[] = [];
  catalogo: ProductoModel[] = [];
  busquedaProducto = '';
  buscandoCodigo = false;
  loadState: FormEstado = 'loading';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';

  readonly metodos = METODOS_PAGO;
  readonly money = formatImporte;
  readonly labelCodigo = labelCodigoBarras;

  constructor(
    private fb: FormBuilder,
    private ventaService: VentaService,
    private clienteService: ClienteService,
    private productoService: ProductoService,
    private snackBar: MatSnackBar,
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
    this.cargarCatalogo();
  }

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  get clientesSeleccionables(): ClienteResponseDTO[] {
    return clientesParaVenta(this.clientes);
  }

  get productosFiltrados(): ProductoModel[] {
    const query = this.busquedaProducto.trim();
    const usados = idsProductosEnLineas(this.detalles.controls);
    return this.catalogo
      .filter(producto => producto.id != null && !usados.has(producto.id))
      .filter(producto => productoCoincideBusqueda(producto, query))
      .slice(0, 8);
  }

  cargarCatalogo(): void {
    this.loadState = 'loading';
    this.clienteService.listar(true).subscribe({
      next: clientes => this.clientes = clientes,
      error: error => this.marcarErrorCarga(error)
    });
    this.productoService.listar({ activo: true }).subscribe({
      next: productos => {
        this.catalogo = productos;
        this.loadState = 'ready';
      },
      error: error => this.marcarErrorCarga(error)
    });
  }

  onBuscarProducto(event: Event): void {
    this.busquedaProducto = (event.target as HTMLInputElement).value;
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
    resolverProductoPorCodigoBarras(this.productoService, this.catalogo, query).subscribe({
      next: producto => {
        this.buscandoCodigo = false;
        this.integrarProductoResuelto(producto);
      },
      error: error => {
        this.buscandoCodigo = false;
        const mapped = mapHttpError(error, 'No pudimos buscar el producto.');
        this.snackBar.open(
          mensajeErrorLookupCodigoBarras(error, mapped.message),
          'Cerrar',
          { duration: 4000 }
        );
      }
    });
  }

  agregarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    if (idsProductosEnLineas(this.detalles.controls).has(producto.id)) {
      this.snackBar.open(MENSAJE_PRODUCTO_YA_EN_VENTA, 'Cerrar', { duration: 3000 });
      this.busquedaProducto = '';
      return;
    }
    this.detalles.push(this.fb.group({
      productoId: [producto.id, Validators.required],
      productoNombre: [producto.nombre],
      productoCodigoBarras: [producto.codigoBarras ?? null],
      stockActual: [producto.stockActual ?? 0],
      precioCatalogo: [producto.precioVentaActual],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precioUnitario: [producto.precioVentaActual, [Validators.required, Validators.min(0)]],
      descuentoLinea: [0, [Validators.min(0)]]
    }));
    this.busquedaProducto = '';
  }

  quitarLinea(index: number): void {
    this.detalles.removeAt(index);
  }

  registrar(): void {
    if (this.form.invalid || this.detalles.length === 0) {
      this.form.markAllAsTouched();
      this.submitState = 'error';
      this.submitError = this.detalles.length === 0
        ? 'Agrega al menos un producto.'
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
        this.snackBar.open(`Venta ${venta.numero} registrada. Queda pendiente hasta completarla.`, 'Cerrar', {
          duration: 4000
        });
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

  private integrarProductoResuelto(producto: ProductoModel): void {
    if (producto.activo === false) {
      this.snackBar.open('Ese producto está inactivo y no se puede vender.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (producto.id != null && !this.catalogo.some(item => item.id === producto.id)) {
      this.catalogo = [producto, ...this.catalogo];
    }
    this.agregarProducto(producto);
  }

  private marcarErrorCarga(error: unknown): void {
    const mapped = mapHttpError(error, 'No pudimos cargar el formulario.');
    this.errorTitle = mapped.title;
    this.errorMessage = mapped.message;
    this.loadState = 'error';
  }
}
