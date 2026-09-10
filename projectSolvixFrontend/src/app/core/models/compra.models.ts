/**
 * Contratos de compra y devolución a proveedor. Nombres iguales a los DTO de Java.
 */

import { MetodoReembolso } from './venta.models';

export type EstadoCompra =
  | 'PENDIENTE'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'DEVUELTA'
  | 'PARCIALMENTE_DEVUELTA';

export type MotivoDevolucionCompra =
  | 'PRODUCTO_DEFECTUOSO'
  | 'PRODUCTO_INCORRECTO'
  | 'EXCESO_DE_PEDIDO'
  | 'PRODUCTO_VENCIDO'
  | 'ERROR_EN_COMPRA'
  | 'GARANTIA'
  | 'OTRO';

export type EstadoDevolucionCompra = 'REGISTRADA' | 'REEMBOLSADA';

export interface DetalleCompraRequestDTO {
  productoId: number;
  cantidad: number;
  costoUnitario: number;
}

export interface CompraRequestDTO {
  proveedorId: number;
  fecha?: string | null;
  descuento?: number | null;
  observaciones?: string | null;
  detalles: DetalleCompraRequestDTO[];
}

export interface DetalleCompraResponseDTO {
  id: number;
  productoId: number | null;
  productoNombre: string;
  categoriaCodigo: string | null;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  cantidadDevuelta: number;
}

export interface CompraResponseDTO {
  id: number;
  numero: string;
  fecha: string | number[] | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  estado: EstadoCompra;
  observaciones: string | null;
  fechaCompletada: string | number[] | null;
  fechaAnulada: string | number[] | null;
  createdBy: string | null;
  detalles: DetalleCompraResponseDTO[];
}

export interface CompraFiltros {
  proveedorId?: number;
  estado?: EstadoCompra;
  desde?: string;
  hasta?: string;
}

export interface DevolucionCompraRequestDTO {
  lineas: Array<{ detalleId: number; cantidad: number }>;
  motivo: MotivoDevolucionCompra;
  metodoReembolso?: MetodoReembolso | null;
  fecha?: string | null;
  observaciones?: string | null;
}

export interface DetalleDevolucionCompraResponseDTO {
  id: number;
  detalleCompraId: number | null;
  productoId: number | null;
  productoNombre: string | null;
  categoriaCodigo: string | null;
  cantidad: number;
  montoDevuelto: number;
  costoUnitario: number | null;
  costoConocido: boolean;
}

export interface DevolucionCompraResponseDTO {
  id: number;
  numero: string;
  fecha: string | number[] | null;
  compraId: number | null;
  compraNumero: string | null;
  compraTotalOriginal: number | null;
  compraEstado: EstadoCompra | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  motivo: MotivoDevolucionCompra;
  estado: EstadoDevolucionCompra;
  metodoReembolso: MetodoReembolso | null;
  fechaReembolso: string | number[] | null;
  montoTotalDevuelto: number;
  costoTotalDevuelto: number | null;
  costoCompletoConocido: boolean;
  observaciones: string | null;
  createdBy: string | null;
  detalles: DetalleDevolucionCompraResponseDTO[];
}
