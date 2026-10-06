import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';
import { CatalogoProducto } from '../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { resolverUrlMedia } from '../../../../core/utils/media-url';
import { formatMoney } from '../../../../features/panelAdmin/dashboard/utils/dashboard-format';
import { labelDisponibilidad, tieneImagen } from '../catalog/catalogo-ui';

type PreviewState = 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

const PREVIEW_LIMIT = 4;

/** DISPONIBLE → prioriza imagen → máximo 4. No inventa productos. */
export function seleccionarProductosPreview(productos: CatalogoProducto[]): CatalogoProducto[] {
  const disponibles = productos.filter(p => p.disponibilidad === 'DISPONIBLE');
  const conImagen = disponibles.filter(tieneImagen);
  const sinImagen = disponibles.filter(p => !tieneImagen(p));
  return [...conImagen, ...sinImagen].slice(0, PREVIEW_LIMIT);
}

@Component({
  selector: 'app-catalog-preview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './catalog-preview.html',
  styleUrl: './catalog-preview.scss'
})
export class CatalogPreview implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  viewState: PreviewState = 'LOADING';
  products: CatalogoProducto[] = [];
  private readonly imagenesRotas = new Set<number>();

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.viewState = 'LOADING';
    this.imagenesRotas.clear();

    this.catalogoService
      .listarProductos()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: productos => {
          this.products = seleccionarProductosPreview(productos);
          this.viewState = this.products.length === 0 ? 'EMPTY' : 'SUCCESS';
        },
        error: () => {
          this.products = [];
          this.viewState = 'ERROR';
        }
      });
  }

  urlImagen(producto: CatalogoProducto): string | null {
    return resolverUrlMedia(producto.imagenUrl);
  }

  imagenDisponible(producto: CatalogoProducto): boolean {
    return Boolean(this.urlImagen(producto)) && !this.imagenesRotas.has(producto.id);
  }

  onImagenError(productoId: number): void {
    this.imagenesRotas.add(productoId);
  }

  badge(producto: CatalogoProducto): string {
    return producto.categoriaNombre?.trim() || producto.marca;
  }
}
