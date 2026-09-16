import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CatalogoCategoria, CatalogoProducto } from '../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { formatMoney } from '../../../../features/panelAdmin/dashboard/utils/dashboard-format';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { resolverUrlMedia } from '../../../../core/utils/media-url';
import {
  filtrarProductosCatalogo,
  labelDisponibilidad,
  tonoDisponibilidad
} from './catalogo-ui';

type CatalogoViewState = 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SolvixBadgeComponent],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss'
})
export class Catalog implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  viewState: CatalogoViewState = 'LOADING';
  productos: CatalogoProducto[] = [];
  categorias: CatalogoCategoria[] = [];
  categoriaSeleccionadaId: number | null = null;
  busqueda = '';
  imagenesRotas = new Set<number>();

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;
  readonly tonoDisponibilidad = tonoDisponibilidad;

  constructor(private catalogoService: CatalogoService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
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
        },
        error: () => {
          this.productos = [];
          this.categorias = [];
          this.viewState = 'ERROR';
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
}
