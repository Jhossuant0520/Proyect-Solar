import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EquipoFiltros, EquipoRequestDTO, EquipoResponseDTO } from '../models/equipo.models';

@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/equipos';

  constructor(private http: HttpClient) {}

  listar(filtros?: EquipoFiltros): Observable<EquipoResponseDTO[]> {
    let params = new HttpParams();
    if (filtros?.clienteId != null) {
      params = params.set('clienteId', String(filtros.clienteId));
    }
    if (filtros?.soloActivos != null) {
      params = params.set('soloActivos', String(filtros.soloActivos));
    }
    return this.http.get<EquipoResponseDTO[]>(this.apiUrl, { params });
  }

  /** Encapsula GET /equipos?clienteId=&soloActivos=true. No es un endpoint nuevo. */
  listarPorCliente(clienteId: number, soloActivos = true): Observable<EquipoResponseDTO[]> {
    return this.listar({ clienteId, soloActivos });
  }

  obtenerPorId(id: number): Observable<EquipoResponseDTO> {
    return this.http.get<EquipoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  crear(request: EquipoRequestDTO): Observable<EquipoResponseDTO> {
    return this.http.post<EquipoResponseDTO>(this.apiUrl, request);
  }

  actualizar(id: number, request: EquipoRequestDTO): Observable<EquipoResponseDTO> {
    return this.http.put<EquipoResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  /** Soft-delete: DELETE /api/v1/equipos/{id} → activo=false. */
  desactivar(id: number): Observable<EquipoResponseDTO> {
    return this.http.delete<EquipoResponseDTO>(`${this.apiUrl}/${id}`);
  }
}
