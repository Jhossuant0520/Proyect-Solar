import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixFieldHelpComponent } from '../../../shared/components/solvix-field-help/solvix-field-help';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../shared/components/solvix-page-header/solvix-page-header';
import { CategoriaProductoService } from '../../../core/services/categoria-producto.service';
import { ProductoService } from '../../../core/services/producto.service';
import { CategoriaProductoModel, ProductoRequestDTO } from './productoClase';
import { formatMoney } from '../dashboard/utils/dashboard-format';
import { mapHttpError } from '../venta/venta-ui';
import { formatMontoEntrada, parseMontoEntrada } from './producto-ui';
import { AjusteCostoDialogComponent } from './ajuste-costo-dialog/ajuste-costo-dialog';

@Component({
  selector: 'app-producto',
  standalone: true,
  templateUrl: './producto.html',
  styleUrls: ['./producto.scss'],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatSnackBarModule,
    MatDialogModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixFieldHelpComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ProductoComponent implements OnInit {
  productoForm: FormGroup;
  productoId?: number;
  modoEdicion = false;
  categorias: CategoriaProductoModel[] = [];
  stockActual = 0;
  costoVigente: number | null = null;
  costoConocido = false;
  loadState: 'loading' | 'ready' | 'error' = 'ready';
  guardando = false;
  precioTexto = '';
  costoTexto = '';
  readonly money = formatMoney;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private categoriaService: CategoriaProductoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      marca: ['', Validators.required],
      categoriaId: [null, Validators.required],
      precioVentaActual: [null, [Validators.required, Validators.min(0)]],
      costoActual: [null, [Validators.min(0)]],
      stockInicial: [0, [Validators.min(0)]],
      descripcion: [''],
      imagenUrl: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.productoId = +idParam;
      this.cargarProducto(this.productoId);
    }
  }

  cargarCategorias(): void {
    this.categoriaService.listar(true).subscribe({
      next: categorias => this.categorias = categorias,
      error: () => {
        this.snackBar.open('No se pudieron cargar las categorías', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarProducto(id: number): void {
    this.loadState = 'loading';
    this.productoService.obtenerPorId(id).subscribe({
      next: producto => {
        this.stockActual = producto.stockActual ?? 0;
        this.costoVigente = producto.costoActual ?? null;
        this.costoConocido = producto.costoConocido === true;
        this.productoForm.patchValue({
          nombre: producto.nombre,
          marca: producto.marca,
          categoriaId: producto.categoriaId,
          precioVentaActual: producto.precioVentaActual,
          costoActual: producto.costoActual ?? null,
          descripcion: producto.descripcion ?? '',
          imagenUrl: producto.imagenUrl ?? '',
          activo: producto.activo
        });
        this.precioTexto = formatMontoEntrada(producto.precioVentaActual);
        this.costoTexto = formatMontoEntrada(producto.costoActual ?? null);
        this.productoForm.get('stockInicial')?.disable();
        this.productoForm.get('costoActual')?.disable();
        this.loadState = 'ready';
      },
      error: () => {
        this.loadState = 'error';
      }
    });
  }

  onSubmit(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios', 'Cerrar', { duration: 2500 });
      return;
    }

    const request = this.armarRequest();
    if (request == null) {
      this.productoForm.markAllAsTouched();
      this.snackBar.open('Revisa el precio, el costo y la categoría.', 'Cerrar', { duration: 2500 });
      return;
    }

    this.guardando = true;

    if (this.modoEdicion && this.productoId !== undefined) {
      this.productoService.actualizar(this.productoId, request).subscribe({
        next: () => {
          this.snackBar.open('Producto actualizado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/productos', this.productoId]);
        },
        error: error => {
          this.guardando = false;
          this.snackBar.open(this.mensajeError(error, 'No pudimos actualizar el producto.'), 'Cerrar', { duration: 5000 });
        }
      });
      return;
    }

    this.productoService.crear(request).subscribe({
      next: creado => {
        this.snackBar.open('Producto registrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(creado.id != null ? ['/productos', creado.id] : ['/productos']);
      },
      error: error => {
        this.guardando = false;
        this.snackBar.open(this.mensajeError(error, 'No pudimos registrar el producto.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  ajustarCosto(): void {
    if (this.productoId == null) {
      return;
    }
    const ref = this.dialog.open(AjusteCostoDialogComponent, {
      data: {
        productoId: this.productoId,
        nombre: this.productoForm.get('nombre')?.value ?? '',
        costoActual: this.costoVigente,
        costoConocido: this.costoConocido,
        stockActual: this.stockActual
      },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado && this.productoId != null) {
        this.cargarProducto(this.productoId);
      }
    });
  }

  onCancel(): void {
    if (this.modoEdicion && this.productoId != null) {
      this.router.navigate(['/productos', this.productoId]);
      return;
    }
    this.router.navigate(['/productos']);
  }

  private armarRequest(): ProductoRequestDTO | null {
    const valores = this.productoForm.getRawValue();
    const categoriaId = Number(valores.categoriaId);
    const precioVentaActual = parseMontoEntrada(this.precioTexto)
      ?? this.numeroOpcional(valores.precioVentaActual);
    const costoActual = this.modoEdicion
      ? null
      : parseMontoEntrada(this.costoTexto) ?? this.numeroOpcional(valores.costoActual);

    if (!Number.isFinite(categoriaId) || precioVentaActual == null || precioVentaActual < 0) {
      return null;
    }

    const request: ProductoRequestDTO = {
      nombre: String(valores.nombre ?? '').trim(),
      marca: String(valores.marca ?? '').trim(),
      categoriaId,
      precioVentaActual,
      descripcion: this.textoOpcional(valores.descripcion) ?? null,
      imagenUrl: this.textoOpcional(valores.imagenUrl) ?? null,
      activo: valores.activo !== false
    };

    if (!this.modoEdicion) {
      request.costoActual = costoActual;
      request.stockInicial = this.enteroNoNegativo(valores.stockInicial);
    }

    return request;
  }

  private mensajeError(error: unknown, fallback: string): string {
    const mapped = mapHttpError(error, fallback);
    if (mapped.status === 403) {
      return `${mapped.message} Si ya entraste como admin, cierra sesión, entra otra vez y revisa en Network que el POST lleve Authorization.`;
    }
    return mapped.status > 0 ? `${mapped.message} (${mapped.status})` : mapped.message;
  }

  onMontoInput(campo: 'precioVentaActual' | 'costoActual', event: Event): void {
    const texto = (event.target as HTMLInputElement).value;
    if (campo === 'precioVentaActual') {
      this.precioTexto = texto;
    } else {
      this.costoTexto = texto;
    }
    const control = this.productoForm.get(campo);
    const monto = parseMontoEntrada(texto);
    control?.setValue(monto, { emitEvent: false });
    control?.markAsTouched();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  onMontoBlur(campo: 'precioVentaActual' | 'costoActual'): void {
    const monto = parseMontoEntrada(campo === 'precioVentaActual' ? this.precioTexto : this.costoTexto);
    this.productoForm.get(campo)?.setValue(monto, { emitEvent: false });
    const formateado = formatMontoEntrada(monto);
    if (campo === 'precioVentaActual') {
      this.precioTexto = formateado;
    } else {
      this.costoTexto = formateado;
    }
  }

  reintentarCarga(): void {
    if (this.productoId != null) {
      this.cargarProducto(this.productoId);
    }
  }

  private textoOpcional(
    valor: string | null | undefined
  ): string | undefined {
    const texto = valor?.trim();
    return texto ? texto : undefined;
  }

  private numeroOpcional(valor: unknown): number | null {
    if (valor === '' || valor == null) {
      return null;
    }
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private enteroNoNegativo(valor: unknown): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      return 0;
    }
    return Math.trunc(numero);
  }
}
