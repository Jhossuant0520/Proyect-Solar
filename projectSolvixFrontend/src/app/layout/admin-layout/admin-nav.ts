export interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', adminOnly: false },
  { label: 'Productos', path: '/productos', icon: 'inventory_2', adminOnly: true },
  { label: 'Ventas', path: '/ventas', icon: 'payments', adminOnly: true },
  { label: 'Compras', path: '/compras', icon: 'shopping_cart', adminOnly: true },
  { label: 'Clientes', path: '/clientes', icon: 'group', adminOnly: true },
  { label: 'Servicios', path: '/servicios', icon: 'build', adminOnly: true },
  { label: 'Proveedores', path: '/proveedores', icon: 'local_shipping', adminOnly: true },
  { label: 'Inventario', path: '/inventario', icon: 'warehouse', adminOnly: true },
  { label: 'Reportes', path: '/reportes', icon: 'analytics', adminOnly: true }
];
