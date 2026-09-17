import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CambiarEstadoOrdenServicioRequestDTO,
  CompletarDiagnosticoRequestDTO,
  CompletarReparacionRequestDTO,
  ConsumirRepuestoRequestDTO,
  DevolverRepuestoRequestDTO,
  HistorialEstadoOrdenServicioResponseDTO,
  OrdenServicioFiltros,
  OrdenServicioRequestDTO,
  OrdenServicioResponseDTO,
  RegistrarNuevaFallaRequestDTO,
  RepuestoOrdenServicioRequestDTO,
  RepuestoOrdenServicioResponseDTO,
  TransicionOrdenServicioResponseDTO
} from '../models/orden-servicio.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrdenServicioService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/ordenes-servicio`;

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

  listarHistorial(id: number): Observable<HistorialEstadoOrdenServicioResponseDTO[]> {
    return this.http.get<HistorialEstadoOrdenServicioResponseDTO[]>(`${this.apiUrl}/${id}/historial`);
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
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(`${this.apiUrl}/${id}/estado`, request);
  }

  /** EN_DIAGNOSTICO → DIAGNOSTICADO (ficha técnica + historial atómicos). */
  completarDiagnostico(
    id: number,
    request: CompletarDiagnosticoRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/diagnostico/completar`,
      request
    );
  }

  /** EN_REPARACION → LISTO (trabajo realizado + historial atómicos). */
  completarReparacion(
    id: number,
    request: CompletarReparacionRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/reparacion/completar`,
      request
    );
  }

  /** EN_REPARACION → REQUIERE_APROBACION_ADICIONAL. */
  registrarNuevaFalla(
    id: number,
    request: RegistrarNuevaFallaRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/nueva-falla`,
      request
    );
  }

  listarRepuestos(ordenId: number): Observable<RepuestoOrdenServicioResponseDTO[]> {
    return this.http.get<RepuestoOrdenServicioResponseDTO[]>(`${this.apiUrl}/${ordenId}/repuestos`);
  }

  planificarRepuesto(
    ordenId: number,
    request: RepuestoOrdenServicioRequestDTO
  ): Observable<RepuestoOrdenServicioResponseDTO> {
    return this.http.post<RepuestoOrdenServicioResponseDTO>(
      `${this.apiUrl}/${ordenId}/repuestos`,
      request
    );
  }

  actualizarRepuesto(
    ordenId: number,
    repuestoId: number,
    request: RepuestoOrdenServicioRequestDTO
  ): Observable<RepuestoOrdenServicioResponseDTO> {
    return this.http.put<RepuestoOrdenServicioResponseDTO>(
      `${this.apiUrl}/${ordenId}/repuestos/${repuestoId}`,
      request
    );
  }

  /** Soft-anular (DELETE). Solo si no hay consumo neto. */
  anularRepuesto(ordenId: number, repuestoId: number): Observable<RepuestoOrdenServicioResponseDTO> {
    return this.http.delete<RepuestoOrdenServicioResponseDTO>(
      `${this.apiUrl}/${ordenId}/repuestos/${repuestoId}`
    );
  }

  consumirRepuesto(
    ordenId: number,
    repuestoId: number,
    request: ConsumirRepuestoRequestDTO
  ): Observable<RepuestoOrdenServicioResponseDTO> {
    return this.http.post<RepuestoOrdenServicioResponseDTO>(
      `${this.apiUrl}/${ordenId}/repuestos/${repuestoId}/consumir`,
      request
    );
  }

  devolverRepuesto(
    ordenId: number,
    repuestoId: number,
    request: DevolverRepuestoRequestDTO
  ): Observable<RepuestoOrdenServicioResponseDTO> {
    return this.http.post<RepuestoOrdenServicioResponseDTO>(
      `${this.apiUrl}/${ordenId}/repuestos/${repuestoId}/devolver`,
      request
    );
  }
}
