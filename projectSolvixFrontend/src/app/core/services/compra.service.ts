import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReembolsoRequestDTO } from '../models/venta.models';
import {
  CompraFiltros,
  CompraRequestDTO,
  CompraResponseDTO,
  DevolucionCompraRequestDTO,
  DevolucionCompraResponseDTO
} from '../models/compra.models';

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private readonly comprasUrl = 'http://localhost:8080/api/v1/compras';
  private readonly devolucionesUrl = 'http://localhost:8080/api/v1/devoluciones-compra';

  constructor(private http: HttpClient) {}

  listar(filtros?: CompraFiltros): Observable<CompraResponseDTO[]> {
    let params = new HttpParams();
    if (filtros?.proveedorId != null) {
      params = params.set('proveedorId', String(filtros.proveedorId));
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    return this.http.get<CompraResponseDTO[]>(this.comprasUrl, { params });
  }

  obtenerPorId(id: number): Observable<CompraResponseDTO> {
    return this.http.get<CompraResponseDTO>(`${this.comprasUrl}/${id}`);
  }

  crear(request: CompraRequestDTO): Observable<CompraResponseDTO> {
    return this.http.post<CompraResponseDTO>(this.comprasUrl, request);
  }

  completar(id: number): Observable<CompraResponseDTO> {
    return this.http.post<CompraResponseDTO>(`${this.comprasUrl}/${id}/completar`, {});
  }

  cancelar(id: number): Observable<CompraResponseDTO> {
    return this.http.post<CompraResponseDTO>(`${this.comprasUrl}/${id}/cancelar`, {});
  }

  listarDevoluciones(compraId: number): Observable<DevolucionCompraResponseDTO[]> {
    return this.http.get<DevolucionCompraResponseDTO[]>(`${this.comprasUrl}/${compraId}/devoluciones`);
  }

  registrarDevolucion(
    compraId: number,
    request: DevolucionCompraRequestDTO
  ): Observable<DevolucionCompraResponseDTO> {
    return this.http.post<DevolucionCompraResponseDTO>(
      `${this.comprasUrl}/${compraId}/devoluciones`,
      request
    );
  }

  obtenerDevolucion(id: number): Observable<DevolucionCompraResponseDTO> {
    return this.http.get<DevolucionCompraResponseDTO>(`${this.devolucionesUrl}/${id}`);
  }

  reembolsar(id: number, request: ReembolsoRequestDTO): Observable<DevolucionCompraResponseDTO> {
    return this.http.post<DevolucionCompraResponseDTO>(
      `${this.devolucionesUrl}/${id}/reembolsar`,
      request
    );
  }
}
