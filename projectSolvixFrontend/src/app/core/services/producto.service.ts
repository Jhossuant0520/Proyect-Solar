import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoFiltros, ProductoModel } from '../../features/panelAdmin/producto/productoClase';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private apiUrl = 'http://localhost:8080/api/v1/productos';

  constructor(private http: HttpClient) {}

  listar(filtros?: ProductoFiltros): Observable<ProductoModel[]> {
    let params = new HttpParams();
    if (filtros?.marca) params = params.set('marca', filtros.marca);
    if (filtros?.categoriaId != null) params = params.set('categoriaId', String(filtros.categoriaId));
    if (filtros?.precioMin != null) params = params.set('precioMin', String(filtros.precioMin));
    if (filtros?.precioMax != null) params = params.set('precioMax', String(filtros.precioMax));
    if (filtros?.stockMin != null) params = params.set('stockMin', String(filtros.stockMin));
    if (filtros?.activo != null) params = params.set('activo', String(filtros.activo));
    return this.http.get<ProductoModel[]>(this.apiUrl, { params });
  }

  obtenerPorId(id: number): Observable<ProductoModel> {
    return this.http.get<ProductoModel>(`${this.apiUrl}/${id}`);
  }

  crear(producto: ProductoModel): Observable<ProductoModel> {
    return this.http.post<ProductoModel>(this.apiUrl, producto);
  }

  actualizar(id: number, producto: ProductoModel): Observable<ProductoModel> {
    return this.http.put<ProductoModel>(`${this.apiUrl}/${id}`, producto);
  }

  /** Soft-delete: desactiva el producto en catálogo */
  desactivar(id: number): Observable<ProductoModel> {
    return this.http.delete<ProductoModel>(`${this.apiUrl}/${id}`);
  }
}
