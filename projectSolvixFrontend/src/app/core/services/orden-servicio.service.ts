import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CambiarEstadoOrdenServicioRequestDTO,
  OrdenServicioFiltros,
  OrdenServicioRequestDTO,
  OrdenServicioResponseDTO
} from '../models/orden-servicio.models';

@Injectable({
  providedIn: 'root'
})
export class OrdenServicioService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/ordenes-servicio';

  constructor(private http: HttpClient) {}

  listar(filtros?: OrdenServicioFiltros): Observable<OrdenServicioResponseDTO[]> {
    let params = new HttpParams();
    if (filtros?.clienteId != null) {
      params = params.set('clienteId', String(filtros.clienteId));
    }
    if (filtros?.equipoId != null) {
      params = params.set('equipoId', String(filtros.equipoId));
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<OrdenServicioResponseDTO[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<OrdenServicioResponseDTO> {
    return this.http.get<OrdenServicioResponseDTO>(`${this.apiUrl}/${id}`);
  }

  crear(request: OrdenServicioRequestDTO): Observable<OrdenServicioResponseDTO> {
    return this.http.post<OrdenServicioResponseDTO>(this.apiUrl, request);
  }

  /**
   * Actualiza textos. El body debe conservar clienteId y equipoId originales;
   * el backend rechaza cambios de relación y de estado.
   */
  actualizar(id: number, request: OrdenServicioRequestDTO): Observable<OrdenServicioResponseDTO> {
    return this.http.put<OrdenServicioResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  cambiarEstado(
    id: number,
    request: CambiarEstadoOrdenServicioRequestDTO
  ): Observable<OrdenServicioResponseDTO> {
    return this.http.post<OrdenServicioResponseDTO>(`${this.apiUrl}/${id}/estado`, request);
  }
}
