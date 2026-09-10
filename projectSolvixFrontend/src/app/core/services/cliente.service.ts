import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteResponseDTO } from '../models/cliente.models';

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
}
