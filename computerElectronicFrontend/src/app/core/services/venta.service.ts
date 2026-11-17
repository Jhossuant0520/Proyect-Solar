import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DevolucionVentaRequestDTO,
  DevolucionVentaResponseDTO,
  ReembolsoRequestDTO,
  VentaFiltros,
  VentaRequestDTO,
  VentaResponseDTO
} from '../models/venta.models';
import { PaginaResponseDTO } from '../models/cotizacion-comercial.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private readonly ventasUrl = `${environment.apiBaseUrl}/v1/ventas`;
  private readonly devolucionesUrl = `${environment.apiBaseUrl}/v1/devoluciones-venta`;

  constructor(private http: HttpClient) {}

  listar(filtros?: VentaFiltros): Observable<PaginaResponseDTO<VentaResponseDTO>> {
    let params = new HttpParams();
    const q = filtros?.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (filtros?.clienteId != null) {
      params = params.set('clienteId', String(filtros.clienteId));
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
    params = params.set('pagina', String(filtros?.pagina ?? 0));
    params = params.set('tamano', String(filtros?.tamano ?? 20));
    return this.http.get<PaginaResponseDTO<VentaResponseDTO>>(this.ventasUrl, { params });
  }

  obtenerPorId(id: number): Observable<VentaResponseDTO> {
    return this.http.get<VentaResponseDTO>(`${this.ventasUrl}/${id}`);
  }

  crear(request: VentaRequestDTO): Observable<VentaResponseDTO> {
    return this.http.post<VentaResponseDTO>(this.ventasUrl, request);
  }

  completar(id: number): Observable<VentaResponseDTO> {
    return this.http.post<VentaResponseDTO>(`${this.ventasUrl}/${id}/completar`, {});
  }

  cancelar(id: number): Observable<VentaResponseDTO> {
    return this.http.post<VentaResponseDTO>(`${this.ventasUrl}/${id}/cancelar`, {});
  }

  listarDevoluciones(ventaId: number): Observable<DevolucionVentaResponseDTO[]> {
    return this.http.get<DevolucionVentaResponseDTO[]>(`${this.ventasUrl}/${ventaId}/devoluciones`);
  }

  listarDevolucionesPorCliente(clienteId: number): Observable<DevolucionVentaResponseDTO[]> {
    const params = new HttpParams().set('clienteId', String(clienteId));
    return this.http.get<DevolucionVentaResponseDTO[]>(this.devolucionesUrl, { params });
  }

  registrarDevolucion(
    ventaId: number,
    request: DevolucionVentaRequestDTO
  ): Observable<DevolucionVentaResponseDTO> {
    return this.http.post<DevolucionVentaResponseDTO>(
      `${this.ventasUrl}/${ventaId}/devoluciones`,
      request
    );
  }

  obtenerDevolucion(id: number): Observable<DevolucionVentaResponseDTO> {
    return this.http.get<DevolucionVentaResponseDTO>(`${this.devolucionesUrl}/${id}`);
  }

  reembolsar(id: number, request: ReembolsoRequestDTO): Observable<DevolucionVentaResponseDTO> {
    return this.http.post<DevolucionVentaResponseDTO>(
      `${this.devolucionesUrl}/${id}/reembolsar`,
      request
    );
  }
}
