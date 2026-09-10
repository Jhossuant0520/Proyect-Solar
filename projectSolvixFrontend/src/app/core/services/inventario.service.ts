import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AjusteCostoRequestDTO,
  AjusteCostoResponseDTO,
  MovimientoInventarioResponseDTO
} from '../models/inventario.models';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/inventario';

  constructor(private http: HttpClient) {}

  ajustarCosto(request: AjusteCostoRequestDTO): Observable<AjusteCostoResponseDTO> {
    return this.http.post<AjusteCostoResponseDTO>(`${this.apiUrl}/ajustes/costo`, request);
  }

  listarAjustesCosto(productoId: number): Observable<AjusteCostoResponseDTO[]> {
    const params = new HttpParams().set('productoId', String(productoId));
    return this.http.get<AjusteCostoResponseDTO[]>(`${this.apiUrl}/ajustes/costo`, { params });
  }

  listarMovimientos(productoId: number): Observable<MovimientoInventarioResponseDTO[]> {
    const params = new HttpParams().set('productoId', String(productoId));
    return this.http.get<MovimientoInventarioResponseDTO[]>(`${this.apiUrl}/movimientos`, { params });
  }
}
