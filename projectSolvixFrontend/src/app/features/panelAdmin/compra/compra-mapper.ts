import { CompraAnalyticsDTO } from '../../../core/models/analytics.models';
import { CompraResponseDTO, DetalleCompraResponseDTO } from '../../../core/models/compra.models';
import { labelEstadoMetrica } from '../dashboard/utils/dashboard-format';

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
