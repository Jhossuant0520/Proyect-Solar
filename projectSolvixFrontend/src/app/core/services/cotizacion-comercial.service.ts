import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ConsultaCotizacionPublicaDTO,
  CotizacionComercialRequestDTO,
  CotizacionComercialResponseDTO,
  CotizacionComercialResumenDTO,
  DocumentoCotizacionComercialResponseDTO,
  FiltrosCotizacionComercial,
  PaginaResponseDTO
} from '../models/cotizacion-comercial.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CotizacionComercialService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/cotizaciones-comerciales`;

  constructor(private http: HttpClient) {}

  listar(filtros: FiltrosCotizacionComercial = {}): Observable<PaginaResponseDTO<CotizacionComercialResumenDTO>> {
    let params = new HttpParams()
      .set('pagina', String(filtros.pagina ?? 0))
      .set('tamano', String(filtros.tamano ?? 20));
    const q = filtros.q?.trim();
    if (q) params = params.set('q', q);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.clienteId != null) params = params.set('clienteId', String(filtros.clienteId));
    return this.http.get<PaginaResponseDTO<CotizacionComercialResumenDTO>>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<CotizacionComercialResponseDTO> {
    return this.http.get<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}`);
  }

  crear(request: CotizacionComercialRequestDTO): Observable<CotizacionComercialResponseDTO> {
    return this.http.post<CotizacionComercialResponseDTO>(this.apiUrl, request);
  }

  /** Edita la misma cotización (mismo id y número). Solo BORRADOR o PENDIENTE_APROBACION. */
  actualizar(id: number, request: CotizacionComercialRequestDTO): Observable<CotizacionComercialResponseDTO> {
    return this.http.put<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  presentar(id: number): Observable<CotizacionComercialResponseDTO> {
    return this.http.post<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}/presentar`, {});
  }

  aprobar(id: number): Observable<CotizacionComercialResponseDTO> {
    return this.http.post<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}/aprobar`, {});
  }

  rechazar(id: number, observacion?: string | null): Observable<CotizacionComercialResponseDTO> {
    return this.http.post<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}/rechazar`, {
      observacion: observacion ?? null
    });
  }

  anular(id: number): Observable<CotizacionComercialResponseDTO> {
    return this.http.post<CotizacionComercialResponseDTO>(`${this.apiUrl}/${id}/anular`, {});
  }

  listarDocumentos(id: number): Observable<DocumentoCotizacionComercialResponseDTO[]> {
    return this.http.get<DocumentoCotizacionComercialResponseDTO[]>(`${this.apiUrl}/${id}/documentos`);
  }

  regenerarDocumento(id: number): Observable<DocumentoCotizacionComercialResponseDTO> {
    return this.http.post<DocumentoCotizacionComercialResponseDTO>(`${this.apiUrl}/${id}/documentos`, {});
  }

  descargarPdf(
    id: number,
    documentoId: number,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): Observable<Blob> {
    const params = new HttpParams().set('disposition', disposition);
    return this.http.get(`${this.apiUrl}/${id}/documentos/${documentoId}/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  consultaPublica(token: string): Observable<ConsultaCotizacionPublicaDTO> {
    return this.http.get<ConsultaCotizacionPublicaDTO>(
      `${environment.apiBaseUrl}/v1/consulta/cotizacion/${encodeURIComponent(token)}`
    );
  }
}
