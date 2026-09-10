import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProveedorResponseDTO } from '../models/proveedor.models';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private readonly apiUrl = 'http://localhost:8080/api/v1/proveedores';

  constructor(private http: HttpClient) {}

  listar(soloActivos = false): Observable<ProveedorResponseDTO[]> {
    const params = new HttpParams().set('soloActivos', String(soloActivos));
    return this.http.get<ProveedorResponseDTO[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<ProveedorResponseDTO> {
    return this.http.get<ProveedorResponseDTO>(`${this.apiUrl}/${id}`);
  }
}
