import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegistroRequest {
  nombreUsuario: string;
  email: string;
  passwordUsuario: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private baseUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  registrar(datos: RegistroRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/registro`, datos);
  }

  verificarEmail(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/verificar-email?token=${token}`);
  }

  reenviarVerificacion(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reenviar-verificacion`, { email });
  }
}
