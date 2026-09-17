import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CatalogoCategoria, CatalogoProducto } from '../models/catalogo.models';
import {
  CatalogoCategoriaDto,
  CatalogoProductoDto,
  mapCatalogoCategorias,
  mapCatalogoProducto,
  mapCatalogoProductos
} from '../mappers/catalogo-mapper';
import { environment } from '../../../environments/environment';

/**
 * Solo habla con /api/v1/catalogo.
 * No reutiliza ProductoService ni /api/v1/productos.
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/catalogo`;

  constructor(private http: HttpClient) {}

  listarProductos(): Observable<CatalogoProducto[]> {
    return this.http
      .get<CatalogoProductoDto[]>(`${this.apiUrl}/productos`)
      .pipe(map(mapCatalogoProductos));
  }

  obtenerProducto(id: number): Observable<CatalogoProducto> {
    return this.http
      .get<CatalogoProductoDto>(`${this.apiUrl}/productos/${id}`)
      .pipe(map(mapCatalogoProducto));
  }

  listarCategorias(): Observable<CatalogoCategoria[]> {
    return this.http
      .get<CatalogoCategoriaDto[]>(`${this.apiUrl}/categorias`)
      .pipe(map(mapCatalogoCategorias));
  }
}
