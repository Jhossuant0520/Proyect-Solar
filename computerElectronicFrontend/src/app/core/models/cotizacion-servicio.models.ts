/**
 * Contratos de cotización de orden de servicio (FASE 3.15.7).
 * Nombres alineados a los DTO de Java.
 */

export type TipoCotizacionServicio = 'INICIAL' | 'ADICIONAL';

export type EstadoCotizacionServicio =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ANULADA';

export type TipoDetalleCotizacionServicio = 'REPUESTO' | 'MANO_OBRA' | 'OTRO';

export interface DetalleCotizacionServicioResponseDTO {
  id: number;
  tipo: TipoDetalleCotizacionServicio;
  descripcion: string | null;
  cantidad: number;
  precioUnitario: number | null;
  subtotal: number | null;
  productoId: number | null;
  productoNombreSnapshot: string | null;
  ordenServicioRepuestoId: number | null;
}

export interface CotizacionServicioResponseDTO {
  id: number;
  ordenServicioId: number;
  numero: string;
  tipo: TipoCotizacionServicio;
  estado: EstadoCotizacionServicio;
  fechaCreacion: string | number[] | null;
  fechaPresentacion: string | number[] | null;
  fechaAprobacion: string | number[] | null;
  fechaRechazo: string | number[] | null;
  usuarioCreacion: string | null;
  usuarioPresentacion: string | null;
  usuarioAprobacion: string | null;
  usuarioRechazo: string | null;
  subtotal: number;
  total: number;
  subtotalRepuestos: number;
  subtotalManoObra: number;
  subtotalOtros: number;
  observaciones: string | null;
  motivoAmpliacion: string | null;
  detalles: DetalleCotizacionServicioResponseDTO[];
  puedeEditar: boolean;
  puedePresentar: boolean;
  puedeAprobar: boolean;
  puedeRechazar: boolean;
}

export interface DetalleCotizacionServicioRequestDTO {
  tipo: TipoDetalleCotizacionServicio;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario?: number | null;
  productoId?: number | null;
  ordenServicioRepuestoId?: number | null;
}

export interface CotizacionServicioRequestDTO {
  observaciones?: string | null;
  motivoAmpliacion?: string | null;
  detalles: DetalleCotizacionServicioRequestDTO[];
}

export interface RechazarCotizacionRequestDTO {
  observacion?: string | null;
}

export interface ResumenEconomicoOrdenServicioDTO {
  ordenServicioId: number;
  totalAutorizado: number;
  subtotalRepuestosAprobados: number;
  subtotalManoObraAprobados: number;
  subtotalOtrosAprobados: number;
}
