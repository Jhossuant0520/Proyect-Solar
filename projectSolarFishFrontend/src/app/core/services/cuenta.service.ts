import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MisDatos {
  nombreUsuario: string;
  email: string;
  fechaCreacion: string;
  ultimoLogin: string;
}

export interface CambiarPassword {
  passwordActual: string;
  passwordNueva: string;
  confirmarPasswordNueva: string;
}

@Injectable({
  providedIn: 'root'
})
export class CuentaService {

  private baseUrl = 'http://localhost:8080/api/cuenta';

  constructor(private http: HttpClient) { }

  getMisDatos(): Observable<MisDatos> {
    return this.http.get<MisDatos>(`${this.baseUrl}/mis-datos`);
  }

  cambiarPassword(datos: CambiarPassword): Observable<any> {
    return this.http.put(`${this.baseUrl}/cambiar-password`, datos);
  }
}