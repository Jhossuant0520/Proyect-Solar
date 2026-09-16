import {
  CompraAnalyticsDTO,
  ProveedorGastoDTO,
  VentasSerieDTO
} from '../../../core/models/analytics.models';
import { CompraResponseDTO, DetalleCompraResponseDTO } from '../../../core/models/compra.models';
import { labelEstadoMetrica } from '../dashboard/utils/dashboard-format';
import { toNumber } from '../dashboard/utils/dashboard-mapper';

export type CompraSerieMetrica = 'compras' | 'devoluciones' | 'comprasNetas';

export interface CompraKpiVista {
  id: string;
  label: string;
  hint: string;
  help?: string;
  value: number | null;
  formato: 'money' | 'quantity';
  icon: string;
  estado: CompraAnalyticsDTO['estado'];
}

/** Punto de serie ya calculado por Analytics. Campos reutilizan VentasSerieDTO. */
export interface CompraSeriePunto {
  fecha: string;
  etiqueta: string;
  compras: number;
  devoluciones: number;
  comprasNetas: number;
  ordenes: number;
}

/** Fila de gasto por proveedor tal como la entrega el backend (orden preservado). */
export interface ProveedorGastoVista {
  proveedorId: number;
  nombre: string;
  comprasBrutas: number | null;
  devoluciones: number | null;
  comprasNetas: number | null;
  ordenes: number;
  participacion: number | null;
}

/** Presenta campos ya calculados por Analytics. No recalcula ni cuenta proveedores. */
export function mapKpisCompras(dto: CompraAnalyticsDTO): CompraKpiVista[] {
  return [
    {
      id: 'comprasNetas',
      label: 'Compras netas',
      hint: 'Dinero comprado después de descontar devoluciones a proveedores.',
      help: 'Es el total de tus compras menos las devoluciones a proveedores en el período.',
      value: dto.comprasNetas,
      formato: 'money',
      icon: 'account_balance_wallet',
      estado: dto.estado
    },
    {
      id: 'comprasBrutas',
      label: 'Compras del período',
      hint: 'Importe de las compras realizadas, sin restar devoluciones.',
      help: 'Suma el valor de las compras registradas en el período.',
      value: dto.comprasBrutas,
      formato: 'money',
      icon: 'shopping_cart',
      estado: dto.estado
    },
    {
      id: 'devolucionesCompra',
      label: 'Devoluciones a proveedores',
      hint: 'Dinero devuelto a proveedores en el período.',
      help: 'Suma el importe de las devoluciones de compra registradas.',
      value: dto.devolucionesCompra,
      formato: 'money',
      icon: 'assignment_return',
      estado: dto.estado
    },
    {
      id: 'ordenes',
      label: 'Órdenes',
      hint: 'Compras válidas realizadas en el período.',
      help: 'Cuenta las órdenes de compra consideradas para estas métricas.',
      value: dto.ordenes,
      formato: 'quantity',
      icon: 'receipt_long',
      estado: dto.estado
    }
  ];
}

export function resumenProductosCompra(
  detalles: DetalleCompraResponseDTO[] | null | undefined
): string {
  if (!detalles?.length) {
    return 'Sin productos';
  }
  const primero = detalles[0].productoNombre;
  if (detalles.length === 1) {
    return `${primero} (×${detalles[0].cantidad})`;
  }
  return `${primero} +${detalles.length - 1} más`;
}

export function proveedorVisible(compra: CompraResponseDTO): string {
  return compra.proveedorNombre || 'Sin proveedor';
}

/** Presenta cantidad - cantidadDevuelta del DTO. No pide un campo extra al backend. */
export function cantidadPendienteDevolucion(detalle: DetalleCompraResponseDTO): number {
  return Math.max(0, (detalle.cantidad ?? 0) - (detalle.cantidadDevuelta ?? 0));
}

export function labelEstadoAnalytics(estado: CompraAnalyticsDTO['estado']): string {
  return labelEstadoMetrica(estado);
}

/**
 * Mapea la serie de compras.
 * Backend reutiliza VentasSerieDTO: ventas=compras brutas, ventasNetas=compras netas, pedidos=órdenes.
 * No recalcula ni reagrupa.
 */
export function mapSerieCompras(serie: VentasSerieDTO[] | null | undefined): CompraSeriePunto[] {
  return (serie ?? []).map(punto => ({
    fecha: asIsoDate(punto.fecha),
    etiqueta: punto.etiqueta || asIsoDate(punto.fecha),
    compras: toNumber(punto.ventas) ?? 0,
    devoluciones: toNumber(punto.devoluciones) ?? 0,
    comprasNetas: toNumber(punto.ventasNetas) ?? 0,
    ordenes: punto.pedidos ?? 0
  }));
}

/** Preserva el orden del backend (compras netas descendente). */
export function mapGastoPorProveedor(
  items: ProveedorGastoDTO[] | null | undefined
): ProveedorGastoVista[] {
  return (items ?? []).map(item => ({
    proveedorId: item.proveedorId,
    nombre: item.nombre || 'Sin proveedor',
    comprasBrutas: toNumber(item.comprasBrutas),
    devoluciones: toNumber(item.devoluciones),
    comprasNetas: toNumber(item.comprasNetas),
    ordenes: item.ordenes ?? 0,
    participacion: toNumber(item.participacion)
  }));
}

function asIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}
