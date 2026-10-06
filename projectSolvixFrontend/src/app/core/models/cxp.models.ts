/** Contratos API /api/v1/cxp (FASE 3.15.13-B/C). */

export type EstadoCuentaPorPagar =
  | 'PENDIENTE'
  | 'PARCIALMENTE_PAGADA'
  | 'PAGADA'
  | 'ANULADA';

export type MetodoPagoCxP = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';

export interface PagoCxPResponseDTO {
  id: number;
  valor: number;
  fecha: string;
  metodoPago: MetodoPagoCxP;
  referencia?: string | null;
  observacion?: string | null;
  anuladoAt?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

export interface CuentaPorPagarResponseDTO {
  id: number;
  compraId: number;
  compraNumero: string;
  proveedorId: number;
  proveedorNombre: string;
  moneda: string;
  saldoInicial: number;
  totalDevoluciones: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaVencimiento?: string | null;
  estado: EstadoCuentaPorPagar;
  vencida: boolean;
  createdAt?: string | null;
  createdBy?: string | null;
  pagos?: PagoCxPResponseDTO[] | null;
}

export interface PagoCxPRequestDTO {
  valor: number;
  fecha?: string | null;
  metodoPago: MetodoPagoCxP;
  referencia?: string | null;
  observacion?: string | null;
}

/** Página Spring Data. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
