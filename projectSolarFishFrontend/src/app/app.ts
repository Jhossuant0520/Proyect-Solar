import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngIf, etc.
import { RouterOutlet, RouterModule, Router } from '@angular/router'; // routerLink, routerLinkActive
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';


import { AuthService } from './core/services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-root',
  imports: [CommonModule,
    RouterOutlet,
    RouterModule, // Para routerLink y routerLinkActive
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule, ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
  
  
})
export class App implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav; // Referencia al sidenav
  nombreUsuarioToolbar: string = 'Usuario'; // Para mostrar en el toolbar superior

  constructor(
    public authService: AuthService,
    
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerNombreUsuarioParaToolbar();
    // Opcional: Escuchar eventos de ruta para actualizar el nombre si cambia (ej. al loguearse otro usuario)
    this.router.events.subscribe(() => {
        this.obtenerNombreUsuarioParaToolbar();
    });
  }

  obtenerNombreUsuarioParaToolbar() {
    const token = this.authService.obtenerToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.nombreUsuarioToolbar = decoded.nombreUsuario || decoded.sub || 'Usuario';
      } catch (e) {
        console.error('Error al decodificar el token en toolbar:', e);
        this.nombreUsuarioToolbar = 'Usuario'; // Fallback
      }
    } else {
      this.nombreUsuarioToolbar = 'Usuario'; // Si no hay token, mostrar un nombre genérico
    }
  }

  logout(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
    // this.sidenav.close(); // Cierra el sidenav si está abierto al hacer logout
  }

  


}
