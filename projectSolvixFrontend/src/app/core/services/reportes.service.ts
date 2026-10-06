import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompraAnalyticsDTO } from '../models/analytics.models';
import {
  Agrupacion,
  CriterioRanking,
  ReporteInventarioResumenDTO,
  ReporteVentasResumenDTO
} from '../models/reportes.models';
import { toQueryDesde, toQueryHasta } from '../../features/panelAdmin/dashboard/utils/dashboard-period';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/reportes`;

  constructor(private http: HttpClient) {}

  ventasResumen(
    desde: string,
    hasta: string,
    agrupacion: Agrupacion = 'MES'
  ): Observable<ReporteVentasResumenDTO> {
    return this.http.get<ReporteVentasResumenDTO>(`${this.baseUrl}/ventas/resumen`, {
      params: this.periodoParams(desde, hasta).set('agrupacion', agrupacion)
    });
  }

  /** Descarga CSV con JWT vía HttpClient blob (no window.open a la API). */
  ventasExportar(desde: string, hasta: string, agrupacion: Agrupacion = 'MES'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ventas/exportar`, {
      params: this.periodoParams(desde, hasta).set('agrupacion', agrupacion),
      responseType: 'blob'
    });
  }

  comprasResumen(
    desde: string,
    hasta: string,
    agrupacion: Agrupacion = 'MES',
    proveedorId?: number | null
  ): Observable<CompraAnalyticsDTO> {
    let params = this.periodoParams(desde, hasta).set('agrupacion', agrupacion);
    if (proveedorId != null) {
      params = params.set('proveedorId', String(proveedorId));
    }
    return this.http.get<CompraAnalyticsDTO>(`${this.baseUrl}/compras/resumen`, { params });
  }

  comprasExportar(
    desde: string,
    hasta: string,
    agrupacion: Agrupacion = 'MES',
    proveedorId?: number | null
  ): Observable<Blob> {
    let params = this.periodoParams(desde, hasta).set('agrupacion', agrupacion);
    if (proveedorId != null) {
      params = params.set('proveedorId', String(proveedorId));
    }
    return this.http.get(`${this.baseUrl}/compras/exportar`, {
      params,
      responseType: 'blob'
    });
  }

  inventarioResumen(
    desde: string,
    hasta: string,
    opciones: {
      umbralStockCritico?: number | null;
      criterio?: CriterioRanking;
      incluirAbc?: boolean;
    } = {}
  ): Observable<ReporteInventarioResumenDTO> {
    let params = this.periodoParams(desde, hasta).set(
      'incluirAbc',
      String(opciones.incluirAbc !== false)
    );
    if (opciones.criterio) {
      params = params.set('criterio', opciones.criterio);
    }
    if (opciones.umbralStockCritico != null) {
      params = params.set('umbralStockCritico', String(opciones.umbralStockCritico));
    }
    return this.http.get<ReporteInventarioResumenDTO>(`${this.baseUrl}/inventario/resumen`, {
      params
    });
  }

  inventarioExportar(
    desde: string,
    hasta: string,
    opciones: {
      umbralStockCritico?: number | null;
      criterio?: CriterioRanking;
      incluirAbc?: boolean;
    } = {}
  ): Observable<Blob> {
    let params = this.periodoParams(desde, hasta).set(
      'incluirAbc',
      String(opciones.incluirAbc !== false)
    );
    if (opciones.criterio) {
      params = params.set('criterio', opciones.criterio);
    }
    if (opciones.umbralStockCritico != null) {
      params = params.set('umbralStockCritico', String(opciones.umbralStockCritico));
    }
    return this.http.get(`${this.baseUrl}/inventario/exportar`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Fuerza descarga del blob en el navegador.
   * El token JWT ya viajó en la petición HttpClient gracias al interceptor.
   */
  descargarBlobComoArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private periodoParams(desde: string, hasta: string): HttpParams {
    return new HttpParams()
      .set('desde', toQueryDesde(desde))
      .set('hasta', toQueryHasta(hasta));
  }
}
