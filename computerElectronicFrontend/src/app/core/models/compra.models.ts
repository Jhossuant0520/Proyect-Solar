/**
 * Contratos de compra y devolución a proveedor. Nombres iguales a los DTO de Java.
 * FASE 3.15.11-B: compras enriquecidas (documento externo, fechas, condiciones, IVA mínimo).
 */

import { CondicionPagoProveedor } from './proveedor.models';
import { MetodoReembolso } from './venta.models';

export type EstadoCompra =
  | 'PENDIENTE'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'DEVUELTA'
  | 'PARCIALMENTE_DEVUELTA';

export type TipoDocumentoExternoCompra = 'PEDIDO' | 'FACTURA' | 'OTRO';

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
  referenciaProveedor?: string | null;
  /** Tasa seleccionada (UI default 19). El valor monetario lo calcula el backend. */
  porcentajeImpuesto?: number | null;
}

export interface CompraRequestDTO {
  proveedorId: number;
  fecha?: string | null;
  tipoDocumentoExterno?: TipoDocumentoExternoCompra | null;
  numeroDocumentoExterno?: string | null;
  numeroOrdenCompra?: string | null;
  numeroCotizacionProveedor?: string | null;
  fechaDocumentoProveedor?: string | null;
  fechaEntrega?: string | null;
  fechaVencimiento?: string | null;
  condicionPagoAplicada?: CondicionPagoProveedor | null;
  diasCreditoAplicados?: number | null;
  contactoProveedorId?: number | null;
  contactoNombreSnapshot?: string | null;
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
  referenciaProveedor?: string | null;
  porcentajeImpuesto?: number | null;
  valorImpuesto?: number | null;
  cantidadDevuelta: number;
}

export interface CompraResponseDTO {
  id: number;
  numero: string;
  fecha: string | number[] | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  proveedorDocumento?: string | null;
  tipoDocumentoExterno?: TipoDocumentoExternoCompra | null;
  numeroDocumentoExterno?: string | null;
  numeroOrdenCompra?: string | null;
  numeroCotizacionProveedor?: string | null;
  fechaDocumentoProveedor?: string | number[] | null;
  fechaEntrega?: string | number[] | null;
  fechaVencimiento?: string | number[] | null;
  condicionPagoAplicada?: CondicionPagoProveedor | null;
  diasCreditoAplicados?: number | null;
  moneda?: string | null;
  contactoProveedorId?: number | null;
  contactoNombreSnapshot?: string | null;
  subtotal: number;
  descuento: number;
  impuestoTotal?: number | null;
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
