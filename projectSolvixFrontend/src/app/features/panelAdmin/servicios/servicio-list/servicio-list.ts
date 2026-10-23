import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  of,
  switchMap
} from 'rxjs';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixMetricCardComponent } from '../../../../shared/components/solvix-metric-card/solvix-metric-card';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { ClienteBuscadorComponent } from '../../cliente/cliente-buscador/cliente-buscador';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import {
  EstadoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { PaginaResponseDTO } from '../../../../core/models/cotizacion-comercial.models';
import {
  AtencionOrdenUi,
  calcularDistribucionAntiguedad,
  calcularPrioridadPorAntiguedad,
  construirColaAtencion,
  DistribucionAntiguedadGrupoUi,
  DistribucionAntiguedadUi,
  equipoResumen,
  ESTADOS_ACTIVOS_TALLER,
  ESTADOS_ORDEN,
  fallaResumen,
  formatFechaOrden,
  iconoPrioridadAntiguedad,
  labelEstadoOrden,
  mapHttpError,
  PrioridadAntiguedadCodigo,
  PrioridadAntiguedadUi,
  toneEstadoOrden
} from '../servicio-ui';

type ListaEstado = 'loading' | 'ready' | 'empty' | 'error';

export const TAMANO_PAGINA_ORDENES = 5;
export const DEBOUNCE_BUSQUEDA_ORDENES_MS = 300;
/** Límite del backend (OrdenServicioService.TAMANO_MAXIMO_PAGINA). */
const TAMANO_OPERATIVAS = 50;
/** Evita cargas infinitas si el taller tiene miles de OT activas. */
const MAX_PAGINAS_POR_ESTADO = 10;

interface ChipEstadoUi {
  id: '' | EstadoOrdenServicio;
  label: string;
  count: number | null;
}

@Component({
  selector: 'app-servicio-list',
  standalone: true,
  templateUrl: './servicio-list.html',
  styleUrl: './servicio-list.scss',
  imports: [
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixMetricCardComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent,
    ClienteBuscadorComponent
  ]
})
export class ServicioListComponent implements OnInit, OnDestroy {
  ordenes: OrdenServicioResponseDTO[] = [];
  state: ListaEstado = 'loading';
  search = '';
  filtroEstado: '' | EstadoOrdenServicio = '';
  filtroCliente: ClienteResponseDTO | null = null;
  filtroPrioridad: '' | PrioridadAntiguedadCodigo = '';
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;
  errorTitle = 'No pudimos cargar las órdenes.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';

  /** Conteos globales por estado (totalElementos de API). */
  conteosPorEstado: Partial<Record<EstadoOrdenServicio, number>> = {};
  totalActivas = 0;
  pendientesAprobacion = 0;
  enReparacion = 0;

  /** Snapshot de órdenes activas para paneles (no inventado). */
  operativas: OrdenServicioResponseDTO[] = [];
  operativasCargando = false;
  operativasTruncadas = false;
  operativasError = false;
  distribucion: DistribucionAntiguedadUi = {
    totalActivas: 0,
    grupos: []
  };
  colaAtencion: AtencionOrdenUi[] = [];

  readonly estados = ESTADOS_ORDEN;
  readonly estadoLabel = labelEstadoOrden;
  readonly estadoTone = toneEstadoOrden;
  readonly fecha = formatFechaOrden;
  readonly equipo = equipoResumen;
  readonly falla = fallaResumen;
  readonly iconoPrioridad = iconoPrioridadAntiguedad;
  readonly prioridades: { id: '' | PrioridadAntiguedadCodigo; label: string }[] = [
    { id: '', label: 'Todas las prioridades' },
    { id: 'MUY_ALTA', label: 'Muy alta (16+ días)' },
    { id: 'ALTA', label: 'Alta (8–15 días)' },
    { id: 'MEDIA', label: 'Media (4–7 días)' },
    { id: 'BAJA', label: 'Baja (0–3 días)' }
  ];

  private readonly busquedas = new Subject<string>();
  private sub?: Subscription;
  private subOperativas?: Subscription;

  constructor(
    private ordenServicioService: OrdenServicioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.busquedas
      .pipe(debounceTime(DEBOUNCE_BUSQUEDA_ORDENES_MS), distinctUntilChanged())
      .subscribe(() => {
        this.pagina = 0;
        this.cargar();
      });
    this.cargar();
    this.cargarOperativasYConteos();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subOperativas?.unsubscribe();
  }

  get hayFiltros(): boolean {
    return Boolean(
      this.search.trim() || this.filtroEstado || this.filtroCliente || this.filtroPrioridad
    );
  }

  get hayAnterior(): boolean {
    return this.pagina > 0;
  }

  get haySiguiente(): boolean {
    return this.pagina + 1 < this.totalPaginas;
  }

  get chipsEstado(): ChipEstadoUi[] {
    const chips: ChipEstadoUi[] = [
      // Sin contador: «Todas» lista también cerradas/entregadas vía API; el KPI «Total en taller» es la cifra activa.
      { id: '', label: 'Todas', count: null },
      {
        id: 'RECEPCIONADO',
        label: 'Recepcionado',
        count: this.conteosPorEstado['RECEPCIONADO'] ?? null
      },
      {
        id: 'EN_DIAGNOSTICO',
        label: 'En diagnóstico',
        count: this.conteosPorEstado['EN_DIAGNOSTICO'] ?? null
      },
      {
        id: 'PENDIENTE_APROBACION',
        label: 'Pendiente aprobación',
        count: this.conteosPorEstado['PENDIENTE_APROBACION'] ?? null
      },
      {
        id: 'EN_REPARACION',
        label: 'En reparación',
        count: this.conteosPorEstado['EN_REPARACION'] ?? null
      },
      {
        id: 'LISTO',
        label: 'Listo',
        count: this.conteosPorEstado['LISTO'] ?? null
      }
    ];
    return chips;
  }

  get kpiPendientesHint(): string {
    if (this.pendientesAprobacion <= 0) {
      return 'Sin órdenes esperando al cliente';
    }
    return 'Esperan respuesta del cliente';
  }

  get kpiReparacionHint(): string {
    if (this.enReparacion <= 0) {
      return 'Ningún equipo en reparación';
    }
    return this.enReparacion === 1 ? '1 equipo en proceso' : `${this.enReparacion} equipos en proceso`;
  }

  prioridad(orden: OrdenServicioResponseDTO): PrioridadAntiguedadUi | null {
    return calcularPrioridadPorAntiguedad(orden.fechaRecepcion, orden.estado);
  }

  cargar(): void {
    this.state = 'loading';
    if (this.filtroPrioridad) {
      this.aplicarTablaDesdeOperativas();
      return;
    }
    this.ordenServicioService
      .listar({
        q: this.search,
        estado: this.filtroEstado || undefined,
        clienteId: this.filtroCliente?.id ?? null,
        pagina: this.pagina,
        tamano: TAMANO_PAGINA_ORDENES
      })
      .subscribe({
        next: pagina => {
          this.ordenes = pagina.contenido;
          this.totalPaginas = pagina.totalPaginas;
          this.totalElementos = pagina.totalElementos;
          this.state = pagina.totalElementos === 0 && !this.hayFiltros ? 'empty' : 'ready';
        },
        error: error => {
          const mapped = mapHttpError(error, 'No pudimos cargar las órdenes.');
          this.errorTitle = mapped.title;
          this.errorMessage = mapped.message;
          this.state = 'error';
        }
      });
  }

  /** Recarga listado + paneles operativos. */
  refrescar(): void {
    this.cargar();
    this.cargarOperativasYConteos();
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
    this.busquedas.next(this.search.trim());
  }

  onEstado(event: Event): void {
    this.filtroEstado = (event.target as HTMLSelectElement).value as '' | EstadoOrdenServicio;
    this.pagina = 0;
    this.cargar();
  }

  seleccionarChipEstado(id: '' | EstadoOrdenServicio): void {
    this.filtroEstado = id;
    this.pagina = 0;
    this.cargar();
  }

  onCliente(cliente: ClienteResponseDTO | null): void {
    this.filtroCliente = cliente;
    this.pagina = 0;
    this.cargar();
  }

  onPrioridad(event: Event): void {
    this.filtroPrioridad = (event.target as HTMLSelectElement).value as
      | ''
      | PrioridadAntiguedadCodigo;
    this.pagina = 0;
    this.cargar();
  }

  filtrarPorGrupoAntiguedad(codigo: PrioridadAntiguedadCodigo): void {
    this.filtroPrioridad = this.filtroPrioridad === codigo ? '' : codigo;
    this.pagina = 0;
    this.cargar();
  }

  verUrgencias(): void {
    this.filtroPrioridad = 'MUY_ALTA';
    this.filtroEstado = '';
    this.pagina = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.search = '';
    this.filtroEstado = '';
    this.filtroCliente = null;
    this.filtroPrioridad = '';
    this.pagina = 0;
    this.busquedas.next('');
    this.cargar();
  }

  irAPagina(delta: number): void {
    const destino = this.pagina + delta;
    if (destino < 0 || destino >= this.totalPaginas) {
      return;
    }
    this.pagina = destino;
    this.cargar();
  }

  nueva(): void {
    this.router.navigate(['/servicios/nueva']);
  }

  abrir(id: number): void {
    this.router.navigate(['/servicios', id]);
  }

  private cargarOperativasYConteos(): void {
    this.operativasCargando = true;
    this.operativasError = false;
    this.subOperativas?.unsubscribe();
    this.subOperativas = forkJoin(
      ESTADOS_ACTIVOS_TALLER.map(estado => this.cargarEstadoActivo(estado))
    ).subscribe({
      next: bloques => {
        const conteos: Partial<Record<EstadoOrdenServicio, number>> = {};
        const items: OrdenServicioResponseDTO[] = [];
        let truncadas = false;
        let total = 0;
        for (const bloque of bloques) {
          conteos[bloque.estado] = bloque.total;
          total += bloque.total;
          items.push(...bloque.items);
          if (bloque.truncado) {
            truncadas = true;
          }
        }
        this.conteosPorEstado = conteos;
        this.totalActivas = total;
        this.pendientesAprobacion =
          (conteos['PENDIENTE_APROBACION'] ?? 0) +
          (conteos['REQUIERE_APROBACION_ADICIONAL'] ?? 0);
        this.enReparacion = conteos['EN_REPARACION'] ?? 0;
        this.operativas = items;
        this.operativasTruncadas = truncadas;
        this.operativasCargando = false;
        this.recalcularPaneles();
        if (this.filtroPrioridad) {
          this.aplicarTablaDesdeOperativas();
        }
      },
      error: () => {
        this.operativasCargando = false;
        this.operativasError = true;
        this.operativas = [];
        this.distribucion = calcularDistribucionAntiguedad([]);
        this.colaAtencion = [];
      }
    });
  }

  private cargarEstadoActivo(estado: EstadoOrdenServicio): Observable<{
    estado: EstadoOrdenServicio;
    total: number;
    items: OrdenServicioResponseDTO[];
    truncado: boolean;
  }> {
    return this.ordenServicioService
      .listar({ estado, pagina: 0, tamano: TAMANO_OPERATIVAS })
      .pipe(
        switchMap(primera => {
          const totalPaginas = Math.min(primera.totalPaginas, MAX_PAGINAS_POR_ESTADO);
          const truncado = primera.totalPaginas > MAX_PAGINAS_POR_ESTADO;
          if (totalPaginas <= 1) {
            return of({
              estado,
              total: primera.totalElementos,
              items: primera.contenido,
              truncado
            });
          }
          const resto: Observable<PaginaResponseDTO<OrdenServicioResponseDTO>>[] = [];
          for (let p = 1; p < totalPaginas; p++) {
            resto.push(
              this.ordenServicioService.listar({
                estado,
                pagina: p,
                tamano: TAMANO_OPERATIVAS
              })
            );
          }
          return forkJoin(resto).pipe(
            map(paginas => ({
              estado,
              total: primera.totalElementos,
              items: [primera, ...paginas].flatMap(pg => pg.contenido),
              truncado
            }))
          );
        })
      );
  }

  private recalcularPaneles(): void {
    this.distribucion = calcularDistribucionAntiguedad(this.operativas);
    this.colaAtencion = construirColaAtencion(this.operativas, 5);
  }

  private aplicarTablaDesdeOperativas(): void {
    if (this.operativasCargando) {
      this.state = 'loading';
      return;
    }
    if (this.operativasError) {
      this.state = 'error';
      this.errorTitle = 'No pudimos calcular la prioridad.';
      this.errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
      return;
    }
    let filtradas = this.operativas.filter(o => {
      const prio = calcularPrioridadPorAntiguedad(o.fechaRecepcion, o.estado);
      if (!prio?.activa || prio.codigo !== this.filtroPrioridad) {
        return false;
      }
      if (this.filtroEstado && o.estado !== this.filtroEstado) {
        return false;
      }
      if (this.filtroCliente && o.clienteId !== this.filtroCliente.id) {
        return false;
      }
      if (this.search.trim()) {
        const q = this.search.trim().toLowerCase();
        const haystack = [
          o.numero,
          o.clienteNombre,
          o.equipoNombre,
          o.equipoMarca,
          o.equipoModelo,
          o.problemaReportado,
          o.diagnostico
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });
    this.totalElementos = filtradas.length;
    this.totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA_ORDENES));
    if (this.pagina >= this.totalPaginas) {
      this.pagina = Math.max(0, this.totalPaginas - 1);
    }
    const inicio = this.pagina * TAMANO_PAGINA_ORDENES;
    this.ordenes = filtradas.slice(inicio, inicio + TAMANO_PAGINA_ORDENES);
    this.state =
      filtradas.length === 0 && !this.hayFiltros
        ? 'empty'
        : filtradas.length === 0
          ? 'ready'
          : 'ready';
  }

  anchoBarra(grupo: DistribucionAntiguedadGrupoUi): string {
    return `${Math.max(grupo.porcentaje, grupo.cantidad > 0 ? 4 : 0)}%`;
  }
}
