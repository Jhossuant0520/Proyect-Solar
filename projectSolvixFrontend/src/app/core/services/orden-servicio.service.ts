import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CambiarEstadoOrdenServicioRequestDTO,
  CompletarDiagnosticoRequestDTO,
  CompletarReparacionRequestDTO,
  ConsumirRepuestoRequestDTO,
  DevolverRepuestoRequestDTO,
  EntregaOrdenServicioResponseDTO,
  HistorialEstadoOrdenServicioResponseDTO,
  OrdenServicioFiltros,
  OrdenServicioRequestDTO,
  OrdenServicioResponseDTO,
  RegistrarEntregaRequestDTO,
  RegistrarEntregaResponseDTO,
  RegistrarNuevaFallaRequestDTO,
  RecepcionOrdenServicioResponseDTO,
  RepuestoOrdenServicioRequestDTO,
  RepuestoOrdenServicioResponseDTO,
  TransicionOrdenServicioResponseDTO
} from '../models/orden-servicio.models';
import { PaginaResponseDTO } from '../models/cotizacion-comercial.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrdenServicioService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/ordenes-servicio`;

  constructor(private http: HttpClient) {}

  listar(filtros?: OrdenServicioFiltros): Observable<PaginaResponseDTO<OrdenServicioResponseDTO>> {
    let params = new HttpParams();
    const q = filtros?.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (filtros?.clienteId != null) {
      params = params.set('clienteId', String(filtros.clienteId));
    }
    if (filtros?.equipoId != null) {
      params = params.set('equipoId', String(filtros.equipoId));
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    params = params.set('pagina', String(filtros?.pagina ?? 0));
    params = params.set('tamano', String(filtros?.tamano ?? 20));
    return this.http.get<PaginaResponseDTO<OrdenServicioResponseDTO>>(this.apiUrl, { params });
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

  actualizar(id: number, request: OrdenServicioRequestDTO): Observable<OrdenServicioResponseDTO> {
    return this.http.put<OrdenServicioResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  cambiarEstado(
    id: number,
    request: CambiarEstadoOrdenServicioRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(`${this.apiUrl}/${id}/estado`, request);
  }

  completarDiagnostico(
    id: number,
    request: CompletarDiagnosticoRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/diagnostico/completar`,
      request
    );
  }

  completarReparacion(
    id: number,
    request: CompletarReparacionRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/reparacion/completar`,
      request
    );
  }

  registrarNuevaFalla(
    id: number,
    request: RegistrarNuevaFallaRequestDTO
  ): Observable<TransicionOrdenServicioResponseDTO> {
    return this.http.post<TransicionOrdenServicioResponseDTO>(
      `${this.apiUrl}/${id}/nueva-falla`,
      request
    );
  }

  registrarEntrega(
    id: number,
    request: RegistrarEntregaRequestDTO
  ): Observable<RegistrarEntregaResponseDTO> {
    return this.http.post<RegistrarEntregaResponseDTO>(`${this.apiUrl}/${id}/entrega`, request);
  }

  obtenerEntrega(id: number): Observable<EntregaOrdenServicioResponseDTO> {
    return this.http.get<EntregaOrdenServicioResponseDTO>(`${this.apiUrl}/${id}/entrega`);
  }

  obtenerRecepcion(id: number): Observable<RecepcionOrdenServicioResponseDTO> {
    return this.http.get<RecepcionOrdenServicioResponseDTO>(`${this.apiUrl}/${id}/recepcion`);
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
