import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComponenteEnergeticoByClase } from '../../features/panelAdmin/componenteEnergetico/por-componente/componenteEnergeticobyClase';

@Injectable({
  providedIn: 'root'
})
export class ComponenteEnergeticoService {
  private apiUrl = 'http://localhost:8080/api/componenteEnergetico';

  constructor(private http: HttpClient) {}

  registrarComponente(componente: ComponenteEnergeticoByClase): Observable<ComponenteEnergeticoByClase> {
    return this.http.post<ComponenteEnergeticoByClase>(`${this.apiUrl}/registrar`, componente);
  }

  listarPorFinca(fincaId: number): Observable<ComponenteEnergeticoByClase[]> {
    return this.http.get<ComponenteEnergeticoByClase[]>(`${this.apiUrl}/listar/${fincaId}`);
  }

  obtenerPorId(id: number): Observable<ComponenteEnergeticoByClase> {
    return this.http.get<ComponenteEnergeticoByClase>(`${this.apiUrl}/${id}`);
  }

  actualizarComponente(id: number, componente: ComponenteEnergeticoByClase): Observable<ComponenteEnergeticoByClase> {
    return this.http.put<ComponenteEnergeticoByClase>(`${this.apiUrl}/${id}`, componente);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
