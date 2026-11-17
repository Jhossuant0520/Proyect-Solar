import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CuentaService } from '../../core/services/cuenta.service';
import { DASHBOARD_ANALISIS_NAV } from '../../features/panelAdmin/dashboard/analisis/analisis-nav';
import { ADMIN_NAV, AdminNavGroup } from './admin-nav';
import { AdminSidebarComponent } from './admin-sidebar';
import { AdminTopbarComponent } from './admin-topbar';

@Component({
  selector: 'solvix-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly cuentaService = inject(CuentaService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  /** true solo bajo `/dashboard/analisis` (sidebar contextual). */
  analisisMode = false;

  /**
   * Referencia estable para el sidebar.
   * Un getter que devolvía `.map()` nuevo en cada CD + `ngOnChanges` del sidebar
   * provocaba un bucle infinito al entrar al panel tras el login.
   */
  navGroups: AdminNavGroup[] = [];
  private navCacheKey = '';

  constructor() {
    this.syncMode(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(event => {
        this.syncMode(event.urlAfterRedirects);
        this.closeSidebar();
      });

    if (this.authService.estaAutenticado()) {
      this.cuentaService.getMisDatos().subscribe({ error: () => undefined });
    }
  }

  get userName(): string {
    return this.authService.obtenerNombreUsuario() ?? 'Usuario';
  }

  get fotoUrl(): string | null {
    return this.cuentaService.fotoUrl();
  }

  get brandName(): string {
    return this.analisisMode ? 'Análisis' : 'Computer & Electronic';
  }

  get brandKicker(): string {
    return this.analisisMode ? 'Dashboard · detalle' : 'Panel administrativo';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.cuentaService.actualizarFotoVisible(null);
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  private syncMode(url: string): void {
    const path = url.split('?')[0];
    this.analisisMode = path === '/dashboard/analisis' || path.startsWith('/dashboard/analisis/');
    this.refreshNavGroups();
  }

  private refreshNavGroups(): void {
    const isAdmin = this.authService.esAdmin();
    const key = `${this.analisisMode ? 'analisis' : 'admin'}|${isAdmin ? '1' : '0'}`;
    if (key === this.navCacheKey && this.navGroups.length > 0) {
      return;
    }
    this.navCacheKey = key;
    const source = this.analisisMode ? DASHBOARD_ANALISIS_NAV : ADMIN_NAV;
    this.navGroups = source
      .map(group => ({
        label: group.label,
        items: group.items.filter(item => !item.adminOnly || isAdmin)
      }))
      .filter(group => group.items.length > 0);
  }
}
