export interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'GENERAL',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', adminOnly: false }
    ]
  },
  {
    label: 'VENTAS Y SERVICIOS',
    items: [
      { label: 'Clientes', path: '/clientes', icon: 'group', adminOnly: true },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: 'request_quote', adminOnly: true },
      { label: 'Servicios', path: '/servicios', icon: 'build', adminOnly: true },
      { label: 'Ventas', path: '/ventas', icon: 'payments', adminOnly: true }
    ]
  },
  {
    label: 'ABASTECIMIENTO Y FINANZAS',
    items: [
      { label: 'Proveedores', path: '/proveedores', icon: 'local_shipping', adminOnly: true },
      { label: 'Compras', path: '/compras', icon: 'shopping_cart', adminOnly: true },
      { label: 'Cuentas por pagar', path: '/cxp', icon: 'account_balance_wallet', adminOnly: true }
    ]
  },
  {
    label: 'BODEGA',
    items: [
      { label: 'Productos', path: '/productos', icon: 'inventory_2', adminOnly: true },
      { label: 'Inventario', path: '/inventario', icon: 'warehouse', adminOnly: true }
    ]
  },
  {
    label: 'ANÁLISIS',
    items: [
      { label: 'Reportes', path: '/reportes', icon: 'analytics', adminOnly: true }
    ]
  }
];
