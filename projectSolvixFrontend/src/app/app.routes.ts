import { Routes } from '@angular/router';
import { HomePage } from './homepage/home-page/home-page';
import { LoginComponent } from './features/access/login/login';
import { Register } from './features/access/register/register';
import { VerificarEmail } from './features/access/verificar-email/verificar-email';
import { SolicitarReenvio } from './features/access/solicitar-reenvio/solicitar-reenvio';
import { DashboardComponent } from './features/panelAdmin/dashboard/dashboard';
import { MiCuenta } from './features/access/mi-cuenta/mi-cuenta';
import { authGuard } from './core/guards/auth-guard';
import { App } from './app';
import { Catalog } from './homepage/home-page/components/catalog/catalog';
import { FincaComponent } from './features/panelAdmin/finca/finca';
import { FincaList } from './features/panelAdmin/finca/finca-list/finca-list';
import { PorComponenteForm } from './features/panelAdmin/componenteEnergetico/por-componente/por-componente';
import { PorComponenteList } from './features/panelAdmin/componenteEnergetico/por-componente-list/por-componente-list';
import { DemandaEnergetica } from './features/panelAdmin/demanda-energetica/demanda-energetica';
import { ModulDemandaRecibo } from './features/business/modul-demanda-recibo/modul-demanda-recibo';
import { ModulHsp } from './features/business/modul-hsp/modul-hsp';

export const routes: Routes = [
  // Rutas públicas (sin autenticación)
  { path: '', component: HomePage }, 
  { path: "Catalogo", component: Catalog },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: Register },
  { path: 'verificar-email/:token', component: VerificarEmail },
  { path: 'solicitar-reenvio', component: SolicitarReenvio },
  { path: 'demanda-recibo', component: ModulDemandaRecibo },
  { path: 'hsp', component: ModulHsp },

  // Rutas protegidas (requieren autenticación)
  {
    path: '', 
    component: App, 
    canActivate: [authGuard], 
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'mi-cuenta', component: MiCuenta },
      { path: 'finca', component: FincaComponent },
      { path: 'listafinca', component: FincaList },
      { path: 'editar-finca/:id', component: FincaComponent },
      { path: 'componentesenergeticos', component: PorComponenteForm },
      { path: 'editar-componente/:id', component: PorComponenteForm },
      { path: 'listcomponet', component: PorComponenteList },
      { path: "demanda", component: DemandaEnergetica },
    ]
  },
  
  // Ruta comodín para cualquier otra ruta no definida
  { path: '**', redirectTo: 'login' }
];

