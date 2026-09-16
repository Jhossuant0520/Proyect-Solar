import { Routes } from '@angular/router';
import { HomePage } from './homepage/home-page/home-page';
import { LoginComponent } from './features/access/login/login';
import { Register } from './features/access/register/register';
import { VerificarEmail } from './features/access/verificar-email/verificar-email';
import { SolicitarReenvio } from './features/access/solicitar-reenvio/solicitar-reenvio';
import { DashboardComponent } from './features/panelAdmin/dashboard/dashboard';
import { MiCuenta } from './features/access/mi-cuenta/mi-cuenta';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { Catalog } from './homepage/home-page/components/catalog/catalog';
import { CatalogDetail } from './homepage/home-page/components/catalog/catalog-detail/catalog-detail';
import { ProductoComponent } from './features/panelAdmin/producto/producto';
import { ProductoList } from './features/panelAdmin/producto/producto-list/producto-list';
import { ModulDemandaRecibo } from './features/business/modul-demanda-recibo/modul-demanda-recibo';
import { ModulHsp } from './features/business/modul-hsp/modul-hsp';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';
import { ProductoDetailComponent } from './features/panelAdmin/producto/producto-detail/producto-detail';
import { VentaListComponent } from './features/panelAdmin/venta/venta-list/venta-list';
import { VentaFormComponent } from './features/panelAdmin/venta/venta-form/venta-form';
import { VentaDetailComponent } from './features/panelAdmin/venta/venta-detail/venta-detail';
import { VentaDevolucionFormComponent } from './features/panelAdmin/venta/venta-devolucion-form/venta-devolucion-form';
import { VentaDevolucionDetailComponent } from './features/panelAdmin/venta/venta-devolucion-detail/venta-devolucion-detail';
import { CompraListComponent } from './features/panelAdmin/compra/compra-list/compra-list';
import { CompraFormComponent } from './features/panelAdmin/compra/compra-form/compra-form';
import { CompraDetailComponent } from './features/panelAdmin/compra/compra-detail/compra-detail';
import { CompraDevolucionFormComponent } from './features/panelAdmin/compra/compra-devolucion-form/compra-devolucion-form';
import { CompraDevolucionDetailComponent } from './features/panelAdmin/compra/compra-devolucion-detail/compra-devolucion-detail';
import { InventarioComponent } from './features/panelAdmin/inventario/inventario';
import { ClienteListComponent } from './features/panelAdmin/cliente/cliente-list/cliente-list';
import { ClienteFormComponent } from './features/panelAdmin/cliente/cliente-form/cliente-form';
import { ClienteDetailComponent } from './features/panelAdmin/cliente/cliente-detail/cliente-detail';
import { ServicioListComponent } from './features/panelAdmin/servicios/servicio-list/servicio-list';
import { ServicioFormComponent } from './features/panelAdmin/servicios/servicio-form/servicio-form';
import { ServicioDetailComponent } from './features/panelAdmin/servicios/servicio-detail/servicio-detail';

const comingSoon = (
  path: string,
  titulo: string,
  descripcion: string
): NonNullable<Routes[number]['children']>[number] => ({
  path,
  loadComponent: () =>
    import('./features/admin/coming-soon/coming-soon').then(m => m.ComingSoonPage),
  canActivate: [adminGuard],
  data: { titulo, descripcion }
});

const moduloPendiente =
  'Este módulo ya tiene ruta. La pantalla y los datos se conectan más adelante.';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'Catalogo', component: Catalog },
  { path: 'Catalogo/:id', component: CatalogDetail },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: Register },
  { path: 'verificar-email/:token', component: VerificarEmail },
  { path: 'solicitar-reenvio', component: SolicitarReenvio },
  { path: 'demanda-recibo', component: ModulDemandaRecibo },
  { path: 'hsp', component: ModulHsp },

  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'mi-cuenta', component: MiCuenta },

      { path: 'productos', component: ProductoList, canActivate: [adminGuard] },
      { path: 'productos/nuevo', component: ProductoComponent, canActivate: [adminGuard] },
      { path: 'productos/:id/editar', component: ProductoComponent, canActivate: [adminGuard] },
      { path: 'productos/:id', component: ProductoDetailComponent, canActivate: [adminGuard] },

      { path: 'ventas', component: VentaListComponent, canActivate: [adminGuard] },
      { path: 'ventas/nueva', component: VentaFormComponent, canActivate: [adminGuard] },
      { path: 'ventas/:id/devolucion', component: VentaDevolucionFormComponent, canActivate: [adminGuard] },
      { path: 'ventas/:id/devoluciones/:devolucionId', component: VentaDevolucionDetailComponent, canActivate: [adminGuard] },
      { path: 'ventas/:id', component: VentaDetailComponent, canActivate: [adminGuard] },

      { path: 'compras', component: CompraListComponent, canActivate: [adminGuard] },
      { path: 'compras/nueva', component: CompraFormComponent, canActivate: [adminGuard] },
      { path: 'compras/:id/devolucion', component: CompraDevolucionFormComponent, canActivate: [adminGuard] },
      { path: 'compras/:id/devoluciones/:devolucionId', component: CompraDevolucionDetailComponent, canActivate: [adminGuard] },
      { path: 'compras/:id', component: CompraDetailComponent, canActivate: [adminGuard] },

      { path: 'clientes', component: ClienteListComponent, canActivate: [adminGuard] },
      { path: 'clientes/nuevo', component: ClienteFormComponent, canActivate: [adminGuard] },
      { path: 'clientes/:id/editar', component: ClienteFormComponent, canActivate: [adminGuard] },
      { path: 'clientes/:id', component: ClienteDetailComponent, canActivate: [adminGuard] },

      { path: 'servicios', component: ServicioListComponent, canActivate: [adminGuard] },
      { path: 'servicios/nueva', component: ServicioFormComponent, canActivate: [adminGuard] },
      { path: 'servicios/:id', component: ServicioDetailComponent, canActivate: [adminGuard] },

      comingSoon('proveedores', 'Proveedores', moduloPendiente),
      comingSoon('proveedores/nuevo', 'Nuevo proveedor', moduloPendiente),
      comingSoon('proveedores/:id', 'Detalle de proveedor', moduloPendiente),

      { path: 'inventario', component: InventarioComponent, canActivate: [adminGuard] },
      comingSoon('reportes', 'Reportes', moduloPendiente),

      { path: 'producto', redirectTo: 'productos/nuevo', pathMatch: 'full' },
      { path: 'listaproductos', redirectTo: 'productos', pathMatch: 'full' },
      { path: 'editar-producto/:id', redirectTo: 'productos/:id/editar' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
