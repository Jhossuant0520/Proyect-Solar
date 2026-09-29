import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { CategoriaProductoService } from '../../../../core/services/categoria-producto.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { CategoriaProductoModel, ProductoModel, ProductoRequestDTO } from '../productoClase';
import { calcularPrecioSugerido, normalizarCodigoBarras } from '../producto-ui';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { mensajeErrorServicio } from '../../servicios/servicio-ui';

export interface ProductoRapidoDialogData {
  /** Texto buscado: se propone como nombre. */
  nombreSugerido?: string;
}

/**
 * Alta compacta de producto sin salir del flujo que la invoca (p. ej. cotización).
 * Usa el mismo POST /v1/productos que el formulario completo.
 */
@Component({
  selector: 'app-producto-rapido-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './producto-rapido-dialog.html',
  styleUrl: './producto-rapido-dialog.scss'
})
export class ProductoRapidoDialogComponent implements OnInit {
  readonly form;
  categorias: CategoriaProductoModel[] = [];
  cargandoCategorias = true;
  enviando = false;
  error = '';
  /** Calculado en UI; no se envía al API. */
  precioSugerido: number | null = null;
  readonly money = formatMoney;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private categoriaService: CategoriaProductoService,
    private dialogRef: MatDialogRef<ProductoRapidoDialogComponent, ProductoModel | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ProductoRapidoDialogData | null
  ) {
    this.form = this.fb.group({
      nombre: [data?.nombreSugerido ?? '', [Validators.required, Validators.maxLength(150)]],
      marca: ['', [Validators.required, Validators.maxLength(100)]],
      categoriaId: [null as number | null, Validators.required],
      precioVentaActual: [null as number | null, [Validators.required, Validators.min(0)]],
      costoActual: [null as number | null, Validators.min(0)],
      recargoPorcentaje: [null as number | null, Validators.min(0)],
      stockInicial: [0, [Validators.required, Validators.min(0)]],
      codigoBarras: ['', Validators.maxLength(50)]
    });
  }

  ngOnInit(): void {
    this.categoriaService.listar(true).subscribe({
      next: categorias => {
        this.categorias = categorias;
        this.cargandoCategorias = false;
        if (categorias.length === 1) {
          this.form.controls.categoriaId.setValue(categorias[0].id);
        }
      },
      error: err => {
        this.cargandoCategorias = false;
        this.error = mensajeErrorServicio(err, 'No pudimos cargar las categorías.');
      }
    });
  }

  onCostoORecargoChange(): void {
    const costo = this.form.controls.costoActual.value;
    const recargo = this.form.controls.recargoPorcentaje.value;
    this.precioSugerido = calcularPrecioSugerido(costo, recargo);
  }

  usarPrecioSugerido(): void {
    if (this.precioSugerido == null) {
      return;
    }
    this.form.controls.precioVentaActual.setValue(this.precioSugerido);
    this.form.controls.precioVentaActual.markAsTouched();
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Completa nombre, marca, categoría y precio de venta.';
      return;
    }
    const v = this.form.getRawValue();
    const request: ProductoRequestDTO = {
      nombre: (v.nombre ?? '').trim(),
      marca: (v.marca ?? '').trim(),
      categoriaId: Number(v.categoriaId),
      precioVentaActual: Number(v.precioVentaActual),
      costoActual: v.costoActual != null && `${v.costoActual}` !== '' ? Number(v.costoActual) : null,
      stockInicial: Number(v.stockInicial) || 0,
      codigoBarras: normalizarCodigoBarras(v.codigoBarras),
      activo: true
    };
    this.enviando = true;
    this.productoService.crear(request).subscribe({
      next: producto => this.dialogRef.close(producto),
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorServicio(err, 'No pudimos crear el producto.');
      }
    });
  }
}
