import { Routes } from '@angular/router';
import { HomePage } from './homepage/home-page/home-page';
import { LoginComponent } from './features/login/login';
import { Register } from './features/register/register';
import { VerificarEmail } from './features/verificar-email/verificar-email';
import { SolicitarReenvio } from './features/solicitar-reenvio/solicitar-reenvio';
import { DashboardComponent } from './features/dashboard/dashboard';
import { MiCuenta } from './features/mi-cuenta/mi-cuenta';
import { authGuard } from './core/guards/auth-guard';
import { App } from './app';
import { Catalog } from './homepage/home-page/components/catalog/catalog';
import { FincaComponent } from './features/finca/finca';
import { FincaList } from './features/finca/finca-list/finca-list';
import { PorComponenteForm } from './features/componenteEnergetico/por-componente/por-componente';
import { PorComponenteList } from './features/componenteEnergetico/por-componente-list/por-componente-list';
import { DemandaEnergetica } from './features/demanda-energetica/demanda-energetica';

export const routes: Routes = [
  // Rutas públicas (sin autenticación)
  { path: '', component: HomePage }, 
  { path: "Catalogo", component: Catalog },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: Register },
  { path: 'verificar-email/:token', component: VerificarEmail },
  { path: 'solicitar-reenvio', component: SolicitarReenvio },

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

