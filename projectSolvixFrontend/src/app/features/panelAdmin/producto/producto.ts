import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CATEGORIAS_PRODUCTO, ProductoModel } from './productoClase';
import { ProductoService } from '../../../core/services/producto.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-producto',
  standalone: true,
  templateUrl: './producto.html',
  styleUrls: ['./producto.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class ProductoComponent implements OnInit {
  productoForm: FormGroup;
  productoId?: number;
  modoEdicion = false;
  categorias = CATEGORIAS_PRODUCTO;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      marca: ['', Validators.required],
      categoria: ['GENERAL', Validators.required],
      precio: [null, [Validators.required, Validators.min(0)]],
      cantidadStock: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      imagenUrl: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.productoId = +idParam;
      this.cargarProducto(this.productoId);
    }
  }

  cargarProducto(id: number): void {
    this.productoService.obtenerPorId(id).subscribe({
      next: (producto) => this.productoForm.patchValue(producto),
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
      this.productoForm.markAllAsTouched();
      this.snackBar.open('Completa los campos obligatorios', 'Cerrar', {
        duration: 2500,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    const datos: ProductoModel = this.productoForm.value;

    if (this.modoEdicion && this.productoId !== undefined) {
      this.productoService.actualizar(this.productoId, datos).subscribe({
        next: () => {
          this.snackBar.open('Producto actualizado', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.router.navigate(['/listaproductos']);
        },
        error: () => {
          this.snackBar.open('Error al actualizar producto', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    } else {
      this.productoService.crear(datos).subscribe({
        next: () => {
          this.snackBar.open('Producto registrado', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.productoForm.reset({ categoria: 'GENERAL', cantidadStock: 0, activo: true });
        },
        error: () => {
          this.snackBar.open('Error al registrar producto', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/listaproductos']);
  }

  logout(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
