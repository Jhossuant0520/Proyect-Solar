import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { CompraService } from '../../../../core/services/compra.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import {
  CompraRequestDTO,
  DetalleCompraRequestDTO,
  TipoDocumentoExternoCompra
} from '../../../../core/models/compra.models';
import { CondicionPagoProveedor, ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { ProductoModel } from '../../producto/productoClase';
import {
  mensajeErrorLookupCodigoBarras,
  resolverProductoPorCodigoBarras
} from '../../producto/producto-barcode-lookup';
import {
  MENSAJE_PRODUCTO_YA_EN_COMPRA,
  idsProductosEnLineas,
  labelCodigoBarras,
  productoCoincideBusqueda
} from '../../producto/producto-ui';
import { formatImporte, mapHttpError } from '../../venta/venta-ui';
import {
  TIPOS_DOCUMENTO_EXTERNO,
  dateInputToIso,
  roundMoney
} from '../compra-ui';

type FormEstado = 'loading' | 'ready' | 'error';
type SubmitEstado = 'idle' | 'processing' | 'error';

@Component({
  selector: 'app-compra-form',
  standalone: true,
  templateUrl: './compra-form.html',
  styleUrl: './compra-form.scss',
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
export class CompraFormComponent implements OnInit {
  form: FormGroup;
  proveedores: ProveedorResponseDTO[] = [];
  catalogo: ProductoModel[] = [];
  busquedaProducto = '';
  buscandoCodigo = false;
  loadState: FormEstado = 'loading';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';
  readonly money = formatImporte;
  readonly labelCodigo = labelCodigoBarras;
  readonly tiposDocumento = TIPOS_DOCUMENTO_EXTERNO;
  /** Tasas de IVA soportadas en el flujo normal (sin régimen fiscal completo). */
  readonly tasasIva = [
    { valor: 19, label: '19%' },
    { valor: 0, label: '0%' }
  ];
  readonly ivaPredeterminado = 19;

  constructor(
    private fb: FormBuilder,
    private compraService: CompraService,
    private proveedorService: ProveedorService,
    private productoService: ProductoService,
    private feedback: SolvixFeedbackService,
    private router: Router
  ) {
    this.form = this.fb.group({
      proveedorId: [null as number | null, Validators.required],
      tipoDocumentoExterno: ['' as '' | TipoDocumentoExternoCompra],
      numeroDocumentoExterno: [''],
      numeroOrdenCompra: [''],
      numeroCotizacionProveedor: [''],
      fechaDocumentoProveedor: [''],
      fechaEntrega: [''],
      fechaVencimiento: [''],
      condicionPagoAplicada: ['' as '' | CondicionPagoProveedor],
      diasCreditoAplicados: [null as number | null],
      contactoProveedorId: [null as number | null],
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

  get esCredito(): boolean {
    return this.form.get('condicionPagoAplicada')?.value === 'CREDITO';
  }

  get contactosProveedor(): ProveedorResponseDTO['contactos'] {
    const id = this.form.get('proveedorId')?.value;
    const proveedor = this.proveedores.find(item => item.id === id);
    return (proveedor?.contactos ?? []).filter(c => c.activo);
  }

  get productosFiltrados(): ProductoModel[] {
    const query = this.busquedaProducto.trim();
    const usados = idsProductosEnLineas(this.detalles.controls);
    return this.catalogo
      .filter(producto => producto.id != null && !usados.has(producto.id))
      .filter(producto => productoCoincideBusqueda(producto, query))
      .slice(0, 8);
  }

  get subtotalEstimado(): number {
    return roundMoney(this.detalles.controls.reduce((acc, control) => {
      const cantidad = Number(control.get('cantidad')?.value ?? 0);
      const costo = Number(control.get('costoUnitario')?.value ?? 0);
      return acc + cantidad * costo;
    }, 0));
  }

  get impuestoEstimado(): number {
    return roundMoney(this.detalles.controls.reduce((acc, control) => {
      const cantidad = Number(control.get('cantidad')?.value ?? 0);
      const costo = Number(control.get('costoUnitario')?.value ?? 0);
      const pct = Number(control.get('porcentajeImpuesto')?.value ?? 0);
      const base = cantidad * costo;
      return acc + (base * pct) / 100;
    }, 0));
  }

  get descuentoValor(): number {
    return roundMoney(Number(this.form.get('descuento')?.value ?? 0));
  }

  get totalEstimado(): number {
    return roundMoney(this.subtotalEstimado - this.descuentoValor + this.impuestoEstimado);
  }

  cargarCatalogo(): void {
    this.loadState = 'loading';
    forkJoin({
      proveedores: this.proveedorService.listar(true),
      productos: this.productoService.listar({ activo: true })
    }).subscribe({
      next: ({ proveedores, productos }) => {
        this.proveedores = proveedores;
        this.catalogo = productos;
        this.loadState = 'ready';
      },
      error: error => this.marcarErrorCarga(error)
    });
  }

  onProveedorChange(): void {
    const id = this.form.get('proveedorId')?.value;
    const proveedor = this.proveedores.find(item => item.id === id);
    if (!proveedor) {
      this.form.patchValue({
        condicionPagoAplicada: '',
        diasCreditoAplicados: null,
        contactoProveedorId: null
      });
      return;
    }
    const condicion = proveedor.condicionPago ?? '';
    this.form.patchValue({
      condicionPagoAplicada: condicion,
      diasCreditoAplicados: condicion === 'CREDITO' ? (proveedor.diasCredito ?? null) : 0,
      contactoProveedorId: proveedor.contactos?.find(c => c.principal && c.activo)?.id ?? null
    });
  }

  onCondicionChange(): void {
    if (!this.esCredito) {
      this.form.patchValue({ diasCreditoAplicados: 0, fechaVencimiento: '' });
    } else if (!this.form.get('diasCreditoAplicados')?.value) {
      const id = this.form.get('proveedorId')?.value;
      const proveedor = this.proveedores.find(item => item.id === id);
      this.form.patchValue({ diasCreditoAplicados: proveedor?.diasCredito ?? 30 });
    }
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
        this.feedback.error(mensajeErrorLookupCodigoBarras(error, mapped.message), 4000);
      }
    });
  }

  agregarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    if (idsProductosEnLineas(this.detalles.controls).has(producto.id)) {
      this.feedback.info(MENSAJE_PRODUCTO_YA_EN_COMPRA, 3000);
      this.busquedaProducto = '';
      return;
    }
    this.detalles.push(this.fb.group({
      productoId: [producto.id, Validators.required],
      productoNombre: [producto.nombre],
      productoCodigoBarras: [producto.codigoBarras ?? null],
      stockActual: [producto.stockActual ?? 0],
      costoCatalogo: [producto.costoConocido ? producto.costoActual : null],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      costoUnitario: [
        producto.costoConocido ? producto.costoActual : null,
        [Validators.required, Validators.min(0)]
      ],
      referenciaProveedor: [''],
      porcentajeImpuesto: [this.ivaPredeterminado, [Validators.min(0)]]
    }));
    this.busquedaProducto = '';
    this.feedback.success('Producto agregado');
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
        : 'Elige un proveedor y revisa cantidades y costos.';
      return;
    }

    if (this.descuentoValor > this.subtotalEstimado) {
      this.submitState = 'error';
      this.submitError = 'El descuento no puede superar el subtotal.';
      return;
    }

    const tipo = this.form.get('tipoDocumentoExterno')?.value as '' | TipoDocumentoExternoCompra;
    const numeroDoc = (this.form.get('numeroDocumentoExterno')?.value as string)?.trim();
    if (tipo && !numeroDoc) {
      this.submitState = 'error';
      this.submitError = 'Si eliges un tipo de documento externo, el número es obligatorio.';
      return;
    }

    const condicion = this.form.get('condicionPagoAplicada')?.value as '' | CondicionPagoProveedor;
    const dias = this.form.get('diasCreditoAplicados')?.value;
    if (condicion === 'CREDITO' && (!dias || Number(dias) <= 0)) {
      this.submitState = 'error';
      this.submitError = 'Para crédito, los días de crédito deben ser mayores que cero.';
      return;
    }

    const valores = this.form.getRawValue();
    const request: CompraRequestDTO = {
      proveedorId: Number(valores.proveedorId),
      tipoDocumentoExterno: tipo || null,
      numeroDocumentoExterno: numeroDoc || null,
      numeroOrdenCompra: valores.numeroOrdenCompra?.trim() || null,
      numeroCotizacionProveedor: valores.numeroCotizacionProveedor?.trim() || null,
      fechaDocumentoProveedor: dateInputToIso(valores.fechaDocumentoProveedor),
      fechaEntrega: dateInputToIso(valores.fechaEntrega),
      fechaVencimiento: dateInputToIso(valores.fechaVencimiento),
      condicionPagoAplicada: condicion || null,
      diasCreditoAplicados: condicion === 'CONTADO'
        ? 0
        : (valores.diasCreditoAplicados != null ? Number(valores.diasCreditoAplicados) : null),
      contactoProveedorId: valores.contactoProveedorId != null
        ? Number(valores.contactoProveedorId)
        : null,
      descuento: Number(valores.descuento ?? 0),
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null,
      detalles: (valores.detalles as Array<{
        productoId: number;
        cantidad: number;
        costoUnitario: number;
        referenciaProveedor?: string;
        porcentajeImpuesto?: number;
      }>).map((linea): DetalleCompraRequestDTO => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad),
        costoUnitario: Number(linea.costoUnitario),
        referenciaProveedor: linea.referenciaProveedor?.trim() || null,
        porcentajeImpuesto: Number(linea.porcentajeImpuesto ?? 0)
      }))
    };

    this.submitState = 'processing';
    this.submitError = '';
    this.compraService.crear(request).subscribe({
      next: compra => {
        this.submitState = 'idle';
        this.feedback.success(`Compra ${compra.numero} registrada`);
        this.router.navigate(['/compras', compra.id]);
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos registrar la compra.');
        this.submitState = 'error';
        this.submitError = mapped.message;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/compras']);
  }

  private integrarProductoResuelto(producto: ProductoModel): void {
    if (producto.activo === false) {
      this.feedback.warning('Ese producto está inactivo y no se puede comprar.', 4000);
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
