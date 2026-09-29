/**
 * Cotización comercial independiente (no ligada a OT).
 * Nombres iguales a los DTO Java de /api/v1/cotizaciones-comerciales.
 */

export type EstadoCotizacionComercial =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ANULADA';

export type TipoLineaCotizacionComercial = 'PRODUCTO' | 'MANO_OBRA' | 'OTRO';

export const ESTADO_COTIZACION_COMERCIAL_LABEL: Record<EstadoCotizacionComercial, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada'
};

export const TIPO_LINEA_COTIZACION_LABEL: Record<TipoLineaCotizacionComercial, string> = {
  PRODUCTO: 'Producto',
  MANO_OBRA: 'Mano de obra',
  OTRO: 'Otro'
};

export interface DetalleCotizacionComercialRequestDTO {
  tipo: TipoLineaCotizacionComercial;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario?: number | null;
  productoId?: number | null;
}

export interface CotizacionComercialRequestDTO {
  clienteId?: number | null;
  observaciones?: string | null;
  detalles: DetalleCotizacionComercialRequestDTO[];
}

export interface DetalleCotizacionComercialResponseDTO {
  id: number;
  tipo: TipoLineaCotizacionComercial;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productoId: number | null;
  productoNombreSnapshot: string | null;
  productoActivo: boolean | null;
}

export interface DocumentoCotizacionComercialResponseDTO {
  id: number;
  cotizacionId: number;
  version: number;
  nombreArchivo: string;
  hashSha256: string;
  fechaGeneracion: string;
  usuarioGeneracion: string | null;
}

export interface CotizacionComercialResponseDTO {
  id: number;
  numero: string;
  clienteId: number | null;
  clienteNombre: string;
  clienteDocumento: string | null;
  clienteConsumidorFinal: boolean;
  estado: EstadoCotizacionComercial;
  fecha: string;
  fechaPresentacion: string | null;
  fechaAprobacion: string | null;
  fechaRechazo: string | null;
  fechaAnulacion: string | null;
  usuarioCreacion: string | null;
  subtotal: number;
  total: number;
  subtotalProductos: number;
  subtotalManoObra: number;
  subtotalOtros: number;
  observaciones: string | null;
  motivoRechazo: string | null;
  detalles: DetalleCotizacionComercialResponseDTO[];
  documentoVigente: DocumentoCotizacionComercialResponseDTO | null;
  /** En Presentar: true solo si el PDF de esa operación se generó. */
  documentoGenerado: boolean;
  puedeEditar: boolean;
  puedePresentar: boolean;
  puedeAprobar: boolean;
  puedeRechazar: boolean;
  puedeAnular: boolean;
}

export interface CotizacionComercialResumenDTO {
  id: number;
  numero: string;
  clienteNombre: string;
  estado: EstadoCotizacionComercial;
  fecha: string;
  total: number;
}

export interface PaginaResponseDTO<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface FiltrosCotizacionComercial {
  q?: string | null;
  estado?: EstadoCotizacionComercial | null;
  clienteId?: number | null;
  pagina?: number;
  tamano?: number;
}

export interface ConsultaCotizacionPublicaDTO {
  numero: string;
  estadoPublico: string;
  fecha: string;
  total: number;
  lineas: { descripcion: string; cantidad: number; subtotal: number }[];
  mensaje: string | null;
}
