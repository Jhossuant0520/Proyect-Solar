import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { CATEGORIAS_PRODUCTO, CategoriaProducto, ProductoModel } from '../productoClase';
import { ProductoService } from '../../../../core/services/producto.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';

type VistaStock = 'all' | 'stock' | 'low' | 'out';
type EstadoStock = 'available' | 'low' | 'out';

@Component({
  selector: 'app-producto-list',
  standalone: true,
  templateUrl: './producto-list.html',
  styleUrls: ['./producto-list.scss'],
  imports: [
    CommonModule,
    RouterLink,
    MatDialogModule
  ]
})
export class ProductoList implements OnInit {
  dataSource = new MatTableDataSource<ProductoModel>([]);
  filtro = '';
  userName = 'Usuario';
  vista: VistaStock = 'all';
  categoriaFiltro: CategoriaProducto | '' = '';
  categorias = CATEGORIAS_PRODUCTO;
  pageSize = 10;
  paginaActual = 1;

  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarNombreUsuario();
    this.cargarProductos();
    this.dataSource.filterPredicate = (data, filter) =>
      Object.values(data).some(value =>
        value?.toString().toLowerCase().includes(filter)
      );
  }

  get userInitial(): string {
    return this.userName?.charAt(0).toUpperCase() || 'U';
  }

  get totalProductos(): number {
    return this.dataSource.data.length;
  }

  get enStock(): number {
    return this.dataSource.data.filter(p => this.estadoStock(p) === 'available').length;
  }

  get bajoStock(): number {
    return this.dataSource.data.filter(p => this.estadoStock(p) === 'low').length;
  }

  get agotados(): number {
    return this.dataSource.data.filter(p => this.estadoStock(p) === 'out').length;
  }

  get productosVisibles(): ProductoModel[] {
    return this.dataSource.filteredData.filter(p => {
      const coincideCategoria = !this.categoriaFiltro || p.categoria === this.categoriaFiltro;
      const coincideEstado = this.vista === 'all' || this.estadoStock(p) === this.vistaToEstado(this.vista);
      return coincideCategoria && coincideEstado;
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.productosVisibles.length / this.pageSize));
  }

  get productosPaginados(): ProductoModel[] {
    const inicio = (this.paginaActual - 1) * this.pageSize;
    return this.productosVisibles.slice(inicio, inicio + this.pageSize);
  }

  get rangoInicio(): number {
    if (this.productosVisibles.length === 0) {
      return 0;
    }
    return (this.paginaActual - 1) * this.pageSize + 1;
  }

  get rangoFin(): number {
    return Math.min(this.paginaActual * this.pageSize, this.productosVisibles.length);
  }

  get paginas(): Array<number | '...'> {
    const total = this.totalPaginas;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const items: Array<number | '...'> = [1];
    if (this.paginaActual > 3) {
      items.push('...');
    }

    const desde = Math.max(2, this.paginaActual - 1);
    const hasta = Math.min(total - 1, this.paginaActual + 1);
    for (let i = desde; i <= hasta; i++) {
      items.push(i);
    }

    if (this.paginaActual < total - 2) {
      items.push('...');
    }
    items.push(total);
    return items;
  }

  estadoStock(producto: ProductoModel): EstadoStock {
    const stock = producto.cantidadStock ?? 0;
    if (stock <= 0) {
      return 'out';
    }
    if (stock <= 10) {
      return 'low';
    }
    return 'available';
  }

  etiquetaStock(producto: ProductoModel): string {
    const estado = this.estadoStock(producto);
    if (estado === 'available') {
      return 'En Stock';
    }
    if (estado === 'low') {
      return 'Bajo stock';
    }
    return 'Agotado';
  }

  setVista(vista: VistaStock): void {
    this.vista = vista;
    this.paginaActual = 1;
  }

  cambiarCategoria(event: Event): void {
    this.categoriaFiltro = (event.target as HTMLSelectElement).value as CategoriaProducto | '';
    this.paginaActual = 1;
  }

  cambiarEstado(event: Event): void {
    this.vista = (event.target as HTMLSelectElement).value as VistaStock;
    this.paginaActual = 1;
  }

  irPagina(pagina: number | '...'): void {
    if (pagina === '...' || pagina < 1 || pagina > this.totalPaginas) {
      return;
    }
    this.paginaActual = pagina;
  }

  borrarBusqueda(): void {
    this.filtro = '';
    this.dataSource.filter = '';
    this.categoriaFiltro = '';
    this.vista = 'all';
    this.paginaActual = 1;
  }

  exportar(): void {
    const filas = [
      ['Nombre', 'Marca', 'Categoría', 'Precio', 'Existencias', 'Estado'],
      ...this.productosVisibles.map(p => [
        p.nombre,
        p.marca,
        p.categoria,
        String(p.precio ?? 0),
        String(p.cantidadStock ?? 0),
        this.etiquetaStock(p)
      ])
    ];

    const csv = filas
      .map(fila => fila.map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'productos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  cargarNombreUsuario(): void {
    const token = this.authService.obtenerToken();
    if (!token) {
      this.userName = 'Usuario';
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      this.userName = decoded.nombreUsuario || decoded.sub || 'Usuario';
    } catch {
      this.userName = 'Usuario';
    }
  }

  cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: (productos) => this.dataSource.data = productos,
      error: () => { /* snackbar opcional */ }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filtro = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue;
    this.paginaActual = 1;
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

  logout(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  private vistaToEstado(vista: VistaStock): EstadoStock {
    if (vista === 'stock') {
      return 'available';
    }
    if (vista === 'low') {
      return 'low';
    }
    return 'out';
  }
}
