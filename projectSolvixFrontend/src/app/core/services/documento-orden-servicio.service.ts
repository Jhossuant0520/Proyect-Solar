import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AsegurarComprobanteRecepcionResponseDTO,
  ConsultaDocumentoPublicoDTO,
  ConsultaOtPublicaDTO,
  DocumentoOrdenServicioResponseDTO
} from '../models/documento-orden-servicio.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentoOrdenServicioService {
  constructor(private http: HttpClient) {}

  private base(ordenId: number): string {
    return `${environment.apiBaseUrl}/v1/ordenes-servicio/${ordenId}/documentos`;
  }

  listar(ordenId: number): Observable<DocumentoOrdenServicioResponseDTO[]> {
    return this.http.get<DocumentoOrdenServicioResponseDTO[]>(this.base(ordenId));
  }

  obtener(ordenId: number, docId: number): Observable<DocumentoOrdenServicioResponseDTO> {
    return this.http.get<DocumentoOrdenServicioResponseDTO>(`${this.base(ordenId)}/${docId}`);
  }

  /**
   * Descarga el PDF como blob.
   * @param disposition `inline` para vista en navegador; `attachment` para descarga.
   */
  descargarPdf(
    ordenId: number,
    docId: number,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): Observable<Blob> {
    const params = new HttpParams().set('disposition', disposition);
    return this.http.get(`${this.base(ordenId)}/${docId}/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Asegura el comprobante de recepción (idempotente).
   * GENERATED | EXISTING — no duplica.
   */
  asegurarComprobanteRecepcion(
    ordenId: number
  ): Observable<AsegurarComprobanteRecepcionResponseDTO> {
    return this.http.post<AsegurarComprobanteRecepcionResponseDTO>(
      `${this.base(ordenId)}/comprobante-recepcion`,
      {}
    );
  }

  /** Alias de {@link asegurarComprobanteRecepcion} (compat). */
  generarComprobanteRecepcion(
    ordenId: number
  ): Observable<AsegurarComprobanteRecepcionResponseDTO> {
    return this.asegurarComprobanteRecepcion(ordenId);
  }

  generarCotizacionPdf(
    ordenId: number,
    cotizacionId: number
  ): Observable<DocumentoOrdenServicioResponseDTO> {
    return this.http.post<DocumentoOrdenServicioResponseDTO>(
      `${this.base(ordenId)}/cotizaciones/${cotizacionId}`,
      {}
    );
  }

  generarActaEntrega(ordenId: number): Observable<DocumentoOrdenServicioResponseDTO> {
    return this.http.post<DocumentoOrdenServicioResponseDTO>(
      `${this.base(ordenId)}/acta-entrega`,
      {}
    );
  }

  regenerar(ordenId: number, docId: number): Observable<DocumentoOrdenServicioResponseDTO> {
    return this.http.post<DocumentoOrdenServicioResponseDTO>(
      `${this.base(ordenId)}/${docId}/regenerar`,
      {}
    );
  }

  /** Consulta pública OT (sin auth). */
  consultaOtPublica(token: string): Observable<ConsultaOtPublicaDTO> {
    return this.http.get<ConsultaOtPublicaDTO>(
      `${environment.apiBaseUrl}/v1/consulta/ot/${encodeURIComponent(token)}`
    );
  }

  /** Consulta pública de documento (sin auth, sin PDF). */
  consultaDocumentoPublico(tokenDocumento: string): Observable<ConsultaDocumentoPublicoDTO> {
    return this.http.get<ConsultaDocumentoPublicoDTO>(
      `${environment.apiBaseUrl}/v1/consulta/documento/${encodeURIComponent(tokenDocumento)}`
    );
  }

  /** Abre el PDF en una pestaña nueva (object URL). */
  abrirPdfEnNuevaPestana(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Dispara descarga con nombre amigable. */
  descargarBlobComoArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo || 'documento.pdf';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
