import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  userName: string = 'Usuario';
  kpis = {
    objetivos: 33,
    tasaVot: 58,
    tiempoOperacion: 20
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.obtenerNombreUsuarioParaBienvenida();
  }

  obtenerNombreUsuarioParaBienvenida() {
    const token = this.authService.obtenerToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        this.userName = decoded.nombreUsuario || decoded.sub || 'Usuario';
      } catch (e) {
        console.error('Error al decodificar el token:', e);
        this.userName = 'Usuario';
      }
    } else {
      this.userName = 'Usuario';
    }
  }

  logout() {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}