import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../shared/components/solvix-badge/solvix-badge';
import { SolvixEmptyStateComponent } from '../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixPageHeaderComponent } from '../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../shared/components/solvix-section-header/solvix-section-header';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { CategoriaProductoService } from '../../../core/services/categoria-producto.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { ProductoService } from '../../../core/services/producto.service';
import { InventarioKpiDTO } from '../../../core/models/analytics.models';
import {
  AjusteCostoResponseDTO,
  MovimientoInventarioResponseDTO,
  TipoMovimientoInventario
} from '../../../core/models/inventario.models';
import { formatMoney, formatMetricValue, labelEstadoMetrica, notaEstadoMetrica } from '../dashboard/utils/dashboard-format';
import { periodoInicial, toQueryDesde, toQueryHasta } from '../dashboard/utils/dashboard-period';
import { CategoriaProductoModel, ProductoModel } from '../producto/productoClase';
import { AjusteCostoDialogComponent } from '../producto/ajuste-costo-dialog/ajuste-costo-dialog';
import { formatFechaCorta, labelCodigoBarras, labelMotivoAjuste, labelTipoMovimiento } from '../producto/producto-ui';
import { mensajeErrorLookupCodigoBarras, resolverProductoPorCodigoBarras } from '../producto/producto-barcode-lookup';
import { AjusteUnidadesDialogComponent } from './ajuste-unidades-dialog/ajuste-unidades-dialog';
import {
  MOVIMIENTOS_RECIENTES_LIMITE,
  MENSAJE_VALUACION_HISTORICA_INCOMPLETA,
  TIPOS_MOVIMIENTO,
  coincideUmbralStockCritico,
  costoDesconocido,
  estadoStockVisual,
  inventarioCoincideBusqueda,
  labelCostoHistorico,
  labelEstadoStock,
  labelReferencia,
  ordenarPorFechaDesc,
  rutaReferencia,
  signoDireccion,
  tonoEstadoStock,
  valorSegunCostoActual,
  valuacionHistoricaIncompleta
} from './inventario-ui';

type SeccionEstado = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-inventario',
  standalone: true,
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
  imports: [
    RouterLink,
    MatDialogModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixSectionHeaderComponent,
    SolvixBadgeComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class InventarioComponent implements OnInit {
  productos: ProductoModel[] = [];
  categorias: CategoriaProductoModel[] = [];
  movimientos: MovimientoInventarioResponseDTO[] = [];
  ajustes: AjusteCostoResponseDTO[] = [];
  inventario: InventarioKpiDTO | null = null;

  catalogoState: SeccionEstado = 'loading';
  kpiState: SeccionEstado = 'loading';
  movimientosState: SeccionEstado = 'loading';
  ajustesState: SeccionEstado = 'loading';

  searchNombre = '';
  filtroMarca = '';
  filtroCategoriaId: number | null = null;
  filtroActivo: '' | 'true' | 'false' = '';
  filtroTipo: TipoMovimientoInventario | '' = '';
  productoIdFiltro: number | null = null;

  readonly tiposMovimiento = TIPOS_MOVIMIENTO;
  readonly money = formatMoney;
  readonly fecha = formatFechaCorta;
  readonly tipoMovimiento = labelTipoMovimiento;
  readonly motivo = labelMotivoAjuste;
  readonly codigo = labelCodigoBarras;
  readonly estadoStock = estadoStockVisual;
  readonly labelEstado = labelEstadoStock;
  readonly tonoEstado = tonoEstadoStock;
  readonly costoDesconocido = costoDesconocido;
  readonly valorLinea = valorSegunCostoActual;
  readonly costoHistorico = labelCostoHistorico;
  readonly signo = signoDireccion;
  readonly referencia = labelReferencia;
  readonly rutaReferencia = rutaReferencia;
  readonly mensajeHistorico = MENSAJE_VALUACION_HISTORICA_INCOMPLETA;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private productoService: ProductoService,
    private categoriaService: CategoriaProductoService,
    private analytics: AnalyticsService,
    private inventarioService: InventarioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.categoriaService.listar(false).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: categorias => this.categorias = categorias
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const raw = params.get('productoId');
      const id = raw != null && raw !== '' ? Number(raw) : null;
      this.productoIdFiltro = id != null && Number.isFinite(id) ? id : null;
      this.cargarMovimientos();
      this.cargarAjustes();
    });
    this.cargarProductos();
    this.cargarIndicadores();
  }

  get marcas(): string[] {
    return [...new Set(this.productos.map(item => item.marca).filter(Boolean))].sort();
  }

  get visibles(): ProductoModel[] {
    return this.productos.filter(producto => this.pasaFiltros(producto));
  }

  get criticos(): ProductoModel[] {
    const umbral = this.inventario?.umbralStockCritico;
    return this.productos.filter(producto => coincideUmbralStockCritico(producto, umbral));
  }

  get productoEnConsulta(): ProductoModel | undefined {
    if (this.productoIdFiltro == null) {
      return undefined;
    }
    return this.productos.find(producto => producto.id === this.productoIdFiltro);
  }

  get movimientosVisibles(): MovimientoInventarioResponseDTO[] {
    if (this.productoIdFiltro != null || this.filtroTipo) {
      return this.movimientos;
    }
    return this.movimientos.slice(0, MOVIMIENTOS_RECIENTES_LIMITE);
  }

  get ajustesVisibles(): AjusteCostoResponseDTO[] {
    if (this.productoIdFiltro != null) {
      return this.ajustes;
    }
    return this.ajustes.slice(0, MOVIMIENTOS_RECIENTES_LIMITE);
  }

  get hayFiltrosCatalogo(): boolean {
    return Boolean(
      this.searchNombre.trim()
      || this.filtroMarca
      || this.filtroCategoriaId != null
      || this.filtroActivo
    );
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

  historicoIncompleto(): boolean {
    return valuacionHistoricaIncompleta(this.inventario);
  }

  umbralTexto(): string {
    if (!this.inventario) {
      return '';
    }
    return `Umbral actual: ${this.inventario.umbralStockCritico} unidades o menos.`;
  }

  cargarProductos(): void {
    this.catalogoState = 'loading';
    this.productoService.listar().subscribe({
      next: productos => {
        this.productos = productos;
        this.catalogoState = productos.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.catalogoState = 'error';
      }
    });
  }

  cargarIndicadores(): void {
    this.kpiState = 'loading';
    const periodo = periodoInicial();
    this.analytics.inventario(toQueryDesde(periodo.desde), toQueryHasta(periodo.hasta)).subscribe({
      next: dto => {
        this.inventario = dto;
        this.kpiState = 'ready';
      },
      error: () => {
        this.inventario = null;
        this.kpiState = 'error';
      }
    });
  }

  cargarMovimientos(): void {
    this.movimientosState = 'loading';
    this.inventarioService.listarMovimientos({
      productoId: this.productoIdFiltro ?? undefined,
      tipo: this.filtroTipo || undefined
    }).subscribe({
      next: items => {
        this.movimientos = ordenarPorFechaDesc(items);
        this.movimientosState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.movimientosState = 'error';
      }
    });
  }

  cargarAjustes(): void {
    this.ajustesState = 'loading';
    this.inventarioService.listarAjustesCosto(this.productoIdFiltro ?? undefined).subscribe({
      next: items => {
        this.ajustes = ordenarPorFechaDesc(items);
        this.ajustesState = items.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.ajustesState = 'error';
      }
    });
  }

  onSearch(event: Event): void {
    this.searchNombre = (event.target as HTMLInputElement).value;
  }

  onBarcodeEnter(event: Event): void {
    event.preventDefault();
    const codigo = this.searchNombre;
    if (!codigo.trim()) {
      return;
    }
    resolverProductoPorCodigoBarras(this.productoService, this.productos, codigo).subscribe({
      next: producto => {
        this.searchNombre = producto.codigoBarras ?? codigo.trim();
        this.filtroMarca = '';
        this.filtroCategoriaId = null;
        this.filtroActivo = '';
      },
      error: err => {
        this.snackBar.open(mensajeErrorLookupCodigoBarras(err, 'No pudimos buscar ese código.'), 'Cerrar', {
          duration: 3500
        });
      }
    });
  }

  onMarca(event: Event): void {
    this.filtroMarca = (event.target as HTMLSelectElement).value;
  }

  onCategoria(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroCategoriaId = value ? Number(value) : null;
  }

  onEstadoCatalogo(event: Event): void {
    this.filtroActivo = (event.target as HTMLSelectElement).value as '' | 'true' | 'false';
  }

  onTipoMovimiento(event: Event): void {
    this.filtroTipo = (event.target as HTMLSelectElement).value as TipoMovimientoInventario | '';
    this.cargarMovimientos();
  }

  limpiarFiltros(): void {
    this.searchNombre = '';
    this.filtroMarca = '';
    this.filtroCategoriaId = null;
    this.filtroActivo = '';
  }

  verProducto(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    this.router.navigate(['/productos', producto.id]);
  }

  verMovimientos(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productoId: producto.id },
      queryParamsHandling: 'merge'
    });
  }

  limpiarConsultaProducto(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productoId: null },
      queryParamsHandling: 'merge'
    });
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
        this.cargarIndicadores();
        this.cargarAjustes();
      }
    });
  }

  ajustarUnidades(producto: ProductoModel): void {
    if (producto.id == null) {
      return;
    }
    const ref = this.dialog.open(AjusteUnidadesDialogComponent, {
      data: {
        productoId: producto.id,
        nombre: producto.nombre,
        stockActual: producto.stockActual ?? 0
      },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.snackBar.open('Ajuste registrado. El stock ya quedó actualizado.', 'Cerrar', { duration: 3500 });
        this.cargarProductos();
        this.cargarIndicadores();
        this.cargarMovimientos();
      }
    });
  }

  private pasaFiltros(producto: ProductoModel): boolean {
    if (this.filtroMarca && producto.marca !== this.filtroMarca) {
      return false;
    }
    if (this.filtroCategoriaId != null && producto.categoriaId !== this.filtroCategoriaId) {
      return false;
    }
    if (this.filtroActivo === 'true' && producto.activo !== true) {
      return false;
    }
    if (this.filtroActivo === 'false' && producto.activo !== false) {
      return false;
    }
    return inventarioCoincideBusqueda(producto, this.searchNombre);
  }
}
