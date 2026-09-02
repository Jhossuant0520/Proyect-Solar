import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router } from '@angular/router';

import { CategoriaProductoModel, ProductoModel } from './productoClase';
import { ProductoService } from '../../../core/services/producto.service';
import { CategoriaProductoService } from '../../../core/services/categoria-producto.service';

@Component({
  selector: 'app-producto',
  standalone: true,
  templateUrl: './producto.html',
  styleUrls: ['./producto.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule
  ]
})
export class ProductoComponent implements OnInit {
  productoForm: FormGroup;
  productoId?: number;
  modoEdicion = false;
  categorias: CategoriaProductoModel[] = [];
  stockActual = 0;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private categoriaService: CategoriaProductoService,
    private snackBar: MatSnackBar,
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
      next: (categorias) => this.categorias = categorias,
      error: () => {
        this.snackBar.open('No se pudieron cargar las categorías', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  cargarProducto(id: number): void {
    this.productoService.obtenerPorId(id).subscribe({
      next: (producto) => {
        this.stockActual = producto.stockActual ?? 0;
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
        this.productoForm.get('stockInicial')?.disable();
      },
      error: () => {
        this.snackBar.open('Error al cargar el producto', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  onSubmit(): void {
    if (this.productoForm.invalid) {
      this.snackBar.open('Completa los campos obligatorios', 'Cerrar', {
        duration: 2500,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    const valores = this.productoForm.getRawValue();
    const datos: ProductoModel = {
      nombre: valores.nombre,
      marca: valores.marca,
      categoriaId: valores.categoriaId,
      precioVentaActual: valores.precioVentaActual,
      costoActual: valores.costoActual === '' || valores.costoActual == null ? null : valores.costoActual,
      descripcion: valores.descripcion,
      imagenUrl: valores.imagenUrl,
      activo: valores.activo
    };

    if (this.modoEdicion && this.productoId !== undefined) {
      this.productoService.actualizar(this.productoId, datos).subscribe({
        next: () => {
          this.snackBar.open('Producto actualizado', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.router.navigate(['/listaproductos']);
        },
        error: (err) => {
          this.snackBar.open(err?.error?.message ?? 'Error al actualizar producto', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-error']
          });
        }
      });
    } else {
      this.productoService.crear({ ...datos, stockInicial: valores.stockInicial ?? 0 }).subscribe({
        next: () => {
          this.snackBar.open('Producto registrado', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.productoForm.reset({ stockInicial: 0, activo: true });
        },
        error: (err) => {
          this.snackBar.open(err?.error?.message ?? 'Error al registrar producto', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-error']
          });
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/listaproductos']);
  }
}
