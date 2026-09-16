import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { CategoriaProductoService } from '../../../../core/services/categoria-producto.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { InventarioKpiDTO } from '../../../../core/models/analytics.models';
import { CategoriaProductoModel, ProductoFiltros, ProductoModel } from '../productoClase';
import { formatMoney, formatMetricValue, labelEstadoMetrica, notaEstadoMetrica } from '../../dashboard/utils/dashboard-format';
import { periodoInicial, toQueryDesde, toQueryHasta } from '../../dashboard/utils/dashboard-period';
import { AjusteCostoDialogComponent } from '../ajuste-costo-dialog/ajuste-costo-dialog';
import { productoCoincideBusqueda } from '../producto-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-producto-list',
  standalone: true,
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent,
    MatDialogModule
  ]
})
export class ProductoList implements OnInit {
  productos: ProductoModel[] = [];
  categorias: CategoriaProductoModel[] = [];
  marcas: string[] = [];
  state: ListaEstado = 'loading';
  searchNombre = '';
  filtroMarca = '';
  filtroCategoriaId: number | null = null;
  filtroActivo: '' | 'true' | 'false' = '';
  inventario: InventarioKpiDTO | null = null;

  readonly money = formatMoney;

  constructor(
    private productoService: ProductoService,
    private categoriaService: CategoriaProductoService,
    private analytics: AnalyticsService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.categoriaService.listar(false).subscribe({
      next: categorias => this.categorias = categorias
    });
    this.cargarProductos();
    this.cargarIndicadoresInventario();
  }

  get visibles(): ProductoModel[] {
    const query = this.searchNombre.trim();
    if (!query) {
      return this.productos;
    }
    return this.productos.filter(producto => productoCoincideBusqueda(producto, query));
  }

  get activosCount(): number {
    return this.productos.filter(producto => producto.activo).length;
  }

  get hayFiltros(): boolean {
    return Boolean(this.searchNombre.trim() || this.filtroMarca || this.filtroCategoriaId != null || this.filtroActivo);
  }

  cargarProductos(): void {
    this.state = 'loading';
    this.productoService.listar(this.filtrosApi()).subscribe({
      next: productos => {
        this.productos = productos;
        if (!this.filtroMarca) {
          this.marcas = [...new Set(productos.map(item => item.marca).filter(Boolean))].sort();
        }
        this.state = productos.length === 0 && !this.hayFiltros ? 'empty' : 'ready';
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  cargarIndicadoresInventario(): void {
    const periodo = periodoInicial();
    this.analytics.inventario(toQueryDesde(periodo.desde), toQueryHasta(periodo.hasta)).subscribe({
      next: dto => this.inventario = dto,
      error: () => {
        this.inventario = null;
      }
    });
  }

  onSearch(event: Event): void {
    this.searchNombre = (event.target as HTMLInputElement).value;
    if (this.productos.length === 0 && !this.hayFiltros) {
      this.state = 'empty';
    } else {
      this.state = 'ready';
    }
  }

  onMarca(event: Event): void {
    this.filtroMarca = (event.target as HTMLSelectElement).value;
    this.cargarProductos();
  }

  onCategoria(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroCategoriaId = value ? Number(value) : null;
    this.cargarProductos();
  }

  onEstado(event: Event): void {
    this.filtroActivo = (event.target as HTMLSelectElement).value as '' | 'true' | 'false';
    this.cargarProductos();
  }

  limpiarFiltros(): void {
    this.searchNombre = '';
    this.filtroMarca = '';
    this.filtroCategoriaId = null;
    this.filtroActivo = '';
    this.cargarProductos();
  }

  nuevoProducto(): void {
    this.router.navigate(['/productos/nuevo']);
  }

  verProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    this.router.navigate(['/productos', producto.id]);
  }

  editarProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    this.router.navigate(['/productos', producto.id, 'editar']);
  }

  ajustarCosto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    const ref = this.dialog.open(AjusteCostoDialogComponent, {
      data: {
        productoId: producto.id,
        nombre: producto.nombre,
        costoActual: producto.costoActual ?? null,
        costoConocido: producto.costoConocido === true,
        stockActual: producto.stockActual ?? 0
      },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.cargarProductos();
        this.cargarIndicadoresInventario();
      }
    });
  }

  desactivarProducto(id: number | undefined): void {
    if (id == null) {
      return;
    }
    const dialogRef = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Desactivar este producto del catálogo?' },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.productoService.desactivar(id).subscribe({
          next: actualizado => {
            this.productos = this.productos.map(item => item.id === id ? actualizado : item);
          }
        });
      }
    });
  }

  costoTexto(producto: ProductoModel): string {
    return producto.costoConocido ? this.money(producto.costoActual) : 'Sin costo';
  }

  valorInventarioTexto(): string {
    if (!this.inventario) {
      return '—';
    }
    if (this.inventario.estadoValorInventario === 'COSTO_INCOMPLETO' && this.inventario.valorInventario == null) {
      return labelEstadoMetrica(this.inventario.estadoValorInventario);
    }
    return formatMetricValue(this.inventario.valorInventario, 'money', true);
  }

  valorInventarioIncompleto(): boolean {
    return this.inventario?.estadoValorInventario === 'COSTO_INCOMPLETO'
      && this.inventario.valorInventario == null;
  }

  valorInventarioNota(): string {
    if (!this.inventario) {
      return '';
    }
    return notaEstadoMetrica(this.inventario.estadoValorInventario);
  }

  private filtrosApi(): ProductoFiltros {
    const filtros: ProductoFiltros = {};
    if (this.filtroMarca) {
      filtros.marca = this.filtroMarca;
    }
    if (this.filtroCategoriaId != null) {
      filtros.categoriaId = this.filtroCategoriaId;
    }
    if (this.filtroActivo === 'true') {
      filtros.activo = true;
    }
    if (this.filtroActivo === 'false') {
      filtros.activo = false;
    }
    return filtros;
  }
}
