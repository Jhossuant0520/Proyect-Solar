import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { CompraService } from '../../../../core/services/compra.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { CompraRequestDTO, DetalleCompraRequestDTO } from '../../../../core/models/compra.models';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { ProductoModel } from '../../producto/productoClase';
import { formatImporte, mapHttpError } from '../../venta/venta-ui';

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
  loadState: FormEstado = 'loading';
  submitState: SubmitEstado = 'idle';
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';
  readonly money = formatImporte;

  constructor(
    private fb: FormBuilder,
    private compraService: CompraService,
    private proveedorService: ProveedorService,
    private productoService: ProductoService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      proveedorId: [null as number | null, Validators.required],
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

  get productosFiltrados(): ProductoModel[] {
    const query = this.busquedaProducto.trim().toLowerCase();
    const usados = new Set(
      this.detalles.controls
        .map(control => Number(control.get('productoId')?.value))
        .filter(id => Number.isFinite(id))
    );
    return this.catalogo
      .filter(producto => producto.id != null && !usados.has(producto.id))
      .filter(producto => {
        if (!query) {
          return true;
        }
        return producto.nombre.toLowerCase().includes(query)
          || (producto.marca ?? '').toLowerCase().includes(query)
          || String(producto.id).includes(query);
      })
      .slice(0, 8);
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

  onBuscarProducto(event: Event): void {
    this.busquedaProducto = (event.target as HTMLInputElement).value;
  }

  agregarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    this.detalles.push(this.fb.group({
      productoId: [producto.id, Validators.required],
      productoNombre: [producto.nombre],
      stockActual: [producto.stockActual ?? 0],
      costoCatalogo: [producto.costoConocido ? producto.costoActual : null],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      costoUnitario: [
        producto.costoConocido ? producto.costoActual : null,
        [Validators.required, Validators.min(0)]
      ]
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
        : 'Elige un proveedor y revisa cantidades y costos.';
      return;
    }

    const valores = this.form.getRawValue();
    const request: CompraRequestDTO = {
      proveedorId: Number(valores.proveedorId),
      descuento: Number(valores.descuento ?? 0),
      observaciones: valores.observaciones?.trim() ? valores.observaciones.trim() : null,
      detalles: (valores.detalles as Array<{
        productoId: number;
        cantidad: number;
        costoUnitario: number;
      }>).map((linea): DetalleCompraRequestDTO => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad),
        costoUnitario: Number(linea.costoUnitario)
      }))
    };

    this.submitState = 'processing';
    this.submitError = '';
    this.compraService.crear(request).subscribe({
      next: compra => {
        this.submitState = 'idle';
        this.snackBar.open(`Compra ${compra.numero} registrada. Queda pendiente hasta completarla.`, 'Cerrar', {
          duration: 4000
        });
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

  private marcarErrorCarga(error: unknown): void {
    const mapped = mapHttpError(error, 'No pudimos cargar el formulario.');
    this.errorTitle = mapped.title;
    this.errorMessage = mapped.message;
    this.loadState = 'error';
  }
}
