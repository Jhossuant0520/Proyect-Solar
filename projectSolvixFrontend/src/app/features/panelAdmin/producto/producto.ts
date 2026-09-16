import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of, switchMap } from 'rxjs';
import { SolvixButtonComponent } from '../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixFieldHelpComponent } from '../../../shared/components/solvix-field-help/solvix-field-help';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../shared/components/solvix-page-header/solvix-page-header';
import { CategoriaProductoService } from '../../../core/services/categoria-producto.service';
import { ProductoService } from '../../../core/services/producto.service';
import { resolverUrlMedia } from '../../../core/utils/media-url';
import { CategoriaProductoModel, ProductoModel, ProductoRequestDTO } from './productoClase';
import { formatMoney } from '../dashboard/utils/dashboard-format';
import { mapHttpError } from '../venta/venta-ui';
import { formatMontoEntrada, normalizarCodigoBarras, parseMontoEntrada } from './producto-ui';
import {
  MENSAJE_IMAGEN_EXTERNA_FALLA,
  validarArchivoImagenProducto
} from './producto-imagen';
import { AjusteCostoDialogComponent } from './ajuste-costo-dialog/ajuste-costo-dialog';
import { showSolvixSnack } from '../../../shared/utils/solvix-snack';

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
    SolvixButtonComponent,
    SolvixFieldHelpComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    SolvixPageHeaderComponent
  ]
})
export class ProductoComponent implements OnInit, OnDestroy {
  @ViewChild('imagenInput') imagenInput?: ElementRef<HTMLInputElement>;

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

  archivoImagen: File | null = null;
  previewLocalUrl: string | null = null;
  previewFallida = false;
  eliminarImagen = false;
  imagenGuardadaUrl: string | null = null;
  errorImagen = '';
  avisoImagenParcial = '';

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
      codigoBarras: ['', [Validators.maxLength(50)]],
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

  ngOnDestroy(): void {
    this.revocarPreviewLocal();
  }

  get previewVisible(): string | null {
    if (this.eliminarImagen && !this.archivoImagen) {
      return null;
    }
    if (this.previewLocalUrl) {
      return this.previewLocalUrl;
    }
    const urlForm = this.textoOpcional(this.productoForm.get('imagenUrl')?.value);
    if (urlForm) {
      return resolverUrlMedia(urlForm);
    }
    return resolverUrlMedia(this.imagenGuardadaUrl);
  }

  get mensajeErrorPreview(): string {
    return this.previewFallida ? MENSAJE_IMAGEN_EXTERNA_FALLA : '';
  }

  cargarCategorias(): void {
    this.categoriaService.listar(true).subscribe({
      next: categorias => this.categorias = categorias,
      error: () => {
        showSolvixSnack(this.snackBar, 'No se pudieron cargar las categorías', 'error');
      }
    });
  }

  cargarProducto(id: number): void {
    this.loadState = 'loading';
    this.productoService.obtenerPorId(id).subscribe({
      next: producto => {
        this.aplicarProductoCargado(producto);
        this.loadState = 'ready';
      },
      error: () => {
        this.loadState = 'error';
      }
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorImagen = '';
    this.avisoImagenParcial = '';

    if (!archivo) {
      return;
    }

    const validacion = validarArchivoImagenProducto(archivo);
    if (!validacion.ok) {
      this.errorImagen = validacion.mensaje;
      input.value = '';
      return;
    }

    this.revocarPreviewLocal();
    this.archivoImagen = archivo;
    this.previewLocalUrl = URL.createObjectURL(archivo);
    this.previewFallida = false;
    this.eliminarImagen = false;
    this.productoForm.get('imagenUrl')?.setValue('');
  }

  onImagenUrlChange(): void {
    this.errorImagen = '';
    this.previewFallida = false;
    if (this.textoOpcional(this.productoForm.get('imagenUrl')?.value)) {
      this.limpiarArchivoSeleccionado();
      this.eliminarImagen = false;
    }
  }

  onPreviewError(): void {
    this.previewFallida = true;
  }

  quitarImagen(): void {
    this.limpiarArchivoSeleccionado();
    this.productoForm.get('imagenUrl')?.setValue('');
    this.eliminarImagen = true;
    this.previewFallida = false;
    this.errorImagen = '';
  }

  onSubmit(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      showSolvixSnack(this.snackBar, 'Completa los campos obligatorios', 'warning', 2500);
      return;
    }

    if (this.archivoImagen) {
      const validacion = validarArchivoImagenProducto(this.archivoImagen);
      if (!validacion.ok) {
        this.errorImagen = validacion.mensaje;
        return;
      }
    }

    const request = this.armarRequest();
    if (request == null) {
      this.productoForm.markAllAsTouched();
      showSolvixSnack(this.snackBar, 'Revisa el precio, el costo y la categoría.', 'warning', 2500);
      return;
    }

    this.guardando = true;
    this.avisoImagenParcial = '';

    if (this.modoEdicion && this.productoId !== undefined) {
      this.guardarEdicion(this.productoId, request);
      return;
    }

    this.guardarCreacion(request);
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

  reintentarCarga(): void {
    if (this.productoId != null) {
      this.cargarProducto(this.productoId);
    }
  }

  reintentarImagen(): void {
    if (this.productoId == null || !this.archivoImagen) {
      return;
    }
    this.guardando = true;
    this.avisoImagenParcial = '';
    this.productoService.subirImagen(this.productoId, this.archivoImagen).subscribe({
      next: producto => {
        this.guardando = false;
        showSolvixSnack(this.snackBar, 'Imagen guardada', 'success');
        this.router.navigate(['/productos', producto.id]);
      },
      error: error => {
        this.guardando = false;
        this.avisoImagenParcial = 'Producto creado, pero no pudimos guardar la imagen.';
        showSolvixSnack(this.snackBar, this.mensajeError(error, this.avisoImagenParcial), 'error', 5000);
      }
    });
  }

  private guardarCreacion(request: ProductoRequestDTO): void {
    const archivo = this.archivoImagen;
    this.productoService.crear(request).pipe(
      switchMap(creado => {
        if (!archivo || creado.id == null) {
          return of({ producto: creado, imagenFallida: false });
        }
        return this.productoService.subirImagen(creado.id, archivo).pipe(
          switchMap(conImagen => of({ producto: conImagen, imagenFallida: false })),
          catchError(() => {
            this.productoId = creado.id;
            this.modoEdicion = true;
            return of({ producto: creado, imagenFallida: true });
          })
        );
      })
    ).subscribe({
      next: ({ producto, imagenFallida }) => {
        this.guardando = false;
        if (imagenFallida) {
          this.avisoImagenParcial = 'Producto creado, pero no pudimos guardar la imagen.';
          showSolvixSnack(this.snackBar, this.avisoImagenParcial, 'warning', 6000);
          return;
        }
        showSolvixSnack(this.snackBar, 'Producto registrado', 'success');
        this.router.navigate(producto.id != null ? ['/productos', producto.id] : ['/productos']);
      },
      error: error => {
        this.guardando = false;
        showSolvixSnack(this.snackBar, this.mensajeError(error, 'No pudimos registrar el producto.'), 'error', 5000);
      }
    });
  }

  private guardarEdicion(id: number, request: ProductoRequestDTO): void {
    const archivo = this.archivoImagen;
    const debeEliminar = this.eliminarImagen && !archivo;

    this.productoService.actualizar(id, request).pipe(
      switchMap(producto => {
        if (archivo) {
          return this.productoService.subirImagen(id, archivo);
        }
        if (debeEliminar) {
          return this.productoService.eliminarImagen(id);
        }
        return of(producto);
      })
    ).subscribe({
      next: () => {
        this.guardando = false;
        showSolvixSnack(this.snackBar, 'Producto actualizado', 'success');
        this.router.navigate(['/productos', id]);
      },
      error: error => {
        this.guardando = false;
        showSolvixSnack(this.snackBar, this.mensajeError(error, 'No pudimos actualizar el producto.'), 'error', 5000);
      }
    });
  }

  private aplicarProductoCargado(producto: ProductoModel): void {
    this.stockActual = producto.stockActual ?? 0;
    this.costoVigente = producto.costoActual ?? null;
    this.costoConocido = producto.costoConocido === true;
    this.imagenGuardadaUrl = producto.imagenUrl ?? null;
    this.eliminarImagen = false;
    this.limpiarArchivoSeleccionado();
    this.productoForm.patchValue({
      nombre: producto.nombre,
      marca: producto.marca,
      categoriaId: producto.categoriaId,
      precioVentaActual: producto.precioVentaActual,
      costoActual: producto.costoActual ?? null,
      codigoBarras: producto.codigoBarras ?? '',
      descripcion: producto.descripcion ?? '',
      imagenUrl: this.esUrlExterna(producto.imagenUrl) ? (producto.imagenUrl ?? '') : '',
      activo: producto.activo
    });
    this.precioTexto = formatMontoEntrada(producto.precioVentaActual);
    this.costoTexto = formatMontoEntrada(producto.costoActual ?? null);
    this.productoForm.get('stockInicial')?.disable();
    this.productoForm.get('costoActual')?.disable();
    this.previewFallida = false;
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

    let imagenUrl: string | null = null;
    if (this.archivoImagen) {
      imagenUrl = this.modoEdicion ? this.imagenGuardadaUrl : null;
    } else if (this.eliminarImagen) {
      imagenUrl = null;
    } else {
      const urlForm = this.textoOpcional(valores.imagenUrl);
      if (urlForm) {
        imagenUrl = urlForm;
      } else if (this.modoEdicion && this.imagenGuardadaUrl && !this.esUrlExterna(this.imagenGuardadaUrl)) {
        imagenUrl = this.imagenGuardadaUrl;
      } else {
        imagenUrl = null;
      }
    }

    const request: ProductoRequestDTO = {
      nombre: String(valores.nombre ?? '').trim(),
      marca: String(valores.marca ?? '').trim(),
      categoriaId,
      precioVentaActual,
      codigoBarras: normalizarCodigoBarras(valores.codigoBarras),
      descripcion: this.textoOpcional(valores.descripcion) ?? null,
      imagenUrl,
      activo: valores.activo !== false
    };

    if (!this.modoEdicion) {
      request.costoActual = costoActual;
      request.stockInicial = this.enteroNoNegativo(valores.stockInicial);
    }

    return request;
  }

  private esUrlExterna(url?: string | null): boolean {
    if (!url) {
      return false;
    }
    const limpio = url.trim().toLowerCase();
    return limpio.startsWith('http://') || limpio.startsWith('https://');
  }

  private limpiarArchivoSeleccionado(): void {
    this.revocarPreviewLocal();
    this.archivoImagen = null;
    if (this.imagenInput?.nativeElement) {
      this.imagenInput.nativeElement.value = '';
    }
  }

  private revocarPreviewLocal(): void {
    if (this.previewLocalUrl) {
      URL.revokeObjectURL(this.previewLocalUrl);
      this.previewLocalUrl = null;
    }
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
