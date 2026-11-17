import { formatMoney } from '../dashboard/utils/dashboard-format';
import { asIsoDateTime, productoCoincideBusqueda } from '../producto/producto-ui';
import {
  DireccionMovimiento,
  ReferenciaMovimiento,
  TipoAjusteUnidades,
  TipoMovimientoInventario
} from '../../../core/models/inventario.models';

/** El endpoint de movimientos no pagina ni garantiza orden. Solo presentamos los más recientes. */
export const MOVIMIENTOS_RECIENTES_LIMITE = 10;

export const COSTO_HISTORICO_NO_DISPONIBLE = 'Costo histórico no disponible';

export const MENSAJE_VALUACION_HISTORICA_INCOMPLETA =
  'No hay información histórica suficiente para valorar este período.';

export const TIPOS_MOVIMIENTO: { id: TipoMovimientoInventario; label: string }[] = [
  { id: 'COMPRA', label: 'Compra' },
  { id: 'VENTA', label: 'Venta' },
  { id: 'DEVOLUCION_VENTA', label: 'Devolución de venta' },
  { id: 'DEVOLUCION_COMPRA', label: 'Devolución de compra' },
  { id: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada' },
  { id: 'AJUSTE_SALIDA', label: 'Ajuste de salida' },
  { id: 'MERMA', label: 'Merma' },
  { id: 'CARGA_INICIAL', label: 'Carga inicial' }
];

export const TIPOS_AJUSTE_UNIDADES: { id: TipoAjusteUnidades; label: string; direccion: DireccionMovimiento }[] = [
  { id: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada', direccion: 'ENTRADA' },
  { id: 'AJUSTE_SALIDA', label: 'Ajuste de salida', direccion: 'SALIDA' },
  { id: 'MERMA', label: 'Merma', direccion: 'SALIDA' }
];

export type EstadoStockVisual = 'normal' | 'critico' | 'agotado' | 'sin_umbral';

export interface ProductoInventarioVista {
  activo?: boolean;
  stockActual?: number | null;
  costoActual?: number | null;
  costoConocido?: boolean;
  nombre?: string;
  marca?: string;
  id?: number;
  codigoBarras?: string | null;
  categoriaNombre?: string | null;
  categoriaCodigo?: string | null;
}

/**
 * Mismo predicado que COUNT de stock crítico: producto activo y stockActual <= umbral.
 * El umbral lo entrega InventarioKpiDTO. No hay mínimo por producto.
 */
export function coincideUmbralStockCritico(
  producto: ProductoInventarioVista,
  umbral: number | null | undefined
): boolean {
  if (umbral == null || producto.activo !== true || producto.stockActual == null) {
    return false;
  }
  return producto.stockActual <= umbral;
}

/**
 * Agotado es el dato stockActual === 0. Crítico usa el umbral del KPI.
 * Sin umbral no se declara "normal": el backend no clasificó ese producto.
 */
export function estadoStockVisual(
  stockActual: number | null | undefined,
  umbral: number | null | undefined
): EstadoStockVisual {
  if (stockActual === 0) {
    return 'agotado';
  }
  if (umbral == null || stockActual == null) {
    return 'sin_umbral';
  }
  if (stockActual <= umbral) {
    return 'critico';
  }
  return 'normal';
}

export function labelEstadoStock(estado: EstadoStockVisual): string {
  switch (estado) {
    case 'agotado':
      return 'Agotado';
    case 'critico':
      return 'Stock crítico';
    case 'normal':
      return 'Normal';
    default:
      return 'Sin clasificar';
  }
}

export function tonoEstadoStock(estado: EstadoStockVisual): 'success' | 'warning' | 'error' | 'neutral' {
  switch (estado) {
    case 'agotado':
      return 'error';
    case 'critico':
      return 'warning';
    case 'normal':
      return 'success';
    default:
      return 'neutral';
  }
}

export function costoDesconocido(producto: ProductoInventarioVista): boolean {
  return producto.costoConocido !== true;
}

/**
 * Presentación de stock × costo actual de un producto.
 * No es el KPI oficial valorInventario.
 * null significa costo desconocido, no cero.
 */
export function valorSegunCostoActual(producto: ProductoInventarioVista): number | null {
  if (producto.costoConocido !== true || producto.costoActual == null || producto.stockActual == null) {
    return null;
  }
  return producto.stockActual * producto.costoActual;
}

/** Nunca sustituye un costo histórico nulo por el costo actual. */
export function labelCostoHistorico(costoProductoResultante: number | null | undefined): string {
  if (costoProductoResultante == null) {
    return COSTO_HISTORICO_NO_DISPONIBLE;
  }
  return formatMoney(costoProductoResultante);
}

export function signoDireccion(direccion: string | null | undefined): string {
  return direccion === 'ENTRADA' ? '+' : '−';
}

export function labelReferencia(tipo: string | null | undefined): string {
  switch (tipo as ReferenciaMovimiento | null) {
    case 'VENTA':
      return 'Venta';
    case 'COMPRA':
      return 'Compra';
    case 'DEVOLUCION_VENTA':
      return 'Devolución de venta';
    case 'DEVOLUCION_COMPRA':
      return 'Devolución de compra';
    case 'AJUSTE_MANUAL':
      return 'Ajuste manual';
    case 'CARGA_INICIAL':
      return 'Carga inicial';
    default:
      return tipo ?? 'Sin referencia';
  }
}

/**
 * Solo enlaza cuando referenciaId es el id de la ruta existente.
 * Devolución no tiene ruta por su propio id.
 */
export function rutaReferencia(
  tipo: string | null | undefined,
  referenciaId: number | null | undefined
): string[] | null {
  if (referenciaId == null) {
    return null;
  }
  if (tipo === 'COMPRA') {
    return ['/compras', String(referenciaId)];
  }
  if (tipo === 'VENTA') {
    return ['/ventas', String(referenciaId)];
  }
  return null;
}

export function inventarioCoincideBusqueda(producto: ProductoInventarioVista, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (producto.nombre != null && producto.marca != null && productoCoincideBusqueda({
    id: producto.id,
    nombre: producto.nombre,
    marca: producto.marca,
    codigoBarras: producto.codigoBarras
  }, query)) {
    return true;
  }
  return (producto.categoriaNombre ?? '').toLowerCase().includes(q)
    || (producto.categoriaCodigo ?? '').toLowerCase().includes(q)
    || (producto.nombre ?? '').toLowerCase().includes(q)
    || (producto.marca ?? '').toLowerCase().includes(q);
}

export function ordenarPorFechaDesc<T extends { fecha: string | number[] | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => asIsoDateTime(b.fecha).localeCompare(asIsoDateTime(a.fecha)));
}

export function valuacionHistoricaIncompleta(kpi: {
  estadoTurnover?: string;
  productosSinValuacionHistorica?: number;
} | null): boolean {
  if (!kpi) {
    return false;
  }
  return kpi.estadoTurnover === 'COSTO_INCOMPLETO' || (kpi.productosSinValuacionHistorica ?? 0) > 0;
}
