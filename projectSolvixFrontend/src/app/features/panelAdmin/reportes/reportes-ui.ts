import { Agrupacion } from '../../../core/models/reportes.models';
import { periodoInicial, rangoDePreset } from '../dashboard/utils/dashboard-period';
import { PeriodoFiltro, PeriodoPreset } from '../dashboard/models/dashboard.models';

export const AGRUPACIONES_REPORTE: { id: Agrupacion; label: string }[] = [
  { id: 'DIA', label: 'Día' },
  { id: 'SEMANA', label: 'Semana' },
  { id: 'MES', label: 'Mes' },
  { id: 'ANIO', label: 'Año' }
];

export function periodoReporteInicial(): PeriodoFiltro {
  return periodoInicial();
}

export function aplicarPreset(preset: PeriodoPreset, actual: PeriodoFiltro): PeriodoFiltro {
  if (preset === 'personalizado') {
    return { ...actual, preset };
  }
  return { preset, ...rangoDePreset(preset) };
}

export const REPORTES_HUB_CARDS = [
  {
    id: 'ventas',
    path: '/reportes/ventas',
    icon: 'point_of_sale',
    title: 'Ventas',
    subtitle: 'KPIs, evolución temporal y exportación CSV del período.'
  },
  {
    id: 'compras',
    path: '/reportes/compras',
    icon: 'shopping_cart',
    title: 'Compras',
    subtitle: 'Gasto por proveedor, productos comprados y totales del documento.'
  },
  {
    id: 'inventario',
    path: '/reportes/inventario',
    icon: 'inventory_2',
    title: 'Inventario',
    subtitle: 'Salud de stock, rotación, sell-through y clasificación ABC.'
  }
] as const;
