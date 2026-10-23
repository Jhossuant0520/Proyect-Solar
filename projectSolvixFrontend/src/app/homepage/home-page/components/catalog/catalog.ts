import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CatalogoCategoria, CatalogoProducto } from '../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { formatMoney } from '../../../../features/panelAdmin/dashboard/utils/dashboard-format';
import { resolverUrlMedia } from '../../../../core/utils/media-url';
import { prefersReducedMotion } from '../../../../shared/utils/count-up';
import {
  filtrarProductosCatalogo,
  labelDisponibilidad
} from './catalogo-ui';

type CatalogoViewState = 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss'
})
export class Catalog implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly catalogoService = inject(CatalogoService);

  viewState: CatalogoViewState = 'LOADING';
  productos: CatalogoProducto[] = [];
  categorias: CatalogoCategoria[] = [];
  categoriaSeleccionadaId: number | null = null;
  busqueda = '';
  imagenesRotas = new Set<number>();

  /** Enter de cards: visible por defecto; motion solo tras SUCCESS + no-PRM. */
  motionEnabled = false;
  revealed = false;

  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.clearSafetyTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get productosFiltrados(): CatalogoProducto[] {
    return filtrarProductosCatalogo(this.productos, {
      categoriaId: this.categoriaSeleccionadaId,
      query: this.busqueda
    });
  }

  get mostrarVacioFiltro(): boolean {
    return this.viewState === 'SUCCESS'
      && this.productos.length > 0
      && this.productosFiltrados.length === 0;
  }

  cargar(): void {
    this.clearSafetyTimer();
    this.motionEnabled = false;
    this.revealed = false;
    this.viewState = 'LOADING';
    this.imagenesRotas.clear();

    forkJoin({
      productos: this.catalogoService.listarProductos(),
      categorias: this.catalogoService.listarCategorias()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ productos, categorias }) => {
          this.productos = productos;
          this.categorias = categorias;
          this.viewState = productos.length === 0 ? 'EMPTY' : 'SUCCESS';
          this.cdr.detectChanges();
          if (this.viewState === 'SUCCESS') {
            this.setupReveal();
          }
        },
        error: () => {
          this.productos = [];
          this.categorias = [];
          this.viewState = 'ERROR';
          this.motionEnabled = false;
          this.revealed = false;
        }
      });
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionadaId = id;
  }

  onImagenError(productoId: number): void {
    this.imagenesRotas.add(productoId);
  }

  imagenDisponible(producto: CatalogoProducto): boolean {
    return Boolean(resolverUrlMedia(producto.imagenUrl)) && !this.imagenesRotas.has(producto.id);
  }

  urlImagen(producto: CatalogoProducto): string | null {
    return resolverUrlMedia(producto.imagenUrl);
  }

  /**
   * En /Catalogo la página ya está en viewport.
   * Animamos al llegar SUCCESS (stagger), no al scroll.
   */
  private setupReveal(): void {
    if (prefersReducedMotion()) {
      return;
    }

    try {
      this.motionEnabled = true;
      this.revealed = false;
      this.cdr.markForCheck();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.zone.run(() => this.markRevealed());
        });
      });

      this.safetyTimer = setTimeout(() => {
        if (this.motionEnabled && !this.revealed) {
          this.zone.run(() => this.failOpen());
        }
      }, 2000);
    } catch {
      this.failOpen();
    }
  }

  private markRevealed(): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
  }

  private failOpen(): void {
    this.motionEnabled = false;
    this.revealed = false;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
