import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoriaProductoModel } from '../../features/panelAdmin/producto/productoClase';

@Injectable({
  providedIn: 'root'
})
export class CategoriaProductoService {

  private apiUrl = 'http://localhost:8080/api/v1/categorias-producto';

  constructor(private http: HttpClient) {}

  listar(soloActivas: boolean = true): Observable<CategoriaProductoModel[]> {
    const params = new HttpParams().set('soloActivas', String(soloActivas));
    return this.http.get<CategoriaProductoModel[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<CategoriaProductoModel> {
    return this.http.get<CategoriaProductoModel>(`${this.apiUrl}/${id}`);
  }
}
