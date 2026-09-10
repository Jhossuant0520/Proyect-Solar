/**
 * Contratos de inventario comercial. Nombres iguales a los DTO de Java.
 * El ajuste de costo no mueve stock.
 */

export type MotivoAjusteCosto =
  | 'CORRECCION_ERROR'
  | 'ACTUALIZACION_PROVEEDOR'
  | 'CARGA_DE_COSTO_INICIAL'
  | 'REVALUACION'
  | 'OTRO';

export type DireccionMovimiento = 'ENTRADA' | 'SALIDA';

export type TipoMovimientoInventario =
  | 'COMPRA'
  | 'VENTA'
  | 'DEVOLUCION_VENTA'
  | 'DEVOLUCION_COMPRA'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA'
  | 'MERMA'
  | 'CARGA_INICIAL';

export interface AjusteCostoRequestDTO {
  productoId: number;
  costoNuevo: number;
  motivo: MotivoAjusteCosto;
  observaciones?: string | null;
}

export interface AjusteCostoResponseDTO {
  id: number;
  productoId: number;
  productoNombre: string;
  costoAnterior: number | null;
  costoNuevo: number;
  costoProductoResultante: number | null;
  stockAlAjustar: number;
  motivo: MotivoAjusteCosto;
  observaciones: string | null;
  usuarioRegistro: string | null;
  fecha: string | number[] | null;
}

export interface MovimientoInventarioResponseDTO {
  id: number;
  productoId: number;
  productoNombre: string;
  tipo: TipoMovimientoInventario | string;
  direccion: DireccionMovimiento | string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  costoUnitario: number | null;
  costoProductoResultante: number | null;
  fecha: string | number[] | null;
  referenciaTipo: string | null;
  referenciaId: number | null;
  usuarioRegistro: string | null;
  observaciones: string | null;
}
