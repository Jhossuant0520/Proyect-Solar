import { DashboardMetricVista } from '../dashboard/models/dashboard.models';
import { mapKpis } from '../dashboard/utils/dashboard-mapper';
import { DashboardResumenDTO } from '../../../core/models/analytics.models';
import { DetalleVentaResponseDTO, VentaResponseDTO } from '../../../core/models/venta.models';

const KPI_ORDEN = [
  'ventasNetas',
  'pedidos',
  'ticketPromedio',
  'gananciaBruta',
  'margenBruto'
];

/** Reordena KPIs ya calculados por Analytics. No recalcula. */
export function mapKpisVentas(dto: DashboardResumenDTO): DashboardMetricVista[] {
  const mapped = mapKpis(dto);
  return KPI_ORDEN
    .map(id => mapped.find(item => item.id === id))
    .filter((item): item is DashboardMetricVista => item != null);
}

export function resumenProductos(detalles: DetalleVentaResponseDTO[] | null | undefined): string {
  if (!detalles?.length) {
    return 'Sin productos';
  }
  const primero = detalles[0].productoNombre;
  if (detalles.length === 1) {
    return `${primero} (×${detalles[0].cantidad})`;
  }
  return `${primero} +${detalles.length - 1} más`;
}

export function clienteVisible(venta: VentaResponseDTO): string {
  if (venta.clienteConsumidorFinal) {
    return venta.clienteNombre || 'Consumidor final';
  }
  return venta.clienteNombre || 'Sin cliente';
}
