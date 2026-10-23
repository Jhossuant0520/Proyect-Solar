import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { ClienteService } from './cliente.service';
import { CotizacionComercialService } from './cotizacion-comercial.service';
import { OrdenServicioService } from './orden-servicio.service';
import { ProductoService } from './producto.service';
import { VentaService } from './venta.service';

export type AdminRecordKind =
  | 'producto'
  | 'cliente'
  | 'servicio'
  | 'venta'
  | 'cotizacion';

export interface AdminRecordHit {
  kind: AdminRecordKind;
  group: string;
  id: number;
  title: string;
  meta: string;
  path: string;
  icon: string;
}

export interface AdminRecordSearchGroup {
  kind: AdminRecordKind;
  label: string;
  icon: string;
  hits: AdminRecordHit[];
}

export interface AdminRecordSearchResult {
  groups: AdminRecordSearchGroup[];
  total: number;
  hasError: boolean;
}

interface SafeHits {
  hits: AdminRecordHit[];
  error: boolean;
}

const LIMIT = 5;

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts
    .map(p => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(' · ');
}

/** Presentación de fecha LocalDate/LocalDateTime (string o [y,m,d,...]). No calcula negocio. */
function formatFechaMeta(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.includes('T') ? value.slice(0, 10) : value.trim();
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return undefined;
}

@Injectable({ providedIn: 'root' })
export class AdminRecordSearchService {
  private readonly auth = inject(AuthService);
  private readonly productos = inject(ProductoService);
  private readonly clientes = inject(ClienteService);
  private readonly ordenes = inject(OrdenServicioService);
  private readonly ventas = inject(VentaService);
  private readonly cotizaciones = inject(CotizacionComercialService);

  /**
   * Fan-out a APIs existentes con `q`. No inventa datos.
   * ADMIN: productos, clientes, OT, ventas, cotizaciones.
   * No ADMIN: solo productos (el resto de rutas admin quedan fuera).
   */
  search(texto: string): Observable<AdminRecordSearchResult> {
    const q = texto.trim();
    if (!q) {
      return of({ groups: [], total: 0, hasError: false });
    }

    const isAdmin = this.auth.esAdmin();

    const safe = <T>(source: Observable<T>, mapFn: (value: T) => AdminRecordHit[]): Observable<SafeHits> =>
      source.pipe(
        map(value => ({ hits: mapFn(value), error: false })),
        catchError(() => of({ hits: [], error: true }))
      );

    const producto$ = safe(this.productos.buscar(q, LIMIT, null), list =>
      (list ?? [])
        .filter((p): p is typeof p & { id: number } => p.id != null)
        .map(p => ({
          kind: 'producto' as const,
          group: 'Productos',
          id: p.id,
          title: p.nombre,
          meta: joinMeta([p.marca, p.codigoBarras, p.categoriaNombre]),
          path: `/productos/${p.id}`,
          icon: 'inventory_2'
        }))
    );

    if (!isAdmin) {
      return producto$.pipe(
        map(bundle => ({
          groups: bundle.hits.length
            ? [{ kind: 'producto' as const, label: 'Productos', icon: 'inventory_2', hits: bundle.hits }]
            : [],
          total: bundle.hits.length,
          hasError: bundle.error
        }))
      );
    }

    const cliente$ = safe(this.clientes.buscar(q, LIMIT, false), list =>
      (list ?? []).map(c => ({
        kind: 'cliente' as const,
        group: 'Clientes',
        id: c.id,
        title: c.nombre,
        meta: joinMeta([c.numeroDocumento, c.telefono, c.email]),
        path: `/clientes/${c.id}`,
        icon: 'group'
      }))
    );

    const servicio$ = safe(this.ordenes.listar({ q, pagina: 0, tamano: LIMIT }), page =>
      (page?.contenido ?? []).map(o => ({
        kind: 'servicio' as const,
        group: 'Servicios',
        id: o.id,
        title: o.numero || `OT #${o.id}`,
        meta: joinMeta([o.clienteNombre, o.estado, o.equipoNombre || o.equipoModelo]),
        path: `/servicios/${o.id}`,
        icon: 'build'
      }))
    );

    const venta$ = safe(this.ventas.listar({ q, pagina: 0, tamano: LIMIT }), page =>
      (page?.contenido ?? []).map(v => ({
        kind: 'venta' as const,
        group: 'Ventas',
        id: v.id,
        title: v.numero || `Venta #${v.id}`,
        meta: joinMeta([v.clienteNombre, v.estado, formatFechaMeta(v.fecha)]),
        path: `/ventas/${v.id}`,
        icon: 'payments'
      }))
    );

    const cotizacion$ = safe(this.cotizaciones.listar({ q, pagina: 0, tamano: LIMIT }), page =>
      (page?.contenido ?? []).map(c => ({
        kind: 'cotizacion' as const,
        group: 'Cotizaciones',
        id: c.id,
        title: c.numero || `Cotización #${c.id}`,
        meta: joinMeta([c.clienteNombre, c.estado, c.fecha]),
        path: `/cotizaciones/${c.id}`,
        icon: 'request_quote'
      }))
    );

    return forkJoin({
      producto: producto$,
      cliente: cliente$,
      servicio: servicio$,
      venta: venta$,
      cotizacion: cotizacion$
    }).pipe(
      map(bundle => {
        const defs: AdminRecordSearchGroup[] = [
          { kind: 'producto', label: 'Productos', icon: 'inventory_2', hits: bundle.producto.hits },
          { kind: 'cliente', label: 'Clientes', icon: 'group', hits: bundle.cliente.hits },
          { kind: 'servicio', label: 'Servicios', icon: 'build', hits: bundle.servicio.hits },
          { kind: 'venta', label: 'Ventas', icon: 'payments', hits: bundle.venta.hits },
          { kind: 'cotizacion', label: 'Cotizaciones', icon: 'request_quote', hits: bundle.cotizacion.hits }
        ];
        const groups = defs.filter(g => g.hits.length > 0);
        const hasError =
          bundle.producto.error ||
          bundle.cliente.error ||
          bundle.servicio.error ||
          bundle.venta.error ||
          bundle.cotizacion.error;
        return {
          groups,
          total: groups.reduce((n, g) => n + g.hits.length, 0),
          hasError
        };
      })
    );
  }
}
