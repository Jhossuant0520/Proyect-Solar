import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AjusteCostoRequestDTO,
  AjusteCostoResponseDTO,
  AjusteInventarioRequestDTO,
  MovimientoInventarioFiltros,
  MovimientoInventarioResponseDTO
} from '../models/inventario.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/inventario`;

  constructor(private http: HttpClient) {}

  ajustarCosto(request: AjusteCostoRequestDTO): Observable<AjusteCostoResponseDTO> {
    return this.http.post<AjusteCostoResponseDTO>(`${this.apiUrl}/ajustes/costo`, request);
  }

  registrarAjuste(request: AjusteInventarioRequestDTO): Observable<MovimientoInventarioResponseDTO> {
    return this.http.post<MovimientoInventarioResponseDTO>(`${this.apiUrl}/ajustes`, request);
  }

  /** Sin productoId el backend entrega todos los ajustes de costo. */
  listarAjustesCosto(productoId?: number): Observable<AjusteCostoResponseDTO[]> {
    let params = new HttpParams();
    if (productoId != null) {
      params = params.set('productoId', String(productoId));
    }
    return this.http.get<AjusteCostoResponseDTO[]>(`${this.apiUrl}/ajustes/costo`, { params });
  }

  listarMovimientos(productoId: number): Observable<MovimientoInventarioResponseDTO[]>;
  listarMovimientos(filtros?: MovimientoInventarioFiltros): Observable<MovimientoInventarioResponseDTO[]>;
  listarMovimientos(
    arg?: number | MovimientoInventarioFiltros
  ): Observable<MovimientoInventarioResponseDTO[]> {
    const filtros: MovimientoInventarioFiltros = typeof arg === 'number' ? { productoId: arg } : (arg ?? {});
    let params = new HttpParams();
    if (filtros.productoId != null) {
      params = params.set('productoId', String(filtros.productoId));
    }
    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    return this.http.get<MovimientoInventarioResponseDTO[]>(`${this.apiUrl}/movimientos`, { params });
  }
}
