import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProveedorRequestDTO, ProveedorResponseDTO } from '../models/proveedor.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/proveedores`;

  constructor(private http: HttpClient) {}

  listar(soloActivos = false): Observable<ProveedorResponseDTO[]> {
    const params = new HttpParams().set('soloActivos', String(soloActivos));
    return this.http.get<ProveedorResponseDTO[]>(this.apiUrl, { params });
  }

  /** Búsqueda acotada (razón social, NIT, teléfono, correo, ciudad). Tope 50. */
  buscar(texto: string, limite = 10, soloActivos = true): Observable<ProveedorResponseDTO[]> {
    let params = new HttpParams()
      .set('limite', String(limite))
      .set('soloActivos', String(soloActivos));
    const q = texto.trim();
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<ProveedorResponseDTO[]>(`${this.apiUrl}/buscar`, { params });
  }

  obtenerPorId(id: number): Observable<ProveedorResponseDTO> {
    return this.http.get<ProveedorResponseDTO>(`${this.apiUrl}/${id}`);
  }

  crear(request: ProveedorRequestDTO): Observable<ProveedorResponseDTO> {
    return this.http.post<ProveedorResponseDTO>(this.apiUrl, request);
  }

  actualizar(id: number, request: ProveedorRequestDTO): Observable<ProveedorResponseDTO> {
    return this.http.put<ProveedorResponseDTO>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Desactiva con PUT y activo=false. El DELETE del backend hace lo mismo;
   * la UI no lo presenta como borrado: el historial de compras permanece.
   */
  desactivar(id: number, actual: ProveedorRequestDTO): Observable<ProveedorResponseDTO> {
    return this.actualizar(id, { ...actual, activo: false });
  }
}
