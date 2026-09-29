import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
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
import { EquipoService } from '../../../../core/services/equipo.service';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';
import { equipoOpcionLabel, labelTipoEquipo } from '../../servicios/servicio-ui';
import {
  SOLVIX_DEBOUNCE_BUSQUEDA_MS,
  SOLVIX_MIN_CARACTERES_BUSQUEDA,
  SOLVIX_PREVIEW_LIMITE
} from '../../../../shared/utils/solvix-busqueda';

export const MIN_CARACTERES_BUSQUEDA_EQUIPO = SOLVIX_MIN_CARACTERES_BUSQUEDA;
export const DEBOUNCE_BUSQUEDA_EQUIPO_MS = SOLVIX_DEBOUNCE_BUSQUEDA_MS;
export const PREVIEW_LIMITE_EQUIPO = SOLVIX_PREVIEW_LIMITE;

type EstadoBusqueda =
  | 'idle'
  | 'preview'
  | 'buscando'
  | 'resultados'
  | 'vacio'
  | 'error'
  | 'sin-cliente';

/**
 * Selector de equipo (D.3): preview ≤5 (orden fechaRegistro DESC → “Últimos registros”);
 * búsqueda textual desde 2 caracteres. Requiere cliente en alta de OT.
 */
@Component({
  selector: 'app-equipo-buscador',
  standalone: true,
  templateUrl: './equipo-buscador.html',
  styleUrl: './equipo-buscador.scss'
})
export class EquipoBuscadorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() clienteId: number | null = null;
  @Input() limite = 10;
  @Input() seleccionado: EquipoResponseDTO | null = null;
  @Input() requiereCliente = true;
  @Input() placeholder = 'Buscar equipo por marca, modelo, serie o referencia';
  @Input() etiquetaPreview = 'Últimos registros';

  @Output() readonly seleccionadoChange = new EventEmitter<EquipoResponseDTO | null>();

  texto = '';
  resultados: EquipoResponseDTO[] = [];
  estado: EstadoBusqueda = 'sin-cliente';
  indiceActivo = -1;

  readonly minCaracteres = MIN_CARACTERES_BUSQUEDA_EQUIPO;
  readonly previewLimite = PREVIEW_LIMITE_EQUIPO;
  readonly labelEquipo = equipoOpcionLabel;
  readonly labelTipo = labelTipoEquipo;

  private readonly consultas = new Subject<string>();
  private sub?: Subscription;
  private previewCache: EquipoResponseDTO[] | null = null;
  private previewCacheClienteId: number | null | undefined;
  private previewSub?: Subscription;

  constructor(private equipoService: EquipoService) {}

  ngOnInit(): void {
    this.sub = this.consultas
      .pipe(
        map(t => t.trim()),
        debounceTime(DEBOUNCE_BUSQUEDA_EQUIPO_MS),
        distinctUntilChanged(),
        tap(t => {
          if (this.requiereCliente && this.clienteId == null) {
            this.resultados = [];
            this.indiceActivo = -1;
            this.estado = 'sin-cliente';
            return;
          }
          if (t.length < MIN_CARACTERES_BUSQUEDA_EQUIPO) {
            return;
          }
          this.estado = 'buscando';
        }),
        switchMap(t => {
          if (this.requiereCliente && this.clienteId == null) {
            return of(null);
          }
          if (t.length < MIN_CARACTERES_BUSQUEDA_EQUIPO) {
            return of(null);
          }
          return this.equipoService
            .buscar(t, this.limite, this.clienteId, true)
            .pipe(catchError(() => of(undefined)));
        })
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
    this.sincronizarEstadoInicial();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteId'] && !changes['clienteId'].firstChange) {
      this.texto = '';
      this.resultados = [];
      this.indiceActivo = -1;
      this.previewCache = null;
      this.previewCacheClienteId = undefined;
      if (this.seleccionado && this.seleccionado.clienteId !== this.clienteId) {
        this.seleccionado = null;
        this.seleccionadoChange.emit(null);
      }
      this.consultas.next('');
      this.sincronizarEstadoInicial();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.previewSub?.unsubscribe();
  }

  get tieneEquipo(): boolean {
    return this.seleccionado != null;
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
    if (this.requiereCliente && this.clienteId == null) {
      this.estado = 'sin-cliente';
      return;
    }
    if (this.texto.trim().length < MIN_CARACTERES_BUSQUEDA_EQUIPO) {
      this.mostrarPreview();
    }
  }

  onInput(event: Event): void {
    this.texto = (event.target as HTMLInputElement).value;
    const t = this.texto.trim();
    if (this.requiereCliente && this.clienteId == null) {
      this.estado = 'sin-cliente';
      return;
    }
    if (t.length < MIN_CARACTERES_BUSQUEDA_EQUIPO) {
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

  elegir(equipo: EquipoResponseDTO): void {
    this.seleccionado = equipo;
    this.texto = '';
    this.resultados = [];
    this.indiceActivo = -1;
    this.estado = this.clienteId == null && this.requiereCliente ? 'sin-cliente' : 'idle';
    this.consultas.next('');
    this.seleccionadoChange.emit(equipo);
  }

  quitar(): void {
    this.seleccionado = null;
    this.seleccionadoChange.emit(null);
    this.previewCache = null;
    this.previewCacheClienteId = undefined;
    this.sincronizarEstadoInicial();
  }

  private mostrarPreview(): void {
    if (this.requiereCliente && this.clienteId == null) {
      this.estado = 'sin-cliente';
      return;
    }
    if (this.previewCache && this.previewCacheClienteId === this.clienteId) {
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
    this.previewSub = this.equipoService
      .buscar('', this.previewLimite, this.clienteId, true)
      .pipe(catchError(() => of(undefined)))
      .subscribe(lista => {
        if (lista === undefined) {
          this.resultados = [];
          this.indiceActivo = -1;
          this.estado = 'error';
          return;
        }
        this.previewCache = lista.slice(0, this.previewLimite);
        this.previewCacheClienteId = this.clienteId;
        this.resultados = this.previewCache;
        this.indiceActivo = this.resultados.length ? 0 : -1;
        this.estado = this.resultados.length ? 'preview' : 'idle';
      });
  }

  private sincronizarEstadoInicial(): void {
    if (this.requiereCliente && this.clienteId == null) {
      this.estado = 'sin-cliente';
    } else if (!this.tieneEquipo) {
      this.estado = 'idle';
    }
  }

  private resetAIdle(): void {
    this.texto = '';
    this.resultados = [];
    this.indiceActivo = -1;
    this.estado = this.requiereCliente && this.clienteId == null ? 'sin-cliente' : 'idle';
    this.consultas.next('');
  }
}
