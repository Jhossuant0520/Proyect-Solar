import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProductoModel } from '../productoClase';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import {
  SOLVIX_DEBOUNCE_BUSQUEDA_MS,
  SOLVIX_MIN_CARACTERES_BUSQUEDA,
  SOLVIX_PREVIEW_LIMITE
} from '../../../../shared/utils/solvix-busqueda';

export const MIN_CARACTERES_BUSQUEDA = SOLVIX_MIN_CARACTERES_BUSQUEDA;
export const DEBOUNCE_BUSQUEDA_MS = SOLVIX_DEBOUNCE_BUSQUEDA_MS;
export const PREVIEW_LIMITE_PRODUCTO = SOLVIX_PREVIEW_LIMITE;

type EstadoBusqueda = 'idle' | 'preview' | 'buscando' | 'resultados' | 'vacio' | 'error';

/**
 * Selector de producto (D.3): preview ≤5 sin q; búsqueda desde 2 caracteres.
 * Conserva ✓ Agregado vía idsAgregados (D.1).
 */
@Component({
  selector: 'app-producto-buscador',
  standalone: true,
  templateUrl: './producto-buscador.html',
  styleUrl: './producto-buscador.scss'
})
export class ProductoBuscadorComponent implements OnInit, OnDestroy {
  @Input() limite = 10;
  @Input() permitirCrear = true;
  @Input() placeholder = 'Buscar producto por nombre, marca o código';
  @Input() idsAgregados: readonly number[] | Set<number> = [];
  @Input() etiquetaPreview = 'Productos disponibles';

  @Output() readonly seleccionado = new EventEmitter<ProductoModel>();
  @Output() readonly crearSolicitado = new EventEmitter<string>();
  @Output() readonly yaAgregado = new EventEmitter<ProductoModel>();

  texto = '';
  resultados: ProductoModel[] = [];
  estado: EstadoBusqueda = 'idle';
  indiceActivo = -1;

  readonly money = formatMoney;
  readonly minCaracteres = MIN_CARACTERES_BUSQUEDA;
  readonly previewLimite = PREVIEW_LIMITE_PRODUCTO;

  private readonly consultas = new Subject<string>();
  private sub?: Subscription;
  private previewCache: ProductoModel[] | null = null;
  private previewSub?: Subscription;

  constructor(private productoService: ProductoService) {}

  ngOnInit(): void {
    this.sub = this.consultas
      .pipe(
        map(t => t.trim()),
        debounceTime(DEBOUNCE_BUSQUEDA_MS),
        distinctUntilChanged(),
        tap(t => {
          if (t.length < MIN_CARACTERES_BUSQUEDA) {
            return;
          }
          this.estado = 'buscando';
        }),
        switchMap(t =>
          t.length < MIN_CARACTERES_BUSQUEDA
            ? of(null)
            : this.productoService.buscar(t, this.limite).pipe(catchError(() => of(undefined)))
        )
      )
      .subscribe(lista => {
        if (lista === null) {
          return;
        }
        if (lista === undefined) {
          this.resultados = [];
          this.indiceActivo = -1;
          this.estado = 'error';
          return;
        }
        this.resultados = lista;
        this.indiceActivo = lista.length ? 0 : -1;
        this.estado = lista.length ? 'resultados' : 'vacio';
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.previewSub?.unsubscribe();
  }

  get alcanzoLimite(): boolean {
    return this.estado === 'preview'
      ? this.resultados.length >= this.previewLimite
      : this.resultados.length >= this.limite;
  }

  get listaAbierta(): boolean {
    return this.estado === 'preview' || this.estado === 'resultados';
  }

  onFocus(): void {
    if (this.texto.trim().length < MIN_CARACTERES_BUSQUEDA) {
      this.mostrarPreview();
    }
  }

  onInput(event: Event): void {
    this.texto = (event.target as HTMLInputElement).value;
    const t = this.texto.trim();
    if (t.length < MIN_CARACTERES_BUSQUEDA) {
      this.consultas.next(t);
      this.mostrarPreview();
      return;
    }
    this.consultas.next(this.texto);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.listaAbierta || this.resultados.length === 0) {
      if (event.key === 'Escape') {
        this.resetAIdle();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.indiceActivo = (this.indiceActivo + 1) % this.resultados.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.indiceActivo =
          this.indiceActivo <= 0 ? this.resultados.length - 1 : this.indiceActivo - 1;
        break;
      case 'Enter':
        event.preventDefault();
        if (this.indiceActivo >= 0 && this.indiceActivo < this.resultados.length) {
          this.elegir(this.resultados[this.indiceActivo]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.resetAIdle();
        break;
    }
  }

  elegir(producto: ProductoModel): void {
    if (this.esAgregado(producto)) {
      this.yaAgregado.emit(producto);
      return;
    }
    this.seleccionado.emit(producto);
  }

  esAgregado(producto: ProductoModel): boolean {
    if (producto.id == null) {
      return false;
    }
    const ids = this.idsAgregados;
    if (ids instanceof Set) {
      return ids.has(producto.id);
    }
    return ids.includes(producto.id);
  }

  crear(): void {
    this.crearSolicitado.emit(this.texto.trim());
  }

  private mostrarPreview(): void {
    if (this.previewCache) {
      this.resultados = this.previewCache;
      this.indiceActivo = this.resultados.length ? 0 : -1;
      this.estado = this.resultados.length ? 'preview' : 'idle';
      return;
    }
    if (this.estado === 'buscando' && this.previewSub && !this.previewSub.closed) {
      return;
    }
    this.estado = 'buscando';
    this.previewSub?.unsubscribe();
    this.previewSub = this.productoService.buscar('', this.previewLimite).pipe(
      catchError(() => of(undefined))
    ).subscribe(lista => {
      if (lista === undefined) {
        this.resultados = [];
        this.indiceActivo = -1;
        this.estado = 'error';
        return;
      }
      this.previewCache = lista.slice(0, this.previewLimite);
      this.resultados = this.previewCache;
      this.indiceActivo = this.resultados.length ? 0 : -1;
      this.estado = this.resultados.length ? 'preview' : 'idle';
    });
  }

  private resetAIdle(): void {
    this.texto = '';
    this.resultados = [];
    this.indiceActivo = -1;
    this.estado = 'idle';
    this.consultas.next('');
  }
}
