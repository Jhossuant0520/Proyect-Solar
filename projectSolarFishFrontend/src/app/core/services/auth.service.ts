import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth/login';

  constructor(private http: HttpClient) {}

  login(usuarioLogin: string, passwordLogin: string): Observable<any> {
    return this.http.post(this.apiUrl, { nombreUsuario: usuarioLogin, passwordUsuario: passwordLogin });
  }

  guardarToken(token: string) {
    localStorage.setItem('token', token);
  }

  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  cerrarSesion() {
    localStorage.removeItem('token');
  }

  estaAutenticado(): boolean {
    const token = this.obtenerToken();
  
    if (!token) return true; // True para relizar pruebas sin login
  
    try {
      const decoded: any = jwtDecode(token);
      const exp = decoded.exp;
  
      if (!exp) return false;
  
      const now = Math.floor(Date.now() / 1000); // tiempo actual en segundos
  
      return exp > now; // true si aún no ha expirado
    } catch (e) {
      console.error('Token inválido o mal decodificado:', e);
      return false;
    }
  }
  obtenerNombreUsuario(): string | null {
    const token = this.obtenerToken();
    if (!token) return null;
  
    try {
      const decoded: any = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
  
      if (decoded.exp && decoded.exp < now) return null;
  
      return decoded.sub || decoded.nombreUsuario || null;
    } catch (error) {
      return null;
    }
  }
  

  
}
