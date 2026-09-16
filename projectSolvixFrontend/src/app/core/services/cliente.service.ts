import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteRequestDTO, ClienteResponseDTO } from '../models/cliente.models';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/clientes';

  constructor(private http: HttpClient) {}

  listar(soloActivos = false): Observable<ClienteResponseDTO[]> {
    const params = new HttpParams().set('soloActivos', String(soloActivos));
    return this.http.get<ClienteResponseDTO[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<ClienteResponseDTO> {
    return this.http.get<ClienteResponseDTO>(`${this.apiUrl}/${id}`);
  }

  crear(request: ClienteRequestDTO): Observable<ClienteResponseDTO> {
    return this.http.post<ClienteResponseDTO>(this.apiUrl, request);
  }

  actualizar(id: number, request: ClienteRequestDTO): Observable<ClienteResponseDTO> {
    return this.http.put<ClienteResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Desactiva con PUT y activo=false. El DELETE del backend hace lo mismo,
   * pero la UI no lo presenta como borrado: el historial de ventas permanece.
   */
  desactivar(id: number, actual: ClienteRequestDTO): Observable<ClienteResponseDTO> {
    return this.actualizar(id, { ...actual, activo: false });
  }
}
