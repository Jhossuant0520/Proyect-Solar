/**
 * Contratos de documentos PDF de orden de servicio (FASE 3.15.8).
 * Nombres alineados a los DTO de Java.
 */

export type TipoDocumentoOrdenServicio =
  | 'COMPROBANTE_RECEPCION'
  | 'COTIZACION'
  | 'ACTA_ENTREGA';

/** Resultado del POST idempotente de comprobante. */
export type OutcomeAsegurarComprobante = 'GENERATED' | 'EXISTING';

export interface DocumentoOrdenServicioResponseDTO {
  id: number;
  ordenServicioId: number;
  tipoDocumento: TipoDocumentoOrdenServicio;
  tipoDocumentoEtiqueta?: string | null;
  cotizacionId?: number | null;
  /** Opcional / futuro si el backend lo expone. */
  cotizacionNumero?: string | null;
  version: number;
  nombreArchivo: string;
  hashSha256?: string | null;
  fechaGeneracion: string | number[] | null;
  usuarioGeneracion: string | null;
  tokenDocumento?: string | null;
}

export interface AsegurarComprobanteRecepcionResponseDTO {
  status: OutcomeAsegurarComprobante;
  ready: boolean;
  documento: DocumentoOrdenServicioResponseDTO;
}

/** Consulta pública de OT por token QR (sin datos sensibles). */
export interface ConsultaOtPublicaDTO {
  numero: string;
  estadoPublico: string;
  equipoTipo: string | null;
  equipoMarca: string | null;
  equipoModelo: string | null;
  referenciaInterna: string | null;
  fechaRecepcion: string | number[] | null;
  fechaActualizacion: string | number[] | null;
  mensaje: string | null;
}

/** Consulta pública de documento por token (sin PDF). */
export interface ConsultaDocumentoPublicoDTO {
  tipoDocumento: TipoDocumentoOrdenServicio;
  tipoDocumentoEtiqueta: string | null;
  numeroOt: string;
  fechaGeneracion: string | number[] | null;
  mensaje: string | null;
}

const LABEL_TIPO_DOCUMENTO: Record<TipoDocumentoOrdenServicio, string> = {
  COMPROBANTE_RECEPCION: 'Comprobante de recepción',
  COTIZACION: 'Cotización',
  ACTA_ENTREGA: 'Acta de entrega'
};

export function labelTipoDocumento(
  tipo: TipoDocumentoOrdenServicio | string | null | undefined,
  etiquetaBackend?: string | null
): string {
  if (etiquetaBackend?.trim()) {
    return etiquetaBackend.trim();
  }
  if (!tipo) {
    return 'Documento';
  }
  return LABEL_TIPO_DOCUMENTO[tipo as TipoDocumentoOrdenServicio] ?? String(tipo);
}
