import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
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
  labelDisponibilidad,
  subirPaginaAlInicio
} from './catalogo-ui';

type CatalogoViewState = 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss'
})
export class Catalog implements OnInit, AfterViewInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly catalogoService = inject(CatalogoService);

  viewState: CatalogoViewState = 'LOADING';
  productos: CatalogoProducto[] = [];
  categorias: CatalogoCategoria[] = [];
  categoriaSeleccionadaId: number | null = null;
  busqueda = '';
  imagenesRotas = new Set<number>();

  /** Entrada de la página: una sola vez al cargar. No se repite al filtrar. */
  entrando = false;

  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Selector de categorías (listbox ligero, sin dependencias). */
  categoriaMenuAbierto = false;
  /** Índice activo en las opciones: 0 = «Todas», i+1 = categorias[i]. */
  categoriaIndiceActivo = 0;

  @ViewChild('categoriaTrigger') private categoriaTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('categoriaListbox') private categoriaListbox?: ElementRef<HTMLUListElement>;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;

  ngOnInit(): void {
    subirPaginaAlInicio();
    this.cargar();
  }

  ngAfterViewInit(): void {
    subirPaginaAlInicio();
    // El navegador aplica el scroll heredado después del primer pintado.
    setTimeout(() => subirPaginaAlInicio());
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

  get categoriaSeleccionada(): CatalogoCategoria | null {
    if (this.categoriaSeleccionadaId == null) {
      return null;
    }
    return this.categorias.find(c => c.id === this.categoriaSeleccionadaId) ?? null;
  }

  get etiquetaCategoria(): string {
    return this.categoriaSeleccionada?.nombre ?? 'Todas las categorías';
  }

  get tieneBusqueda(): boolean {
    return this.busqueda.trim().length > 0;
  }

  get filtrosActivos(): boolean {
    return this.tieneBusqueda || this.categoriaSeleccionadaId != null;
  }

  get totalOpcionesCategoria(): number {
    return this.categorias.length + 1;
  }

  /** Número de productos por categoría (sobre el catálogo completo). */
  conteoCategoria(id: number | null): number {
    if (id == null) {
      return this.productos.length;
    }
    return this.productos.filter(p => p.categoriaId === id).length;
  }

  opcionId(index: number): string {
    return `catalog-cat-opt-${index}`;
  }

  cargar(): void {
    this.clearSafetyTimer();
    this.entrando = false;
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
          if (this.viewState === 'SUCCESS' && !prefersReducedMotion()) {
            this.entrando = true;
          }
          this.cdr.detectChanges();
          subirPaginaAlInicio();
          if (this.entrando) {
            this.programarFinEntrada();
          }
        },
        error: () => {
          this.productos = [];
          this.categorias = [];
          this.viewState = 'ERROR';
          this.entrando = false;
        }
      });
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionadaId = id;
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.searchInput?.nativeElement.focus();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaSeleccionadaId = null;
    this.cerrarMenuCategoria(false);
  }

  /* ---------- Selector de categorías ---------- */

  toggleMenuCategoria(): void {
    if (this.categoriaMenuAbierto) {
      this.cerrarMenuCategoria(true);
    } else {
      this.abrirMenuCategoria();
    }
  }

  abrirMenuCategoria(indice?: number): void {
    this.categoriaMenuAbierto = true;
    this.categoriaIndiceActivo = indice ?? this.indiceSeleccionado();
    this.cdr.detectChanges();
    this.categoriaListbox?.nativeElement.focus();
    this.scrollOpcionActiva();
  }

  cerrarMenuCategoria(devolverFoco: boolean): void {
    if (!this.categoriaMenuAbierto) {
      return;
    }
    this.categoriaMenuAbierto = false;
    if (devolverFoco) {
      this.categoriaTrigger?.nativeElement.focus();
    }
  }

  elegirOpcion(index: number): void {
    const id = index === 0 ? null : this.categorias[index - 1]?.id ?? null;
    this.seleccionarCategoria(id);
    this.cerrarMenuCategoria(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.abrirMenuCategoria();
        break;
    }
  }

  onListboxKeydown(event: KeyboardEvent): void {
    const ultimo = this.totalOpcionesCategoria - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moverActivo(Math.min(this.categoriaIndiceActivo + 1, ultimo));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moverActivo(Math.max(this.categoriaIndiceActivo - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.moverActivo(0);
        break;
      case 'End':
        event.preventDefault();
        this.moverActivo(ultimo);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.elegirOpcion(this.categoriaIndiceActivo);
        break;
      case 'Escape':
        event.preventDefault();
        this.cerrarMenuCategoria(true);
        break;
      case 'Tab':
        this.cerrarMenuCategoria(false);
        break;
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: Event): void {
    if (!this.categoriaMenuAbierto) {
      return;
    }
    const select = (this.host.nativeElement as HTMLElement).querySelector('.cat-select');
    if (select && !select.contains(event.target as Node)) {
      this.cerrarMenuCategoria(false);
    }
  }

  private indiceSeleccionado(): number {
    if (this.categoriaSeleccionadaId == null) {
      return 0;
    }
    const i = this.categorias.findIndex(c => c.id === this.categoriaSeleccionadaId);
    return i >= 0 ? i + 1 : 0;
  }

  private moverActivo(index: number): void {
    this.categoriaIndiceActivo = index;
    this.cdr.detectChanges();
    this.scrollOpcionActiva();
  }

  /** Mueve solo el menú. `scrollIntoView` también desplaza la página. */
  private scrollOpcionActiva(): void {
    const menu = this.categoriaListbox?.nativeElement;
    const el = menu?.querySelector<HTMLElement>(`#${this.opcionId(this.categoriaIndiceActivo)}`);
    if (!menu || !el) {
      return;
    }
    const menuRect = menu.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < menuRect.top) {
      menu.scrollTop -= menuRect.top - elRect.top;
    } else if (elRect.bottom > menuRect.bottom) {
      menu.scrollTop += elRect.bottom - menuRect.bottom;
    }
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

  /** Quita la clase al terminar para que buscar no vuelva a animar las tarjetas. */
  private programarFinEntrada(): void {
    this.clearSafetyTimer();
    this.safetyTimer = setTimeout(() => {
      this.entrando = false;
      this.safetyTimer = null;
      this.cdr.markForCheck();
    }, 760);
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
