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
import { App } from './app';
import { Catalog } from './homepage/home-page/components/catalog/catalog';
import { ProductoComponent } from './features/panelAdmin/producto/producto';
import { ProductoList } from './features/panelAdmin/producto/producto-list/producto-list';
import { ModulDemandaRecibo } from './features/business/modul-demanda-recibo/modul-demanda-recibo';
import { ModulHsp } from './features/business/modul-hsp/modul-hsp';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'Catalogo', component: Catalog },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: Register },
  { path: 'verificar-email/:token', component: VerificarEmail },
  { path: 'solicitar-reenvio', component: SolicitarReenvio },
  { path: 'demanda-recibo', component: ModulDemandaRecibo },
  { path: 'hsp', component: ModulHsp },

  {
    path: '',
    component: App,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'mi-cuenta', component: MiCuenta },
      { path: 'producto', component: ProductoComponent, canActivate: [adminGuard] },
      { path: 'listaproductos', component: ProductoList, canActivate: [adminGuard] },
      { path: 'editar-producto/:id', component: ProductoComponent, canActivate: [adminGuard] },
    ]
  },

  { path: '**', redirectTo: 'login' }
];
