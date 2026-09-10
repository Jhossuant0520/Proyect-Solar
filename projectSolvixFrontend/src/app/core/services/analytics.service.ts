import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Agrupacion,
  AnalisisABCDTO,
  CategoriaAnalyticsDTO,
  CompraAnalyticsDTO,
  CriterioRanking,
  DashboardResumenDTO,
  InventarioKpiDTO,
  ProductoBajoRendimientoDTO,
  ProductoRankingDTO,
  SerieTemporalDTO
} from '../models/analytics.models';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly dashboardUrl = 'http://localhost:8080/api/v1/dashboard';
  private readonly analyticsUrl = 'http://localhost:8080/api/v1/analytics';

  constructor(private http: HttpClient) {}

  resumen(desde: string, hasta: string): Observable<DashboardResumenDTO> {
    return this.http.get<DashboardResumenDTO>(`${this.dashboardUrl}/resumen`, {
      params: this.periodoParams(desde, hasta)
    });
  }

  ventas(desde: string, hasta: string, agrupacion: Agrupacion): Observable<SerieTemporalDTO> {
    return this.http.get<SerieTemporalDTO>(`${this.analyticsUrl}/ventas`, {
      params: this.periodoParams(desde, hasta).set('agrupacion', agrupacion)
    });
  }

  topProductos(
    desde: string,
    hasta: string,
    criterio: CriterioRanking,
    limite = 10
  ): Observable<ProductoRankingDTO[]> {
    return this.http.get<ProductoRankingDTO[]>(`${this.analyticsUrl}/productos/top`, {
      params: this.periodoParams(desde, hasta)
        .set('criterio', criterio)
        .set('limite', String(limite))
    });
  }

  bajoRendimiento(
    desde: string,
    hasta: string,
    limite = 10
  ): Observable<ProductoBajoRendimientoDTO[]> {
    return this.http.get<ProductoBajoRendimientoDTO[]>(
      `${this.analyticsUrl}/productos/bajo-rendimiento`,
      { params: this.periodoParams(desde, hasta).set('limite', String(limite)) }
    );
  }

  categorias(desde: string, hasta: string): Observable<CategoriaAnalyticsDTO[]> {
    return this.http.get<CategoriaAnalyticsDTO[]>(`${this.analyticsUrl}/categorias`, {
      params: this.periodoParams(desde, hasta)
    });
  }

  inventario(desde: string, hasta: string): Observable<InventarioKpiDTO> {
    return this.http.get<InventarioKpiDTO>(`${this.analyticsUrl}/inventario`, {
      params: this.periodoParams(desde, hasta)
    });
  }

  abc(desde: string, hasta: string, criterio: CriterioRanking = 'INGRESOS'): Observable<AnalisisABCDTO> {
    return this.http.get<AnalisisABCDTO>(`${this.analyticsUrl}/inventario/abc`, {
      params: this.periodoParams(desde, hasta).set('criterio', criterio)
    });
  }

  compras(
    desde: string,
    hasta: string,
    agrupacion: Agrupacion = 'MES',
    proveedorId?: number
  ): Observable<CompraAnalyticsDTO> {
    let params = this.periodoParams(desde, hasta).set('agrupacion', agrupacion);
    if (proveedorId != null) {
      params = params.set('proveedorId', String(proveedorId));
    }
    return this.http.get<CompraAnalyticsDTO>(`${this.analyticsUrl}/compras`, { params });
  }

  private periodoParams(desde: string, hasta: string): HttpParams {
    return new HttpParams().set('desde', desde).set('hasta', hasta);
  }
}
