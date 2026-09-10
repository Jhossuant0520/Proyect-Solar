import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CuentaService } from '../../core/services/cuenta.service';
import { ADMIN_NAV, AdminNavItem } from './admin-nav';
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

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeSidebar());

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

  get navItems(): AdminNavItem[] {
    const isAdmin = this.authService.esAdmin();
    return ADMIN_NAV.filter(item => !item.adminOnly || isAdmin);
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
}
