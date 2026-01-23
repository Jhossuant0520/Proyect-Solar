import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
// Eliminamos estas importaciones relacionadas con MatDialog y el componente de diálogo
// import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import { BienvenidaDialogComponent } from '../../shared/components/bienvenida-dialog/bienvenida-dialog';

import { AuthService } from '../../core/services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule
    // Eliminamos MatDialogModule
    // MatDialogModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  nombreUsuario: string = 'Usuario'; // Propiedad para el nombre del usuario

  constructor(
    private authService: AuthService,
    private router: Router,
    // Eliminamos la inyección de MatDialog
    // private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.obtenerNombreUsuarioParaBienvenida(); // Llamamos al nuevo método aquí
  }

  obtenerNombreUsuarioParaBienvenida() {
    const token = this.authService.obtenerToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.nombreUsuario = decoded.nombreUsuario || decoded.sub || 'Usuario';
      } catch (e) {
        console.error('Error al decodificar el token:', e);
        this.nombreUsuario = 'Usuario';
      }
    } else {
      this.nombreUsuario = 'Usuario';
    }
  }

  // Se elimina el método abrirDialogoBienvenida() si existía

  logout() {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}