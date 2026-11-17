import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CotizacionServicioRequestDTO,
  CotizacionServicioResponseDTO,
  RechazarCotizacionRequestDTO,
  ResumenEconomicoOrdenServicioDTO
} from '../models/cotizacion-servicio.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CotizacionServicioService {
  constructor(private http: HttpClient) {}

  private base(ordenId: number): string {
    return `${environment.apiBaseUrl}/v1/ordenes-servicio/${ordenId}/cotizaciones`;
  }

  listar(ordenId: number): Observable<CotizacionServicioResponseDTO[]> {
    return this.http.get<CotizacionServicioResponseDTO[]>(this.base(ordenId));
  }

  resumenEconomico(ordenId: number): Observable<ResumenEconomicoOrdenServicioDTO> {
    return this.http.get<ResumenEconomicoOrdenServicioDTO>(
      `${this.base(ordenId)}/resumen-economico`
    );
  }

  obtener(ordenId: number, cotizacionId: number): Observable<CotizacionServicioResponseDTO> {
    return this.http.get<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/${cotizacionId}`
    );
  }

  crearInicial(
    ordenId: number,
    request: CotizacionServicioRequestDTO
  ): Observable<CotizacionServicioResponseDTO> {
    return this.http.post<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/inicial`,
      request
    );
  }

  crearAdicional(
    ordenId: number,
    request: CotizacionServicioRequestDTO
  ): Observable<CotizacionServicioResponseDTO> {
    return this.http.post<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/adicional`,
      request
    );
  }

  actualizar(
    ordenId: number,
    cotizacionId: number,
    request: CotizacionServicioRequestDTO
  ): Observable<CotizacionServicioResponseDTO> {
    return this.http.put<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/${cotizacionId}`,
      request
    );
  }

  presentar(ordenId: number, cotizacionId: number): Observable<CotizacionServicioResponseDTO> {
    return this.http.post<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/${cotizacionId}/presentar`,
      {}
    );
  }

  aprobar(ordenId: number, cotizacionId: number): Observable<CotizacionServicioResponseDTO> {
    return this.http.post<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/${cotizacionId}/aprobar`,
      {}
    );
  }

  rechazar(
    ordenId: number,
    cotizacionId: number,
    request?: RechazarCotizacionRequestDTO
  ): Observable<CotizacionServicioResponseDTO> {
    return this.http.post<CotizacionServicioResponseDTO>(
      `${this.base(ordenId)}/${cotizacionId}/rechazar`,
      request ?? {}
    );
  }

  eliminarBorrador(ordenId: number, cotizacionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(ordenId)}/${cotizacionId}`);
  }
}
