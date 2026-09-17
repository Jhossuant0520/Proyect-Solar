import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoFiltros, ProductoModel, ProductoRequestDTO } from '../../features/panelAdmin/producto/productoClase';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private readonly apiUrl = `${environment.apiBaseUrl}/v1/productos`;

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

  /**
   * Búsqueda exacta por código de barras (HID/manual).
   * Reutilizable en Ventas/Compras sin depender de cámara.
   */
  obtenerPorCodigoBarras(codigoBarras: string): Observable<ProductoModel> {
    const codigo = encodeURIComponent(codigoBarras.trim());
    return this.http.get<ProductoModel>(`${this.apiUrl}/codigo-barras/${codigo}`);
  }

  crear(producto: ProductoRequestDTO): Observable<ProductoModel> {
    return this.http.post<ProductoModel>(this.apiUrl, producto);
  }

  actualizar(id: number, producto: ProductoRequestDTO): Observable<ProductoModel> {
    return this.http.put<ProductoModel>(`${this.apiUrl}/${id}`, producto);
  }

  /** Multipart: campo `file`. Actualiza imagenUrl en el servidor. */
  subirImagen(id: number, archivo: File): Observable<ProductoModel> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<ProductoModel>(`${this.apiUrl}/${id}/imagen`, formData);
  }

  /** Elimina imagenUrl (y archivo local si aplica). */
  eliminarImagen(id: number): Observable<ProductoModel> {
    return this.http.delete<ProductoModel>(`${this.apiUrl}/${id}/imagen`);
  }

  /** Soft-delete: desactiva el producto en catálogo */
  desactivar(id: number): Observable<ProductoModel> {
    return this.http.delete<ProductoModel>(`${this.apiUrl}/${id}`);
  }
}
