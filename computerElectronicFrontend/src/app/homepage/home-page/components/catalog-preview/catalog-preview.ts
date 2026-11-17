import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';
import { CatalogoProducto } from '../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { resolverUrlMedia } from '../../../../core/utils/media-url';
import { formatMoney } from '../../../../features/panelAdmin/dashboard/utils/dashboard-format';
import { prefersReducedMotion } from '../../../../shared/utils/count-up';
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
export class CatalogPreview implements OnInit, OnDestroy {
  @ViewChild('catalogSection', { static: true })
  private readonly catalogSection!: ElementRef<HTMLElement>;

  private readonly catalogoService = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  viewState: PreviewState = 'LOADING';
  products: CatalogoProducto[] = [];
  private readonly imagenesRotas = new Set<number>();

  /** Solo true si IO está disponible (contenido visible por defecto). */
  motionEnabled = false;
  revealed = false;

  private observer: IntersectionObserver | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;

  constructor() {
    afterNextRender(() => {
      this.setupReveal();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.clearSafetyTimer();
    this.disconnectObserver();
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

  private setupReveal(): void {
    if (this.motionEnabled || this.revealed) {
      return;
    }
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const el = this.catalogSection?.nativeElement;
    if (!el) {
      return;
    }

    try {
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting) || this.revealed) {
            return;
          }
          this.zone.run(() => this.markRevealed());
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      this.motionEnabled = true;
      // Evitar detectChanges() en AfterViewInit (NG0100 en dev → failOpen).
      this.cdr.markForCheck();
      this.observer.observe(el);
      this.safetyTimer = setTimeout(() => {
        if (this.motionEnabled && !this.revealed) {
          this.zone.run(() => this.failOpen());
        }
      }, 8000);
    } catch {
      // No forzar failOpen en errores de CD; dejar contenido visible (motionEnabled sigue false).
      this.disconnectObserver();
    }
  }

  private markRevealed(): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  /** Quita el estado oculto sin fingir animación (contenido usable). */
  private failOpen(): void {
    this.motionEnabled = false;
    this.revealed = false;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
