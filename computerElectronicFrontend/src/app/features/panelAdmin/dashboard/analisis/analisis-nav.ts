import { AdminNavGroup } from '../../../../layout/admin-layout/admin-nav';

/** Navegación secundaria solo bajo `/dashboard/analisis`. No forma parte de ADMIN_NAV. */
export const DASHBOARD_ANALISIS_NAV: AdminNavGroup[] = [
  {
    label: 'ANÁLISIS',
    items: [
      { label: 'Volver al resumen', path: '/dashboard', icon: 'arrow_back', adminOnly: false, exact: true },
      { label: 'Resumen de análisis', path: '/dashboard/analisis', icon: 'grid_view', adminOnly: true, exact: true },
      { label: 'Evolución comercial', path: '/dashboard/analisis/evolucion', icon: 'show_chart', adminOnly: true, exact: true },
      { label: 'Categorías', path: '/dashboard/analisis/categorias', icon: 'category', adminOnly: true, exact: true },
      { label: 'Productos', path: '/dashboard/analisis/productos', icon: 'inventory_2', adminOnly: true, exact: true },
      { label: 'Inventario', path: '/dashboard/analisis/inventario', icon: 'warehouse', adminOnly: true, exact: true },
      { label: 'Análisis ABC', path: '/dashboard/analisis/abc', icon: 'pie_chart', adminOnly: true, exact: true },
      { label: 'Abastecimiento', path: '/dashboard/analisis/abastecimiento', icon: 'local_shipping', adminOnly: true, exact: true }
    ]
  }
];
