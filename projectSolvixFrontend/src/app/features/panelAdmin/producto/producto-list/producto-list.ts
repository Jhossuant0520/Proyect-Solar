import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ProductoModel } from '../productoClase';
import { ProductoService } from '../../../../core/services/producto.service';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';

@Component({
  selector: 'app-producto-list',
  standalone: true,
  templateUrl: './producto-list.html',
  styleUrls: ['./producto-list.scss'],
  imports: [
    CommonModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule
  ]
})
export class ProductoList implements OnInit {

  displayedColumns: string[] = [
    'nombre',
    'marca',
    'categoriaNombre',
    'precioVentaActual',
    'costoActual',
    'stockActual',
    'activo',
    'acciones'
  ];

  dataSource = new MatTableDataSource<ProductoModel>([]);

  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.dataSource.filterPredicate = (data, filter) =>
      Object.values(data).some(value =>
        value?.toString().toLowerCase().includes(filter)
      );
  }

  cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: (productos) => this.dataSource.data = productos,
      error: () => { /* snackbar opcional */ }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  editarProducto(producto: ProductoModel): void {
    this.router.navigate(['/editar-producto', producto.id]);
  }

  desactivarProducto(id: number): void {
    const dialogRef = this.dialog.open(DialogoConfirmacionDelete, {
      data: {
        mensaje: '¿Desactivar este producto del catálogo?'
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.productoService.desactivar(id).subscribe({
          next: (actualizado) => {
            this.dataSource.data = this.dataSource.data.map(p =>
              p.id === id ? actualizado : p
            );
          }
        });
      }
    });
  }
}
