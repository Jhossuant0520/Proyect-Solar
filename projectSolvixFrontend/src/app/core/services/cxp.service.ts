import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CuentaPorPagarResponseDTO,
  EstadoCuentaPorPagar,
  PageResponse,
  PagoCxPRequestDTO,
  PagoCxPResponseDTO
} from '../models/cxp.models';

@Injectable({ providedIn: 'root' })
export class CxpService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/cxp`;

  constructor(private http: HttpClient) {}

  listar(opciones: {
    proveedorId?: number | null;
    estado?: EstadoCuentaPorPagar | '';
    vencida?: boolean | null;
    page?: number;
    size?: number;
  } = {}): Observable<PageResponse<CuentaPorPagarResponseDTO>> {
    let params = new HttpParams()
      .set('page', String(opciones.page ?? 0))
      .set('size', String(opciones.size ?? 20))
      .set('sort', 'id,desc');

    if (opciones.proveedorId != null) {
      params = params.set('proveedorId', String(opciones.proveedorId));
    }
    if (opciones.estado) {
      params = params.set('estado', opciones.estado);
    }
    if (opciones.vencida === true || opciones.vencida === false) {
      params = params.set('vencida', String(opciones.vencida));
    }

    return this.http.get<PageResponse<CuentaPorPagarResponseDTO>>(this.baseUrl, { params });
  }

  obtenerPorId(id: number): Observable<CuentaPorPagarResponseDTO> {
    return this.http.get<CuentaPorPagarResponseDTO>(`${this.baseUrl}/${id}`);
  }

  obtenerPorCompra(compraId: number): Observable<CuentaPorPagarResponseDTO> {
    return this.http.get<CuentaPorPagarResponseDTO>(`${this.baseUrl}/por-compra/${compraId}`);
  }

  listarPagos(cxpId: number): Observable<PagoCxPResponseDTO[]> {
    return this.http.get<PagoCxPResponseDTO[]>(`${this.baseUrl}/${cxpId}/pagos`);
  }

  registrarPago(cxpId: number, body: PagoCxPRequestDTO): Observable<CuentaPorPagarResponseDTO> {
    return this.http.post<CuentaPorPagarResponseDTO>(`${this.baseUrl}/${cxpId}/pagos`, body);
  }
}
