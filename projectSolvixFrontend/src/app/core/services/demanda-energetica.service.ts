import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandaEnergeticaClase } from '../../features/panelAdmin/demanda-energetica/demandaEnergeticaClase';

@Injectable({
  providedIn: 'root'
})
export class DemandaEnergeticaService {
  private apiUrl = 'http://localhost:8080/api/demandaEnergetica';

  constructor(private http: HttpClient) {}

  calcularDemanda(fincaId: number): Observable<DemandaEnergeticaClase> {
    return this.http.post<DemandaEnergeticaClase>(`${this.apiUrl}/calcular/${fincaId}`, {});
  }

  obtenerPorFinca(fincaId: number): Observable<DemandaEnergeticaClase> {
    return this.http.get<DemandaEnergeticaClase>(`${this.apiUrl}/${fincaId}`);
  }

  listar(): Observable<DemandaEnergeticaClase[]> {
    return this.http.get<DemandaEnergeticaClase[]>(`${this.apiUrl}/listar`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
