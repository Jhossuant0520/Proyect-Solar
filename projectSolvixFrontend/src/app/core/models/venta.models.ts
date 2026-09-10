/**
 * Contratos de venta y devolución. Nombres iguales a los DTO de Java.
 * No añadir propiedades que el backend no envíe.
 */

export type EstadoVenta =
  | 'PENDIENTE'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'DEVUELTA'
  | 'PARCIALMENTE_DEVUELTA';

export type MetodoPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'TARJETA'
  | 'CREDITO'
  | 'OTRO';

export type MotivoDevolucion =
  | 'PRODUCTO_DEFECTUOSO'
  | 'PRODUCTO_INCORRECTO'
  | 'INSATISFACCION_CLIENTE'
  | 'ERROR_EN_VENTA'
  | 'GARANTIA'
  | 'OTRO';

export type MetodoReembolso =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'TARJETA'
  | 'NOTA_CREDITO'
  | 'CAMBIO_PRODUCTO';

export type EstadoDevolucionVenta = 'REGISTRADA' | 'REEMBOLSADA';

export interface DetalleVentaRequestDTO {
  productoId: number;
  cantidad: number;
  precioUnitario?: number | null;
  descuentoLinea?: number | null;
}

export interface VentaRequestDTO {
  clienteId?: number | null;
  fecha?: string | null;
  metodoPago?: MetodoPago | null;
  descuento?: number | null;
  observaciones?: string | null;
  detalles: DetalleVentaRequestDTO[];
}

export interface DetalleVentaResponseDTO {
  id: number;
  productoId: number | null;
  productoNombre: string;
  categoriaCodigo: string | null;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number | null;
  costoConocido: boolean;
  descuentoLinea: number;
  subtotal: number;
  cantidadDevuelta: number;
}

export interface VentaResponseDTO {
  id: number;
  numero: string;
  fecha: string | number[] | null;
  clienteId: number | null;
  clienteNombre: string | null;
  clienteConsumidorFinal: boolean;
  subtotal: number;
  descuento: number;
  total: number;
  estado: EstadoVenta;
  metodoPago: MetodoPago;
  observaciones: string | null;
  fechaCompletada: string | number[] | null;
  fechaAnulada: string | number[] | null;
  createdBy: string | null;
  detalles: DetalleVentaResponseDTO[];
}

export interface VentaFiltros {
  clienteId?: number;
  estado?: EstadoVenta;
  desde?: string;
  hasta?: string;
}

export interface DevolucionLineaDTO {
  detalleId: number;
  cantidad: number;
}

export interface DevolucionVentaRequestDTO {
  lineas: DevolucionLineaDTO[];
  motivo: MotivoDevolucion;
  metodoReembolso?: MetodoReembolso | null;
  fecha?: string | null;
  observaciones?: string | null;
}

export interface DetalleDevolucionVentaResponseDTO {
  id: number;
  detalleVentaId: number | null;
  productoId: number | null;
  productoNombre: string | null;
  categoriaCodigo: string | null;
  cantidad: number;
  montoDevuelto: number;
  costoUnitario: number | null;
  costoConocido: boolean;
}

export interface DevolucionVentaResponseDTO {
  id: number;
  numero: string;
  fecha: string | number[] | null;
  ventaId: number | null;
  ventaNumero: string | null;
  ventaTotalOriginal: number | null;
  ventaEstado: EstadoVenta | null;
  clienteId: number | null;
  clienteNombre: string | null;
  motivo: MotivoDevolucion;
  estado: EstadoDevolucionVenta;
  metodoReembolso: MetodoReembolso | null;
  fechaReembolso: string | number[] | null;
  montoTotalDevuelto: number;
  costoTotalDevuelto: number | null;
  costoCompletoConocido: boolean;
  observaciones: string | null;
  createdBy: string | null;
  detalles: DetalleDevolucionVentaResponseDTO[];
}

export interface ReembolsoRequestDTO {
  metodoReembolso: MetodoReembolso;
}
