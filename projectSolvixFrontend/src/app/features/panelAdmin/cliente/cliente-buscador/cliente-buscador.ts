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
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { documentoVisible, esConsumidorFinal } from '../cliente-ui';
import {
  SOLVIX_DEBOUNCE_BUSQUEDA_MS,
  SOLVIX_MIN_CARACTERES_BUSQUEDA,
  SOLVIX_PREVIEW_LIMITE
} from '../../../../shared/utils/solvix-busqueda';

export const MIN_CARACTERES_BUSQUEDA_CLIENTE = SOLVIX_MIN_CARACTERES_BUSQUEDA;
export const DEBOUNCE_BUSQUEDA_CLIENTE_MS = SOLVIX_DEBOUNCE_BUSQUEDA_MS;
export const PREVIEW_LIMITE_CLIENTE = SOLVIX_PREVIEW_LIMITE;

type EstadoBusqueda = 'idle' | 'preview' | 'buscando' | 'resultados' | 'vacio' | 'error';

/**
 * Selector de cliente (D.3): preview ≤5 sin q textual; búsqueda desde 2 caracteres.
 * GET /v1/clientes?limite= (preview) / ?q=&limite= (search).
 */
@Component({
  selector: 'app-cliente-buscador',
  standalone: true,
  templateUrl: './cliente-buscador.html',
  styleUrl: './cliente-buscador.scss'
})
export class ClienteBuscadorComponent implements OnInit, OnDestroy {
  @Input() limite = 8;
  @Input() seleccionado: ClienteResponseDTO | null = null;
  @Input() etiquetaSinCliente = 'Consumidor final';
  @Input() placeholder = 'Buscar cliente por nombre, documento, teléfono o correo';
  @Input() mostrarHintSinSeleccion = true;
  /** Etiqueta del bloque preview (orden por nombre en API; no “recientes”). */
  @Input() etiquetaPreview = 'Disponibles';

  @Output() readonly seleccionadoChange = new EventEmitter<ClienteResponseDTO | null>();

  texto = '';
  resultados: ClienteResponseDTO[] = [];
  estado: EstadoBusqueda = 'idle';
  indiceActivo = -1;

  readonly minCaracteres = MIN_CARACTERES_BUSQUEDA_CLIENTE;
  readonly previewLimite = PREVIEW_LIMITE_CLIENTE;
  readonly documento = documentoVisible;

  private readonly consultas = new Subject<string>();
  private sub?: Subscription;
  private previewCache: ClienteResponseDTO[] | null = null;
  private previewSub?: Subscription;

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.sub = this.consultas
      .pipe(
        map(t => t.trim()),
        debounceTime(DEBOUNCE_BUSQUEDA_CLIENTE_MS),
        distinctUntilChanged(),
        tap(t => {
          if (t.length < MIN_CARACTERES_BUSQUEDA_CLIENTE) {
            return;
          }
          this.estado = 'buscando';
        }),
        switchMap(t =>
          t.length < MIN_CARACTERES_BUSQUEDA_CLIENTE
            ? of(null)
            : this.clienteService.buscar(t, this.limite).pipe(catchError(() => of(undefined)))
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
        this.resultados = lista.filter(c => !esConsumidorFinal(c));
        this.indiceActivo = this.resultados.length ? 0 : -1;
        this.estado = this.resultados.length ? 'resultados' : 'vacio';
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.previewSub?.unsubscribe();
  }

  get tieneCliente(): boolean {
    return this.seleccionado != null && !esConsumidorFinal(this.seleccionado);
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
    if (this.texto.trim().length < MIN_CARACTERES_BUSQUEDA_CLIENTE) {
      this.mostrarPreview();
    }
  }

  onInput(event: Event): void {
    this.texto = (event.target as HTMLInputElement).value;
    const t = this.texto.trim();
    if (t.length < MIN_CARACTERES_BUSQUEDA_CLIENTE) {
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

  elegir(cliente: ClienteResponseDTO): void {
    this.seleccionado = cliente;
    this.texto = '';
    this.resultados = [];
    this.indiceActivo = -1;
    this.estado = 'idle';
    this.consultas.next('');
    this.seleccionadoChange.emit(cliente);
  }

  quitar(): void {
    this.seleccionado = null;
    this.seleccionadoChange.emit(null);
    this.previewCache = null;
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
    this.previewSub = this.clienteService.buscar('', this.previewLimite).pipe(
      catchError(() => of(undefined))
    ).subscribe(lista => {
      if (lista === undefined) {
        this.resultados = [];
        this.indiceActivo = -1;
        this.estado = 'error';
        return;
      }
      this.previewCache = lista.filter(c => !esConsumidorFinal(c)).slice(0, this.previewLimite);
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
